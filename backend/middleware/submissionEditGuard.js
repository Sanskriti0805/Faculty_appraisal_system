const db = require('../config/database');

function safeJsonParse(value) {
  if (!value) return null;
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function getTargetAcademicYear() {
  const [sessionRows] = await db.query(
    `SELECT academic_year
     FROM appraisal_sessions
     WHERE status = 'open'
     ORDER BY is_released DESC, created_at DESC, id DESC
     LIMIT 1`
  );

  if (sessionRows.length > 0 && sessionRows[0].academic_year) {
    return { academicYear: sessionRows[0].academic_year, fromSession: true };
  }

  return { academicYear: getCurrentAcademicYear(), fromSession: false };
}

function getCurrentAcademicYear() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  if (month >= 7) {
    return `${year}-${String(year + 1).slice(-2)}`;
  }
  return `${year - 1}-${String(year).slice(-2)}`;
}

// Enforces that faculty cannot edit after submission unless allowed.
// Rules:
// - draft: editable
// - submitted/under_review/approved: locked
// - sent_back: editable
//   - if latest approved edit request exists with approved_sections, only those sections are editable
function requireSectionEditAccess(sectionKey) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      // Restriction applies to faculty only.
      if (req.user.role !== 'faculty') {
        return next();
      }

      const facultyId = req.user.id;

      // Keep body faculty_id aligned with token to avoid impersonation in write APIs.
      if (req.body && typeof req.body === 'object') {
        req.body.faculty_id = facultyId;
      }

      const { academicYear, fromSession } = await getTargetAcademicYear();

      // Prefer current academic year; fallback to latest submission if none in current year.
      let [rows] = await db.query(
        `SELECT id, status, academic_year
         FROM submissions
         WHERE faculty_id = ? AND academic_year = ?
         ORDER BY id DESC
         LIMIT 1`,
        [facultyId, academicYear]
      );

      if (!fromSession && rows.length === 0) {
        [rows] = await db.query(
          `SELECT id, status, academic_year
           FROM submissions
           WHERE faculty_id = ?
           ORDER BY id DESC
           LIMIT 1`,
          [facultyId]
        );
      }

      // No submission yet means user is filling initial form.
      if (rows.length === 0) {
        return next();
      }

      const submission = rows[0];
      const status = submission.status;

      if (status === 'draft') {
        return next();
      }

      if (status !== 'sent_back') {
        return res.status(403).json({
          success: false,
          code: 'SUBMISSION_LOCKED',
          message: 'Submission is locked after submit. Request edits or wait for DOFA to send back.'
        });
      }

      // sent_back: check section-level restriction if there is an approved edit request.
      const [approvedReqRows] = await db.query(
        `SELECT approved_sections
         FROM edit_requests
         WHERE submission_id = ? AND faculty_id = ? AND status = 'approved'
         ORDER BY reviewed_at DESC, id DESC
         LIMIT 1`,
        [submission.id, facultyId]
      );

      if (approvedReqRows.length === 0) {
        // Sent back directly by DOFA without section-specific request: full edit allowed.
        return next();
      }

      const approvedSections = safeJsonParse(approvedReqRows[0].approved_sections) || [];
      if (!Array.isArray(approvedSections) || approvedSections.length === 0) {
        return next();
      }

      if (approvedSections.includes(sectionKey)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        code: 'SECTION_LOCKED',
        message: `This section is locked. Approved sections: ${approvedSections.join(', ')}`
      });
    } catch (error) {
      console.error('requireSectionEditAccess error:', error);
      return res.status(500).json({ success: false, message: 'Edit permission check failed' });
    }
  };
}

const SECTION_KEY_ALIASES = {
  conferences_outside: 'conference_sessions',
  other_important_activities: 'other_activities',
};

function requireSectionEditAccessFromParam(paramName = 'sectionKey') {
  return (req, res, next) => {
    const rawSectionKey = req.params?.[paramName];
    if (!rawSectionKey) {
      return res.status(400).json({ success: false, message: 'Missing section key.' });
    }

    const canonicalSectionKey = SECTION_KEY_ALIASES[rawSectionKey] || rawSectionKey;
    return requireSectionEditAccess(canonicalSectionKey)(req, res, next);
  };
}

module.exports = { requireSectionEditAccess, requireSectionEditAccessFromParam };