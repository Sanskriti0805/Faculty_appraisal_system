const db = require('../config/database');
const { autoAllocateMarks } = require('../services/rubricMapper');
const emailService = require('../services/emailService');
const xlsx = require('xlsx');
const { resolveFacultyInfoId } = require('../utils/facultyResolver');

async function getTargetAcademicYear() {
  const [sessionRows] = await db.query(
    `SELECT academic_year
     FROM appraisal_sessions
     WHERE status = 'open'
     ORDER BY is_released DESC, created_at DESC, id DESC
     LIMIT 1`
  );

  if (sessionRows.length > 0 && sessionRows[0].academic_year) {
    return sessionRows[0].academic_year;
  }

  return getCurrentAcademicYear();
}

// GET /api/submissions/my - get or create draft submission for logged-in faculty
exports.getMySubmission = async (req, res) => {
  try {
    const facultyId = req.user.id;
    const academicYear = await getTargetAcademicYear();

    // Find existing submission for this faculty + year
    const [rows] = await db.query(
      'SELECT * FROM submissions WHERE faculty_id = ? AND academic_year = ? ORDER BY created_at DESC LIMIT 1',
      [facultyId, academicYear]
    );

    if (rows.length > 0) {
      return res.json({ success: true, data: rows[0] });
    }

    // Create new draft submission
    const [result] = await db.query(
      'INSERT INTO submissions (faculty_id, academic_year, form_type, status) VALUES (?, ?, ?, ?)',
      [facultyId, academicYear, 'A', 'draft']
    );

    const [newRow] = await db.query('SELECT * FROM submissions WHERE id = ?', [result.insertId]);
    res.json({ success: true, data: newRow[0] });
  } catch (error) {
    console.error('getMySubmission error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Helper: returns current academic year string, e.g. "2024-25"
function getCurrentAcademicYear() {
  const now = new Date();
  const month = now.getMonth() + 1; // 1-12
  const year = now.getFullYear();
  // Academic year starts in July: before July -> previous-current, from July -> current-next
  if (month >= 7) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

const normalizeFormType = (value) => String(value || 'A').trim().toUpperCase();

const resolveHodDepartmentContext = async (user = {}) => {
  const userDeptId = Number(user.department_id || 0);
  const userDeptName = String(user.department || '').trim();

  if (userDeptId > 0) {
    const [rows] = await db.query('SELECT id, name FROM departments WHERE id = ? LIMIT 1', [userDeptId]);
    if (rows.length > 0) {
      return {
        id: Number(rows[0].id),
        name: String(rows[0].name || '').trim(),
        nameNorm: String(rows[0].name || '').trim().toLowerCase()
      };
    }
  }

  if (!userDeptName) return null;
  const [rowsByName] = await db.query('SELECT id, name FROM departments WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1', [userDeptName]);
  if (rowsByName.length > 0) {
    return {
      id: Number(rowsByName[0].id),
      name: String(rowsByName[0].name || userDeptName).trim(),
      nameNorm: String(rowsByName[0].name || userDeptName).trim().toLowerCase()
    };
  }

  return {
    id: 0,
    name: userDeptName,
    nameNorm: userDeptName.toLowerCase()
  };
};

const isSubmissionInHodDepartment = (submission = {}, hodDept = null) => {
  if (!hodDept) return false;
  const facultyDeptId = Number(submission.faculty_department_id || 0);
  const facultyDeptNameNorm = String(submission.faculty_department || '').trim().toLowerCase();
  const sameDeptById = hodDept.id > 0 && facultyDeptId > 0 && facultyDeptId === hodDept.id;
  const sameDeptByName = facultyDeptNameNorm && facultyDeptNameNorm === hodDept.nameNorm;
  return sameDeptById || sameDeptByName;
};

const TEACHING_SECTION_KEYS = ['courses_taught', 'new_courses', 'courseware', 'teaching_innovation'];

const COMMENT_SECTION_LABEL_TO_KEYS = {
  'Faculty Information': ['faculty_info'],
  'Teaching & Projects': TEACHING_SECTION_KEYS,
  'Research Publications': ['research_publications'],
  'Research, Grants & Reviews': ['research_grants', 'paper_review', 'submitted_proposals'],
  'Events, Patents & Awards': ['patents', 'awards_honours', 'conference_sessions', 'keynotes_talks', 'technology_transfer'],
  'Consultancy': ['consultancy'],
  'Innovation & Contributions': ['teaching_innovation', 'institutional_contributions'],
  'Additional': ['continuing_education', 'other_activities', 'research_plan', 'teaching_plan', 'courseware'],
  'Part B': ['part_b']
};

const normalizeCommentSectionKey = (comment = {}) => {
  const rawKey = String(comment.section_key || '').trim().toLowerCase();
  if (rawKey === 'courses_taught') return [...TEACHING_SECTION_KEYS];
  if (rawKey) return [rawKey];

  const bySectionName = COMMENT_SECTION_LABEL_TO_KEYS[String(comment.section_name || '').trim()];
  if (Array.isArray(bySectionName) && bySectionName.length > 0) return bySectionName;

  return ['general'];
};

const coerceSnapshotData = (data) => {
  if (!data || typeof data !== 'object') return {};
  return {
    submission: data.submission || {},
    facultyInfo: data.facultyInfo || {},
    courses: Array.isArray(data.courses) ? data.courses : [],
    publications: Array.isArray(data.publications) ? data.publications : [],
    grants: Array.isArray(data.grants) ? data.grants : [],
    patents: Array.isArray(data.patents) ? data.patents : [],
    awards: Array.isArray(data.awards) ? data.awards : [],
    newCourses: Array.isArray(data.newCourses) ? data.newCourses : [],
    proposals: Array.isArray(data.proposals) ? data.proposals : [],
    paperReviews: Array.isArray(data.paperReviews) ? data.paperReviews : [],
    techTransfer: Array.isArray(data.techTransfer) ? data.techTransfer : [],
    conferenceSessions: Array.isArray(data.conferenceSessions) ? data.conferenceSessions : [],
    keynotesTalks: Array.isArray(data.keynotesTalks) ? data.keynotesTalks : [],
    consultancy: Array.isArray(data.consultancy) ? data.consultancy : [],
    teachingInnovation: Array.isArray(data.teachingInnovation) ? data.teachingInnovation : [],
    institutionalContributions: Array.isArray(data.institutionalContributions) ? data.institutionalContributions : [],
    goals: Array.isArray(data.goals) ? data.goals : [],
    courseware: data.courseware || null,
    continuingEducation: data.continuingEducation || null,
    otherActivities: data.otherActivities || null,
    researchPlan: data.researchPlan || null,
    teachingPlan: data.teachingPlan || null,
    comments: Array.isArray(data.comments) ? data.comments : [],
    dynamicData: Array.isArray(data.dynamicData) ? data.dynamicData : []
  };
};

const fetchDynamicSectionData = async ({ facultyIds = [], submissionId = null, formType = null }) => {
  const ids = Array.from(new Set((facultyIds || []).map((id) => Number(id)).filter(Number.isFinite)));
  if (ids.length === 0) return [];

  const placeholders = ids.map(() => '?').join(',');
  const sectionParams = [];
  let sectionFilterSql = '';
  if (formType) {
    sectionFilterSql = " AND (ds.form_type IS NULL OR ds.form_type = '' OR LOWER(ds.form_type) = 'all' OR ds.form_type = ?)";
    sectionParams.push(formType);
  }

  const responseParams = [...ids];
  let responseFilterSql = '';
  if (submissionId) {
    responseFilterSql = ' AND (dr.submission_id = ? OR dr.submission_id IS NULL)';
    responseParams.push(submissionId);
  }

  const [sectionRows] = await db.query(
    `SELECT ds.id, ds.title, ds.form_type, ds.sequence,
            df.id AS field_id, df.label AS field_label, df.field_type, df.config AS field_config, df.sequence AS field_sequence
     FROM dynamic_sections ds
     LEFT JOIN dynamic_fields df ON df.section_id = ds.id
     WHERE ds.is_active = 1${sectionFilterSql}
     ORDER BY ds.sequence, ds.id, df.sequence, df.id`,
    sectionParams
  );

  const [responseRows] = await db.query(
    `SELECT dr.field_id, dr.value
     FROM dynamic_responses dr
     WHERE dr.faculty_id IN (${placeholders})${responseFilterSql}`,
    responseParams
  );

  const responseByField = {};
  responseRows.forEach((row) => {
    if (row.field_id === null || row.field_id === undefined) return;
    if (Object.prototype.hasOwnProperty.call(responseByField, row.field_id)) return;
    const raw = row.value;
    if (typeof raw === 'string') {
      try {
        responseByField[row.field_id] = JSON.parse(raw);
      } catch (_) {
        responseByField[row.field_id] = raw;
      }
      return;
    }
    responseByField[row.field_id] = raw;
  });

  const sectionMap = new Map();
  sectionRows.forEach((row) => {
    if (!sectionMap.has(row.id)) {
      sectionMap.set(row.id, {
        section: {
          id: row.id,
          title: row.title,
          form_type: row.form_type,
          sequence: row.sequence
        },
        fields: []
      });
    }

    if (!row.field_id) return;

    const field = {
      id: row.field_id,
      label: row.field_label,
      field_type: row.field_type,
      sequence: row.field_sequence,
      config: (() => {
        if (row.field_config === null || row.field_config === undefined) return null;
        if (typeof row.field_config === 'object') return row.field_config;
        try {
          return JSON.parse(row.field_config);
        } catch (_) {
          return null;
        }
      })(),
      value: Object.prototype.hasOwnProperty.call(responseByField, row.field_id)
        ? responseByField[row.field_id]
        : null
    };

    sectionMap.get(row.id).fields.push(field);
  });

  return Array.from(sectionMap.values())
    .map((entry) => ({
      ...entry,
      fields: entry.fields
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
    }))
    .filter((entry) => entry.fields.some((f) => f.value !== null && f.value !== undefined && !(typeof f.value === 'string' && f.value.trim() === '')))
    .sort((a, b) => (a.section.sequence || 0) - (b.section.sequence || 0));
};

const buildSubmissionSnapshotPayload = async (submissionId) => {
  const [submission] = await db.query(`
    SELECT s.*, u.name as faculty_name, u.department, u.email, u.designation,
           a.name as approved_by_name
    FROM submissions s
    JOIN users u ON s.faculty_id = u.id
    LEFT JOIN users a ON s.approved_by = a.id
    WHERE s.id = ?
  `, [submissionId]);

  if (submission.length === 0) {
    throw new Error('Submission not found for snapshot creation.');
  }

  const sub = submission[0];
  const user_id = sub.faculty_id;
  const academicYear = sub.academic_year;
  const resolvedFacultyInfoId = await resolveFacultyInfoId({
    facultyId: sub.faculty_id,
    email: sub.email
  });
  const fid = resolvedFacultyInfoId || Number(user_id) || null;
  const yearNum = academicYear.split('-')[0];

  const [
    facultyInfo,
    courses,
    publications,
    grants,
    patents,
    awards,
    newCourses,
    proposals,
    paperReviews,
    techTransfer,
    conferenceSessions,
    keynotesTalks,
    consultancy,
    teachingInnovation,
    institutionalContributions,
    goals,
    comments,
    courseware,
    continuingEducation,
    otherActivities,
    researchPlan,
    teachingPlan,
    dynamicData
  ] = await Promise.all([
    db.query('SELECT * FROM faculty_information WHERE id = ?', [fid]),
    db.query('SELECT * FROM courses_taught WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM research_publications WHERE faculty_id = ? AND year_of_publication >= ?', [fid, yearNum]),
    db.query('SELECT * FROM research_grants WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM patents WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM awards_honours WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM new_courses WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM submitted_proposals WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM paper_reviews WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM technology_transfer WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM conference_sessions WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM keynotes_talks WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM consultancy WHERE faculty_id = ? AND year >= ?', [fid, yearNum]),
    db.query('SELECT * FROM teaching_innovation WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM institutional_contributions WHERE faculty_id = ?', [fid]),
    db.query('SELECT * FROM faculty_goals WHERE faculty_id = ?', [fid]),
    db.query(`
      SELECT rc.*, COALESCE(NULLIF(rc.section_name, ''), 'General') as section_name,
             NULLIF(rc.section_key, '') as section_key, u.name as reviewer_name, u.designation
      FROM review_comments rc
      LEFT JOIN users u ON rc.reviewer_id = u.id
      WHERE rc.submission_id = ?
      ORDER BY rc.created_at DESC
    `, [submissionId]),
    fetchLegacySectionContent(user_id, academicYear, 'courseware'),
    fetchLegacySectionContent(user_id, academicYear, 'continuing_education'),
    fetchLegacySectionContent(user_id, academicYear, 'other_activities'),
    fetchLegacySectionContent(user_id, academicYear, 'research_plan'),
    fetchLegacySectionContent(user_id, academicYear, 'teaching_plan'),
    fetchDynamicSectionData({
      facultyIds: [sub.faculty_id, fid],
      submissionId,
      formType: sub.form_type || null
    })
  ]);

  return {
    submission: sub,
    facultyInfo: facultyInfo[0][0] || {},
    courses: courses[0] || [],
    publications: publications[0] || [],
    grants: grants[0] || [],
    patents: patents[0] || [],
    awards: awards[0] || [],
    newCourses: newCourses[0] || [],
    proposals: proposals[0] || [],
    paperReviews: paperReviews[0] || [],
    techTransfer: techTransfer[0] || [],
    conferenceSessions: conferenceSessions[0] || [],
    keynotesTalks: keynotesTalks[0] || [],
    consultancy: consultancy[0] || [],
    teachingInnovation: teachingInnovation[0] || [],
    institutionalContributions: institutionalContributions[0] || [],
    goals: goals[0] || [],
    courseware: courseware || null,
    continuingEducation: continuingEducation || null,
    otherActivities: otherActivities || null,
    researchPlan: researchPlan || null,
    teachingPlan: teachingPlan || null,
    comments: comments[0] || [],
    dynamicData: dynamicData || []
  };
};

const ensureSubmissionVersionsTable = async () => {
  const [tables] = await db.query("SHOW TABLES LIKE 'submission_versions'");
  if (tables.length === 0) {
    await db.query(`
      CREATE TABLE IF NOT EXISTS submission_versions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        version_number INT NOT NULL,
        snapshot_data LONGTEXT NOT NULL,
        snapshot_note VARCHAR(255) NULL,
        created_by INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_submission_version (submission_id, version_number),
        KEY idx_submission_versions_submission (submission_id),
        CONSTRAINT fk_submission_versions_submission FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        CONSTRAINT fk_submission_versions_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);
  }
};

const createSubmissionSnapshot = async ({ submissionId, createdBy = null, note = null }) => {
  await ensureSubmissionVersionsTable();

  const snapshotPayload = await buildSubmissionSnapshotPayload(submissionId);
  const snapshotData = JSON.stringify(snapshotPayload);

  const [latestVersionRows] = await db.query(
    'SELECT COALESCE(MAX(version_number), 0) AS currentVersion FROM submission_versions WHERE submission_id = ?',
    [submissionId]
  );
  const nextVersion = Number(latestVersionRows[0]?.currentVersion || 0) + 1;

  await db.query(
    `INSERT INTO submission_versions
      (submission_id, version_number, snapshot_data, snapshot_note, created_by)
     VALUES (?, ?, ?, ?, ?)`,
    [submissionId, nextVersion, snapshotData, note || null, createdBy || null]
  );

  return nextVersion;
};

async function fetchLegacySectionContent(facultyId, academicYear, sectionKey) {
  const [rows] = await db.query(
    `SELECT content_json
     FROM legacy_section_entries
     WHERE faculty_id = ? AND section_key = ? AND academic_year = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [facultyId, sectionKey, academicYear]
  );

  if (rows.length > 0) {
    return rows[0].content_json || null;
  }

  const [fallbackRows] = await db.query(
    `SELECT content_json
     FROM legacy_section_entries
     WHERE faculty_id = ? AND section_key = ?
     ORDER BY updated_at DESC
     LIMIT 1`,
    [facultyId, sectionKey]
  );

  return fallbackRows.length > 0 ? fallbackRows[0].content_json || null : null;
}



// Get all submissions with filters
exports.getAllSubmissions = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { status, academic_year, faculty_id, form_type } = req.query;
    const role = req.user.role;

    let query = `
      SELECT s.*, u.name as faculty_name, u.department, u.email,
             u.department_id as faculty_department_id,
             a.name as approved_by_name
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN users a ON s.approved_by = a.id
      WHERE 1=1
        AND u.role = 'faculty'
    `;
    const params = [];

    if (role === 'faculty') {
      query += ' AND s.faculty_id = ?';
      params.push(req.user.id);

      if (!form_type) {
        query += " AND UPPER(COALESCE(s.form_type, 'A')) = 'A'";
      }
    } else if (role === 'hod') {
      const hodDept = await resolveHodDepartmentContext(req.user);
      if (!hodDept) {
        return res.status(403).json({ success: false, message: 'HOD department mapping is missing.' });
      }

      query += " AND UPPER(COALESCE(s.form_type, 'A')) = 'B'";
      query += ' AND ((u.department_id = ?) OR (u.department_id IS NULL AND ? <> "" AND LOWER(TRIM(u.department)) = LOWER(TRIM(?))))';
      params.push(hodDept.id || 0, hodDept.name || '', hodDept.name || '');
    } else if (!['Dofa', 'Dofa_office', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to view submissions.' });
    }

    if (form_type) {
      const normalizedFormType = normalizeFormType(form_type);
      if (!['A', 'B'].includes(normalizedFormType)) {
        return res.status(400).json({ success: false, message: 'Invalid form_type. Use A or B.' });
      }
      query += " AND UPPER(COALESCE(s.form_type, 'A')) = ?";
      params.push(normalizedFormType);
    }

    if (status) {
      if (status === 'submitted') {
        query += " AND s.status IN ('submitted', 'submitted_hod', 'hod_approved')";
      } else if (status === 'under_review') {
        query += " AND s.status IN ('under_review', 'under_review_hod')";
      } else {
        query += ' AND s.status = ?';
        params.push(status);
      }
    }
    if (academic_year) {
      query += ' AND s.academic_year = ?';
      params.push(academic_year);
    }
    if (faculty_id) {
      query += ' AND s.faculty_id = ?';
      params.push(faculty_id);
    }

    query += ' ORDER BY s.created_at DESC';

    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get submission by ID with all details
exports.getSubmissionById = async (req, res) => {
  try {
    const { id } = req.params;

    // Get submission details
        const [submission] = await db.query(`
          SELECT s.*, u.name as faculty_name, u.department, u.department_id as faculty_department_id, u.email, u.designation, u.role as faculty_role,
             a.name as approved_by_name
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN users a ON s.approved_by = a.id
      WHERE s.id = ?
    `, [id]);

    if (submission.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const sub = submission[0];

    if (String(sub.faculty_role || '').toLowerCase() !== 'faculty') {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const role = req.user?.role;
    const formType = normalizeFormType(sub.form_type);

    if (role === 'faculty' && Number(req.user.id) !== Number(sub.faculty_id)) {
      return res.status(403).json({ success: false, message: 'You can only view your own submission.' });
    }

    if (role === 'hod') {
      if (formType !== 'B') {
        return res.status(403).json({ success: false, message: 'HOD can only access Form B submissions.' });
      }

      const hodDept = await resolveHodDepartmentContext(req.user);
      if (!hodDept) {
        return res.status(403).json({ success: false, message: 'HOD department mapping is missing.' });
      }

      const facultyDeptId = Number(sub.faculty_department_id || sub.department_id || 0);
      const facultyDeptName = String(sub.department || '').trim().toLowerCase();
      const sameDeptById = hodDept.id > 0 && facultyDeptId > 0 && facultyDeptId === hodDept.id;
      const sameDeptByName = facultyDeptName && facultyDeptName === hodDept.nameNorm;

      if (!sameDeptById && !sameDeptByName) {
        return res.status(403).json({ success: false, message: 'HOD can only access submissions from own department.' });
      }
    }

    if (['Dofa', 'Dofa_office'].includes(role) && formType === 'B' && ['submitted_hod', 'under_review_hod'].includes(sub.status)) {
      return res.status(403).json({ success: false, message: 'Form B can be reviewed by Dofa only after HOD approval.' });
    }

    if (!['faculty', 'hod', 'Dofa', 'Dofa_office', 'admin'].includes(role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to view submission.' });
    }

    const user_id = sub.faculty_id;
    const academicYear = sub.academic_year;

    // Map to faculty_information.id for section tables that use that FK.
    // Fallback to submissions.faculty_id for backward compatibility with legacy rows.
    const resolvedFacultyInfoId = await resolveFacultyInfoId({
      facultyId: sub.faculty_id,
      email: sub.email
    });
    const fid = resolvedFacultyInfoId || Number(user_id) || null;
    
    // Helper to get year from academic_year string (e.g. "2025-26" -> 2025)
    const yearNum = academicYear.split('-')[0];

    // HOD must only review Form B content. Do not return Form A sections.
    if (role === 'hod' && formType === 'B') {
      const [facultyInfo] = await db.query('SELECT * FROM faculty_information WHERE id = ?', [fid]);
      const [goals] = await db.query('SELECT * FROM faculty_goals WHERE faculty_id = ?', [fid]);
      const dynamicData = await fetchDynamicSectionData({
        facultyIds: [sub.faculty_id, fid],
        submissionId: id,
        formType: 'B'
      });

      const [comments] = await db.query(`
        SELECT rc.*, u.name as reviewer_name
        FROM review_comments rc
        LEFT JOIN users u ON rc.reviewer_id = u.id
        WHERE rc.submission_id = ?
        ORDER BY rc.created_at DESC
      `, [id]);

      return res.json({
        success: true,
        data: {
          submission: sub,
          facultyInfo: facultyInfo[0] || {},
          courses: [],
          publications: [],
          grants: [],
          patents: [],
          awards: [],
          newCourses: [],
          proposals: [],
          paperReviews: [],
          techTransfer: [],
          conferenceSessions: [],
          keynotesTalks: [],
          consultancy: [],
          teachingInnovation: [],
          institutionalContributions: [],
          goals: goals || [],
          courseware: null,
          continuingEducation: null,
          otherActivities: null,
          researchPlan: null,
          teachingPlan: null,
          comments: comments || [],
          dynamicData: dynamicData || []
        }
      });
    }

    // Get faculty information
    const [facultyInfo] = await db.query('SELECT * FROM faculty_information WHERE id = ?', [fid]);

    // Get courses taught
    const [courses] = await db.query('SELECT * FROM courses_taught WHERE faculty_id = ?', [fid]);

    // Get publications - Filter by year if possible, but keep all as requested for now if no specific year matching logic exists
    const [publications] = await db.query('SELECT * FROM research_publications WHERE faculty_id = ? AND year_of_publication >= ?', [fid, yearNum]);

    // Get grants
    const [grants] = await db.query('SELECT * FROM research_grants WHERE faculty_id = ?', [fid]);

    // Get patents
    const [patents] = await db.query('SELECT * FROM patents WHERE faculty_id = ?', [fid]);

    // Get awards
    const [awards] = await db.query('SELECT * FROM awards_honours WHERE faculty_id = ?', [fid]);

    // Get new courses developed
    const [newCourses] = await db.query('SELECT * FROM new_courses WHERE faculty_id = ?', [fid]);

    // Get submitted proposals
    const [proposals] = await db.query('SELECT * FROM submitted_proposals WHERE faculty_id = ?', [fid]);

    // Get paper reviews
    const [paperReviews] = await db.query('SELECT * FROM paper_reviews WHERE faculty_id = ?', [fid]);

    // Get technology transfer
    const [techTransfer] = await db.query('SELECT * FROM technology_transfer WHERE faculty_id = ?', [fid]);

    // Get conference sessions
    const [conferenceSessions] = await db.query('SELECT * FROM conference_sessions WHERE faculty_id = ?', [fid]);

    // Get keynotes and talks
    const [keynotesTalks] = await db.query('SELECT * FROM keynotes_talks WHERE faculty_id = ?', [fid]);

    // Get consultancy
    const [consultancy] = await db.query('SELECT * FROM consultancy WHERE faculty_id = ? AND year >= ?', [fid, yearNum]);

    // Get teaching innovation
    const [teachingInnovation] = await db.query('SELECT * FROM teaching_innovation WHERE faculty_id = ?', [fid]);

    // Get institutional contributions
    const [institutionalContributions] = await db.query('SELECT * FROM institutional_contributions WHERE faculty_id = ?', [fid]);

    // Get Part B goals
    const [goals] = await db.query('SELECT * FROM faculty_goals WHERE faculty_id = ?', [fid]);

    // Get legacy section content stored separately from the core submission tables.
    const [courseware, continuingEducation, otherActivities, researchPlan, teachingPlan] = await Promise.all([
      fetchLegacySectionContent(user_id, academicYear, 'courseware'),
      fetchLegacySectionContent(user_id, academicYear, 'continuing_education'),
      fetchLegacySectionContent(user_id, academicYear, 'other_activities'),
      fetchLegacySectionContent(user_id, academicYear, 'research_plan'),
      fetchLegacySectionContent(user_id, academicYear, 'teaching_plan'),
    ]);

    const dynamicData = await fetchDynamicSectionData({
      facultyIds: [sub.faculty_id, fid],
      submissionId: id,
      formType: sub.form_type || null
    });

    // Get review comments
    const [comments] = await db.query(`
      SELECT rc.*, u.name as reviewer_name
      FROM review_comments rc
      LEFT JOIN users u ON rc.reviewer_id = u.id
      WHERE rc.submission_id = ?
      ORDER BY rc.created_at DESC
    `, [id]);

    res.json({
      success: true,
      data: {
        submission: sub,
        facultyInfo: facultyInfo[0] || {},
        courses: courses || [],
        publications: publications || [],
        grants: grants || [],
        patents: patents || [],
        awards: awards || [],
        newCourses: newCourses || [],
        proposals: proposals || [],
        paperReviews: paperReviews || [],
        techTransfer: techTransfer || [],
        conferenceSessions: conferenceSessions || [],
        keynotesTalks: keynotesTalks || [],
        consultancy: consultancy || [],
        teachingInnovation: teachingInnovation || [],
        institutionalContributions: institutionalContributions || [],
        goals: goals || [],
        courseware: courseware || null,
        continuingEducation: continuingEducation || null,
        otherActivities: otherActivities || null,
        researchPlan: researchPlan || null,
        teachingPlan: teachingPlan || null,
        comments: comments || [],
        dynamicData: dynamicData || []
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new submission
exports.createSubmission = async (req, res) => {
  try {
    const { faculty_id, academic_year, form_type } = req.body;

    const [result] = await db.query(
      'INSERT INTO submissions (faculty_id, academic_year, form_type, status) VALUES (?, ?, ?, ?)',
      [faculty_id, academic_year, form_type || 'A', 'draft']
    );

    res.status(201).json({
      success: true,
      message: 'Submission created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update submission status
exports.updateSubmissionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by } = req.body;
    const requesterRole = req.user?.role;

    if (!requesterRole) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const [existingRows] = await db.query(
      `SELECT s.id, s.faculty_id, s.status, s.academic_year, s.form_type,
              u.department_id as faculty_department_id, u.department as faculty_department, u.role as faculty_role
       FROM submissions s
       JOIN users u ON u.id = s.faculty_id
       WHERE s.id = ?`,
      [id]
    );
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const submission = existingRows[0];
    if (String(submission.faculty_role || '').toLowerCase() !== 'faculty') {
      return res.status(400).json({ success: false, message: 'Only faculty submissions are reviewable.' });
    }
    const formType = normalizeFormType(submission.form_type);
    let nextStatus = String(status || '').trim();

    // Faculty can only submit/re-submit their own record.
    if (requesterRole === 'faculty') {
      if (Number(submission.faculty_id) !== Number(req.user.id)) {
        return res.status(403).json({ success: false, message: 'You can only update your own submission.' });
      }

      if (nextStatus !== 'submitted') {
        return res.status(403).json({ success: false, message: 'Faculty can only submit or re-submit.' });
      }

      if (!['draft', 'sent_back'].includes(submission.status)) {
        return res.status(403).json({
          success: false,
          message: 'Submission is locked. Request edits or wait for Dofa to send back.'
        });
      }

      nextStatus = formType === 'B' ? 'submitted_hod' : 'submitted';
    }

    if (requesterRole === 'hod') {
      if (formType !== 'B') {
        return res.status(403).json({ success: false, message: 'HOD can only review Form B submissions.' });
      }

      const hodDept = await resolveHodDepartmentContext(req.user);
      if (!isSubmissionInHodDepartment(submission, hodDept)) {
        return res.status(403).json({ success: false, message: 'HOD can only review submissions from own department.' });
      }

      const allowed = ['under_review_hod', 'hod_approved', 'sent_back'];
      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status transition requested for HOD.' });
      }

      const transitionMap = {
        submitted_hod: ['under_review_hod', 'hod_approved', 'sent_back'],
        under_review_hod: ['hod_approved', 'sent_back'],
        sent_back: []
      };
      const allowedNext = transitionMap[submission.status] || [];
      if (!allowedNext.includes(nextStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid HOD status transition for the current submission state.' });
      }
    }

    // Dofa/Dofa office/Admin can manage Dofa stage statuses.
    if (['Dofa', 'Dofa_office', 'admin'].includes(requesterRole)) {
      const allowed = ['under_review', 'approved', 'sent_back'];
      if (!allowed.includes(nextStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status transition requested.' });
      }

      if (formType === 'B' && ['submitted_hod', 'under_review_hod'].includes(submission.status)) {
        return res.status(403).json({ success: false, message: 'Form B can be reviewed by Dofa only after HOD approval.' });
      }

      const transitionMap = {
        submitted: ['under_review', 'approved', 'sent_back'],
        hod_approved: ['under_review', 'approved', 'sent_back'],
        under_review: ['approved', 'sent_back'],
        approved: ['sent_back'],
        sent_back: []
      };
      const allowedNext = transitionMap[submission.status] || [];
      if (!allowedNext.includes(nextStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid status transition for the current submission state.' });
      }
    }

    if (!['faculty', 'hod', 'Dofa', 'Dofa_office', 'admin'].includes(requesterRole)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to update submission.' });
    }

    let query = 'UPDATE submissions SET status = ?';
    const params = [nextStatus];

    if (nextStatus === 'submitted' || nextStatus === 'submitted_hod') {
      query += ', submitted_at = CURRENT_TIMESTAMP';
    }

    if (nextStatus === 'approved') {
      query += ', approved_by = ?, approved_at = CURRENT_TIMESTAMP';
      params.push(approved_by || req.user?.id || null);
    }

    query += ' WHERE id = ?';
    params.push(id);

    const [result] = await db.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    // When faculty submits Form A, ensure a parallel Form B row exists and enters HOD pipeline.
    if (requesterRole === 'faculty' && formType === 'A' && nextStatus === 'submitted') {
      const [formBRows] = await db.query(
        `SELECT id, status
         FROM submissions
         WHERE faculty_id = ? AND academic_year = ? AND UPPER(COALESCE(form_type, 'A')) = 'B'
         ORDER BY id DESC
         LIMIT 1`,
        [submission.faculty_id, submission.academic_year]
      );

      if (formBRows.length === 0) {
        await db.query(
          `INSERT INTO submissions (faculty_id, academic_year, form_type, status, submitted_at)
           VALUES (?, ?, 'B', 'submitted_hod', CURRENT_TIMESTAMP)`,
          [submission.faculty_id, submission.academic_year]
        );
      } else {
        await db.query(
          `UPDATE submissions
           SET status = 'submitted_hod', submitted_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [formBRows[0].id]
        );
      }
    }

    // Trigger auto-allocation if status is 'submitted'
    if (nextStatus === 'submitted' || nextStatus === 'submitted_hod') {
      try {
        const nextVersion = await createSubmissionSnapshot({
          submissionId: Number(id),
          createdBy: req.user?.id || null,
          note: submission.status === 'sent_back'
            ? `Faculty re-submission routed to ${formType === 'B' ? 'HOD' : 'Dofa'}`
            : `Faculty submission routed to ${formType === 'B' ? 'HOD' : 'Dofa'}`
        });

        await db.query(
          `UPDATE review_comments
           SET is_resolved = 1,
               resolved_at = CURRENT_TIMESTAMP,
               resolved_in_version = ?
           WHERE submission_id = ? AND is_resolved = 0`,
          [nextVersion, Number(id)]
        );

        // Get faculty_id and academic_year for the submission
        const [subDetails] = await db.query('SELECT faculty_id, academic_year FROM submissions WHERE id = ?', [id]);
        if (subDetails.length > 0) {
          const { faculty_id, academic_year } = subDetails[0];
          await autoAllocateMarks(id, faculty_id, academic_year);
        }
      } catch (err) {
        console.error('Failed to trigger auto-allocation:', err);
      }
    }

    if (nextStatus === 'sent_back') {
      try {
        const [facultyRows] = await db.query(
          `SELECT s.academic_year, u.name AS faculty_name, u.email
           FROM submissions s
           JOIN users u ON u.id = s.faculty_id
           WHERE s.id = ?
           LIMIT 1`,
          [id]
        );

        if (facultyRows.length > 0) {
          const faculty = facultyRows[0];
          const [commentsRows] = await db.query(
            `SELECT section_name, section_key, comment, created_at
             FROM review_comments
             WHERE submission_id = ? AND COALESCE(is_resolved, 0) = 0
             ORDER BY created_at DESC`,
            [id]
          );

          const latestPendingBySection = new Map();
          commentsRows.forEach((item) => {
            const sectionName = String(item.section_name || 'General').trim() || 'General';
            const sectionKey = sectionName.toLowerCase();
            const text = String(item.comment || '').trim();
            if (!text) return;

            if (!latestPendingBySection.has(sectionKey)) {
              latestPendingBySection.set(sectionKey, {
                section_name: sectionName,
                comment: text
              });
            }
          });

          const commentsForEmail = Array.from(latestPendingBySection.values());

          await emailService.sendSubmissionSentBackToFaculty({
            to: faculty.email,
            facultyName: faculty.faculty_name,
            academicYear: faculty.academic_year,
            comments: commentsForEmail
          });
        }
      } catch (emailError) {
        console.error('Failed to send sent-back notification email:', emailError);
      }
    }

    res.json({ success: true, message: 'Submission status updated successfully', data: { status: nextStatus } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/submissions/:id/versions
exports.getSubmissionVersions = async (req, res) => {
  try {
    await ensureSubmissionVersionsTable();
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT sv.id, sv.submission_id, sv.version_number, sv.snapshot_note, sv.created_at,
              sv.created_by, u.name AS created_by_name
       FROM submission_versions sv
       LEFT JOIN users u ON u.id = sv.created_by
       WHERE sv.submission_id = ?
       ORDER BY sv.version_number DESC`,
      [id]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/submissions/:id/versions/:versionNumber
exports.getSubmissionVersionByNumber = async (req, res) => {
  try {
    await ensureSubmissionVersionsTable();
    const { id, versionNumber } = req.params;

    const [rows] = await db.query(
      `SELECT sv.id, sv.submission_id, sv.version_number, sv.snapshot_note, sv.created_at,
              sv.created_by, u.name AS created_by_name, sv.snapshot_data
       FROM submission_versions sv
       LEFT JOIN users u ON u.id = sv.created_by
       WHERE sv.submission_id = ? AND sv.version_number = ?
       LIMIT 1`,
      [id, versionNumber]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission version not found' });
    }

    let parsed = {};
    try {
      parsed = JSON.parse(rows[0].snapshot_data || '{}');
    } catch (parseError) {
      parsed = {};
    }

    const safeData = coerceSnapshotData(parsed);
    res.json({
      success: true,
      data: {
        ...rows[0],
        snapshot_data: undefined,
        snapshot: safeData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Save consultancy
exports.saveConsultancy = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const { faculty_id, consultancy } = req.body;

    await connection.query('DELETE FROM consultancy WHERE faculty_id = ?', [faculty_id]);

    if (consultancy && Array.isArray(consultancy)) {
      for (const item of consultancy) {
        await connection.query(
          `INSERT INTO consultancy 
          (faculty_id, organization, project_title, role, duration, amount, year) 
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [faculty_id, item.organisation, item.project, item.role, item.duration, item.amount, item.year]
        );
      }
    }

    await connection.commit();
    res.json({ success: true, message: 'Consultancy saved successfully' });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ success: false, message: error.message });
  } finally {
    connection.release();
  }
};
// Get submission statistics
exports.getSubmissionStats = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const { academic_year } = req.query;
    const params = [];
    const whereParts = [];

    if (academic_year) {
      whereParts.push('s.academic_year = ?');
      params.push(academic_year);
    }

    if (req.user.role === 'faculty') {
      whereParts.push('s.faculty_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'hod') {
      const hodDept = await resolveHodDepartmentContext(req.user);
      if (!hodDept) {
        return res.status(403).json({ success: false, message: 'HOD department mapping is missing.' });
      }

      whereParts.push("UPPER(COALESCE(s.form_type, 'A')) = 'B'");
      whereParts.push('((u.department_id = ?) OR (u.department_id IS NULL AND ? <> "" AND LOWER(TRIM(u.department)) = LOWER(TRIM(?))))');
      params.push(hodDept.id || 0, hodDept.name || '', hodDept.name || '');
    } else if (!['Dofa', 'Dofa_office', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions to view submission stats.' });
    }

    const whereClause = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

    const [stats] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN s.status = 'draft' THEN 1 ELSE 0 END) as draft,
        SUM(CASE WHEN s.status IN ('submitted', 'submitted_hod', 'hod_approved') THEN 1 ELSE 0 END) as submitted,
        SUM(CASE WHEN s.status IN ('under_review', 'under_review_hod') THEN 1 ELSE 0 END) as under_review,
        SUM(CASE WHEN s.status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN s.status = 'sent_back' THEN 1 ELSE 0 END) as sent_back,
        SUM(CASE WHEN s.status = 'submitted_hod' THEN 1 ELSE 0 END) as submitted_hod,
        SUM(CASE WHEN s.status = 'under_review_hod' THEN 1 ELSE 0 END) as under_review_hod,
        SUM(CASE WHEN s.status = 'hod_approved' THEN 1 ELSE 0 END) as hod_approved
      FROM submissions s
      JOIN users u ON u.id = s.faculty_id
      AND u.role = 'faculty'
      ${whereClause}
    `, params);

    let totalFacultyQuery = "SELECT COUNT(*) as total FROM users WHERE role = 'faculty'";
    const totalFacultyParams = [];
    if (req.user.role === 'hod') {
      const hodDept = await resolveHodDepartmentContext(req.user);
      totalFacultyQuery += ' AND ((department_id = ?) OR (department_id IS NULL AND ? <> "" AND LOWER(TRIM(department)) = LOWER(TRIM(?))))';
      totalFacultyParams.push(hodDept?.id || 0, hodDept?.name || '', hodDept?.name || '');
    } else if (req.user.role === 'faculty') {
      totalFacultyQuery += ' AND id = ?';
      totalFacultyParams.push(req.user.id);
    }

    const [totalFaculty] = await db.query(totalFacultyQuery, totalFacultyParams);

    res.json({
      success: true,
      data: {
        totalFaculty: totalFaculty[0].total,
        totalSubmissions: stats[0].total,
        draft: stats[0].draft,
        submitted: stats[0].submitted,
        underReview: stats[0].under_review,
        approved: stats[0].approved,
        sentBack: stats[0].sent_back,
        hodSubmitted: stats[0].submitted_hod,
        hodUnderReview: stats[0].under_review_hod,
        hodApproved: stats[0].hod_approved,
        pending: stats[0].submitted + stats[0].under_review
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Lock/Unlock submission
exports.toggleSubmissionLock = async (req, res) => {
  try {
    const { id } = req.params;
    const { locked, locked_by } = req.body;

    // Update submission lock status
    await db.query('UPDATE submissions SET locked = ? WHERE id = ?', [locked, id]);

    // Record lock/unlock event
    if (locked) {
      await db.query(
        'INSERT INTO submission_locks (submission_id, locked_by, is_locked) VALUES (?, ?, ?)',
        [id, locked_by, true]
      );
    } else {
      await db.query(
        'UPDATE submission_locks SET is_locked = ?, unlocked_at = CURRENT_TIMESTAMP WHERE submission_id = ? AND is_locked = ?',
        [false, id, true]
      );
    }

    res.json({
      success: true,
      message: locked ? 'Submission locked successfully' : 'Submission unlocked successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// Send manual reminder email for a submission
exports.sendReminder = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(`
      SELECT s.*, u.name as faculty_name, u.email, s.academic_year
      FROM submissions s
      JOIN users u ON s.faculty_id = u.id
      WHERE s.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const sub = rows[0];

    if (!sub.email) {
      return res.status(400).json({ success: false, message: 'Faculty has no email address' });
    }

    // Fetch active session to get deadline
    const [sessions] = await db.query(
      `SELECT * FROM appraisal_sessions WHERE academic_year = ? AND is_released = 1 ORDER BY id DESC LIMIT 1`,
      [sub.academic_year]
    );

    const deadline = sessions[0]?.deadline
      ? new Date(sessions[0].deadline).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : 'Please check with Dofa office';

    await emailService.sendDeadlineReminder({
      to: sub.email,
      name: sub.faculty_name,
      academicYear: sub.academic_year,
      deadline
    });

    res.json({ success: true, message: `Reminder sent to ${sub.email}` });
  } catch (error) {
    console.error('Send reminder error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/submissions/export/excel/:academic_year
exports.exportComprehensiveExcel = async (req, res) => {
  try {
    const { academic_year } = req.params;
    
    let query = `
      SELECT s.*, u.name as faculty_name, u.department, u.designation, u.email, f.id as faculty_info_id
      FROM submissions s 
      JOIN users u ON s.faculty_id = u.id
      LEFT JOIN faculty_information f ON u.email = f.email
    `;
    const queryParams = [];

    if (academic_year && academic_year !== 'all') {
      query += ` WHERE s.academic_year = ?`;
      queryParams.push(academic_year);
    }
    
    query += ` ORDER BY u.department, u.name`;

    const [submissions] = await db.query(query, queryParams);

    if (submissions.length === 0) {
      return res.status(404).json({ success: false, message: 'No records found for the selected academic year' });
    }

    // Prepare arrays for different sheets
    const summaryData = [];
    const publicationsData = [];
    const coursesData = [];
    const grantsData = [];
    const patentsData = [];
    const awardsData = [];

    for (const sub of submissions) {
      const yearNum = sub.academic_year.split('-')[0];
      const fid = sub.faculty_info_id; // Mapping to faculty_information table ID
      
      // Basic summary mapping
      summaryData.push({
        'Faculty Name': sub.faculty_name,
        'Department': sub.department,
        'Designation': sub.designation,
        'Email': sub.email,
        'Academic Year': sub.academic_year,
        'Form Type': sub.form_type,
        'Status': sub.status,
        'Submitted Date': sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'N/A',
        'Total Score': sub.total_score
      });

      // Publications
      const [publications] = await db.query('SELECT * FROM research_publications WHERE faculty_id = ? AND year_of_publication >= ?', [fid, yearNum]);
      publications.forEach(p => publicationsData.push({
        'Faculty Name': sub.faculty_name,
        'Type': p.publication_type,
        'Sub Type': p.sub_type,
        'Title': p.title,
        'Year': p.year_of_publication,
        'Journal/Conference': p.journal_name || p.conference_name,
        'Status': p.status
      }));

      // Courses
      const [courses] = await db.query('SELECT * FROM courses_taught WHERE faculty_id = ?', [fid]); // Assuming courses are tied to the session/year somehow
      courses.forEach(c => coursesData.push({
        'Faculty Name': sub.faculty_name,
        'Course Name': c.course_name,
        'Course Code': c.course_code,
        'Semester': c.semester,
        'Program': c.program,
        'Enrollment': c.enrollment,
        'Feedback Score': c.feedback_score
      }));

      // Grants
      const [grants] = await db.query('SELECT * FROM research_grants WHERE faculty_id = ?', [fid]);
      grants.forEach(g => grantsData.push({
        'Faculty Name': sub.faculty_name,
        'Project Name': g.project_name,
        'Funding Agency': g.funding_agency,
        'Amount (Lakhs)': g.amount_in_lakhs,
        'Role': g.role,
        'Duration': g.duration
      }));

      // Patents
      const [patents] = await db.query('SELECT * FROM patents WHERE faculty_id = ?', [fid]);
      patents.forEach(p => patentsData.push({
        'Faculty Name': sub.faculty_name,
        'Patent Type': p.patent_type,
        'Title': p.title,
        'Agency': p.agency,
        'Month': p.month ? p.month.toISOString().split('T')[0] : ''
      }));

      // Awards
      const [awards] = await db.query('SELECT * FROM awards_honours WHERE faculty_id = ?', [fid]);
      awards.forEach(a => awardsData.push({
        'Faculty Name': sub.faculty_name,
        'Award Name': a.award_name,
        'Honor Type': a.honor_type,
        'Description': a.description
      }));
    }

    // Create workbook and append sheets
    const workbook = xlsx.utils.book_new();
    
    xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(summaryData), 'Summary');
    if (publicationsData.length > 0) xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(publicationsData), 'Publications');
    if (coursesData.length > 0) xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(coursesData), 'Courses');
    if (grantsData.length > 0) xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(grantsData), 'Grants');
    if (patentsData.length > 0) xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(patentsData), 'Patents');
    if (awardsData.length > 0) xlsx.utils.book_append_sheet(workbook, xlsx.utils.json_to_sheet(awardsData), 'Awards & Honours');

    // Generate buffer
    const excelBuffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Appraisal_Export_${academic_year}.xlsx`);
    res.send(excelBuffer);

  } catch (error) {
    console.error('Export Comprehensive Excel error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

