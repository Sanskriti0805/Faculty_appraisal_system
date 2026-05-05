const db = require('../config/database');
const { getSessionWriteAccess } = require('../utils/sessionAccess');

let editRequestsTableEnsured = false;
let sessionFinalLockColumnsEnsured = false;

async function ensureColumnExists(tableName, columnName, definitionSql) {
  const [rows] = await db.query(
    `SELECT 1
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [tableName, columnName]
  );

  if (rows.length === 0) {
    await db.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definitionSql}`);
  }
}

async function ensureEditRequestsTable() {
  if (editRequestsTableEnsured) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS edit_requests (
      id INT NOT NULL AUTO_INCREMENT,
      submission_id INT NOT NULL,
      faculty_id INT NOT NULL,
      requested_sections JSON NOT NULL,
      request_message TEXT DEFAULT NULL,
      status ENUM('pending','approved','denied') DEFAULT 'pending',
      approved_sections JSON DEFAULT NULL,
      reviewed_by INT DEFAULT NULL,
      reviewed_at TIMESTAMP NULL DEFAULT NULL,
      Dofa_note TEXT DEFAULT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY submission_id (submission_id),
      KEY faculty_id (faculty_id),
      KEY reviewed_by (reviewed_by),
      CONSTRAINT edit_requests_ibfk_1 FOREIGN KEY (submission_id) REFERENCES submissions (id) ON DELETE CASCADE,
      CONSTRAINT edit_requests_ibfk_2 FOREIGN KEY (faculty_id) REFERENCES users (id) ON DELETE CASCADE,
      CONSTRAINT edit_requests_ibfk_3 FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  editRequestsTableEnsured = true;
}

async function ensureSessionFinalLockColumns() {
  if (sessionFinalLockColumnsEnsured) return;
  await ensureColumnExists('appraisal_sessions', 'final_locked', 'TINYINT(1) NOT NULL DEFAULT 0');
  await ensureColumnExists('appraisal_sessions', 'final_locked_at', 'TIMESTAMP NULL DEFAULT NULL');
  await ensureColumnExists('appraisal_sessions', 'final_locked_by', 'INT NULL DEFAULT NULL');
  sessionFinalLockColumnsEnsured = true;
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
  await ensureEditRequestsTable();
  await ensureSessionFinalLockColumns();

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

function requireDynamicResponseEditAccess() {
  return async (req, res, next) => {
    try {
      await ensureEditRequestsTable();
      await ensureSessionFinalLockColumns();

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
      return res.status(500).json({ success: false, message: 'Dynamic section permission check failed' });
    }
  };
}

module.exports = {
  requireSectionEditAccess,
  requireSectionEditAccessFromParam,
  requireDynamicResponseEditAccess
};
