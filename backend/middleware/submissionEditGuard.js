const db = require('../config/database');
const { getSessionWriteAccess } = require('../utils/sessionAccess');

// Schema creation belongs to deployment/startup migrations, not faculty saves.
// Explicitly check final_locked: SELECT * would silently omit a missing column
// and getSessionState would otherwise interpret it as an unlocked session.
async function verifySessionLockSchema() {
  await db.query('SELECT final_locked FROM appraisal_sessions LIMIT 0');
}

function permissionCheckError(error) {
  const schemaMissing = ['ER_BAD_FIELD_ERROR', 'ER_NO_SUCH_TABLE'].includes(error.code);
  return {
    success: false,
    code: schemaMissing ? 'EDIT_PERMISSION_SCHEMA_MISSING' : 'EDIT_PERMISSION_CHECK_FAILED',
    message: schemaMissing
      ? 'The server database is missing required appraisal fields or tables. Please contact the webmaster.'
      : 'Unable to verify edit permissions. Please retry; if this continues, contact the webmaster.'
  };
}

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

const SECTION_GROUP_EXPANSIONS = {
  teaching_learning: [
    'faculty_info',
    'courses_taught',
    'new_courses',
    'courseware',
    'teaching_innovation'
  ],
  research_development: [
    'research_publications',
    'research_grants',
    'patents',
    'technology_transfer',
    'paper_review',
    'conference_sessions',
    'keynotes_talks',
    'consultancy',
    'part_b',
    'research_plan'
  ],
  other_institutional_activities: [
    'awards_honours',
    'continuing_education',
    'institutional_contributions',
    'other_activities',
    'teaching_plan'
  ]
};

const expandApprovedSectionKeys = (approvedSections = []) => {
  const expanded = new Set();
  (approvedSections || []).forEach((key) => {
    expanded.add(key);
    const groupMembers = SECTION_GROUP_EXPANSIONS[key];
    if (Array.isArray(groupMembers)) {
      groupMembers.forEach((member) => expanded.add(member));
    }
  });
  return expanded;
};

async function checkSectionEditAccess(req, sectionKey) {
  if (!req.user) {
    return {
      allowed: false,
      status: 401,
      body: { success: false, message: 'Not authenticated' }
    };
  }

  // Restriction applies to faculty only.
  if (req.user.role !== 'faculty') {
    return { allowed: true };
  }

  await verifySessionLockSchema();

  const facultyId = req.user.id;

  // Keep body faculty_id aligned with token to avoid impersonation in write APIs.
  if (req.body && typeof req.body === 'object') {
    req.body.faculty_id = facultyId;
  }

  const writeAccess = await getSessionWriteAccess(db);
  if (!writeAccess.canWrite) {
    return {
      allowed: false,
      status: writeAccess.httpStatus || 403,
      body: {
        success: false,
        code: writeAccess.code,
        message: writeAccess.message
      }
    };
  }

  const academicYear = writeAccess.session.academic_year;

  // Prefer the real Form A record over any accidental late draft for the same year.
  const [rows] = await db.query(
    `SELECT id, status, academic_year, COALESCE(locked, 0) as locked
     FROM submissions
     WHERE faculty_id = ? AND academic_year = ? AND UPPER(COALESCE(form_type, 'A')) = 'A'
     ORDER BY
       CASE WHEN status = 'draft' THEN 1 ELSE 0 END,
       COALESCE(submitted_at, updated_at, created_at) DESC,
       id DESC
     LIMIT 1`,
    [facultyId, academicYear]
  );

  // No submission yet means user is filling the initial form, but only while
  // the session is writable.
  if (rows.length === 0) {
    return { allowed: true };
  }

  const submission = rows[0];
  const status = submission.status;

  if (Number(submission.locked || 0) === 1) {
    return {
      allowed: false,
      status: 403,
      body: {
        success: false,
        code: 'SUBMISSION_LOCKED',
        message: 'This submission is locked by DoFA for the current session.'
      }
    };
  }

  if (status === 'draft') {
    return { allowed: true };
  }

  if (status !== 'sent_back') {
    return {
      allowed: false,
      status: 403,
      body: {
        success: false,
        code: 'SUBMISSION_LOCKED',
        message: 'Submission is locked after submit. Request edits or wait for Dofa to send back.'
      }
    };
  }

  // Part B remains the faculty's editable goal-setting/resubmission page even when
  // other sections are locked down by an approved edit request.
  if (sectionKey === 'part_b') {
    return { allowed: true };
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
    // Sent back directly by Dofa without section-specific request: full edit allowed.
    return { allowed: true };
  }

  const approvedSections = safeJsonParse(approvedReqRows[0].approved_sections) || [];
  if (!Array.isArray(approvedSections) || approvedSections.length === 0) {
    return { allowed: true };
  }

  const expandedApproved = expandApprovedSectionKeys(approvedSections);

  if (expandedApproved.has(sectionKey)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    status: 403,
    body: {
      success: false,
      code: 'SECTION_LOCKED',
      message: `This section is locked. Approved sections: ${approvedSections.join(', ')}`
    }
  };
}

// Enforces that faculty cannot edit after submission unless allowed.
// Rules:
// - writes are allowed only while the session is open, released, unlocked, and before deadline
// - draft: editable
// - submitted/under_review/approved: locked
// - sent_back: editable
//   - if latest approved edit request exists with approved_sections, only those sections are editable
function requireSectionEditAccess(sectionKey) {
  return async (req, res, next) => {
    try {
      const result = await checkSectionEditAccess(req, sectionKey);
      if (result.allowed) return next();
      return res.status(result.status || 403).json(result.body);
    } catch (error) {
      console.error('requireSectionEditAccess error:', error);
      return res.status(500).json(permissionCheckError(error));
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

function requireDynamicResponseEditAccess() {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Not authenticated' });
      }

      if (req.user.role !== 'faculty') {
        return next();
      }

      const sectionIds = new Set();
      const directSectionId = Number(req.body?.section_id);
      if (Number.isFinite(directSectionId) && directSectionId > 0) {
        sectionIds.add(directSectionId);
      }

      const fieldIds = Array.from(new Set(
        (Array.isArray(req.body?.responses) ? req.body.responses : [])
          .map((item) => Number(item?.field_id))
          .filter((id) => Number.isFinite(id) && id > 0)
      ));

      if (fieldIds.length > 0) {
        const placeholders = fieldIds.map(() => '?').join(',');
        const [fields] = await db.query(
          `SELECT DISTINCT section_id
           FROM dynamic_fields
           WHERE id IN (${placeholders})`,
          fieldIds
        );
        fields.forEach((field) => {
          const sectionId = Number(field.section_id);
          if (Number.isFinite(sectionId) && sectionId > 0) {
            sectionIds.add(sectionId);
          }
        });
      }

      if (sectionIds.size === 0) {
        return res.status(400).json({
          success: false,
          message: 'Unable to determine the dynamic section being saved.'
        });
      }

      for (const sectionId of sectionIds) {
        const result = await checkSectionEditAccess(req, `dynamic_section_${sectionId}`);
        if (!result.allowed) {
          return res.status(result.status || 403).json(result.body);
        }
      }

      return next();
    } catch (error) {
      console.error('requireDynamicResponseEditAccess error:', error);
      return res.status(500).json(permissionCheckError(error));
    }
  };
}

module.exports = {
  requireSectionEditAccess,
  requireSectionEditAccessFromParam,
  requireDynamicResponseEditAccess
};
