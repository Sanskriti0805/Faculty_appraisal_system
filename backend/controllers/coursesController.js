const db = require('../config/database');
const upload = require('../middleware/upload');
const { getCurrentSessionWindow, appendCreatedAtWindow } = require('../utils/sessionScope');

let coursesTaughtColumnsCache = null;

const getCoursesTaughtColumns = async () => {
  if (coursesTaughtColumnsCache) {
    return coursesTaughtColumnsCache;
  }

  const [rows] = await db.query('SHOW COLUMNS FROM courses_taught');
  coursesTaughtColumnsCache = new Set(rows.map((row) => row.Field));
  return coursesTaughtColumnsCache;
};

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const hasText = (value) => typeof value === 'string' && value.trim() !== '';

const resolveFacultyInfoId = async ({ facultyId, email }) => {
  const numericFacultyId = toNumberOrNull(facultyId);

  if (email) {
    const [fiByEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [email]);
    if (fiByEmail.length > 0) {
      return fiByEmail[0].id;
    }
  }

  if (numericFacultyId !== null) {
    const [fiById] = await db.query('SELECT id FROM faculty_information WHERE id = ? LIMIT 1', [numericFacultyId]);
    if (fiById.length > 0) {
      return fiById[0].id;
    }

    const [usersById] = await db.query('SELECT email FROM users WHERE id = ? LIMIT 1', [numericFacultyId]);
    if (usersById.length > 0) {
      const [fiByUserEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [usersById[0].email]);
      if (fiByUserEmail.length > 0) {
        return fiByUserEmail[0].id;
      }
    }

    const [facultyUsers] = await db.query(
      `SELECT id, name, email, department, designation, employee_id, date_of_joining
       FROM users
       WHERE id = ? AND role = 'faculty'
       LIMIT 1`,
      [numericFacultyId]
    );

    if (facultyUsers.length > 0) {
      const userRow = facultyUsers[0];

      if (userRow.email) {
        const [existingByEmail] = await db.query('SELECT id FROM faculty_information WHERE email = ? LIMIT 1', [userRow.email]);
        if (existingByEmail.length > 0) {
          return existingByEmail[0].id;
        }
      }

      const [insertResult] = await db.query(
        `INSERT INTO faculty_information (name, email, department, designation, employee_id, date_of_joining)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userRow.name || null, userRow.email || null, userRow.department || null, userRow.designation || null, userRow.employee_id || null, userRow.date_of_joining || null]
      );

      return insertResult.insertId;
    }
  }

  return null;
};

// Get all courses for a faculty with pagination
exports.getCoursesByFaculty = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });
    const sessionWindow = await getCurrentSessionWindow(db);

    if (!facultyInfoId) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    const scopedData = appendCreatedAtWindow(
      'SELECT * FROM courses_taught WHERE faculty_id = ?',
      [facultyInfoId],
      sessionWindow
    );
    const [rows] = await db.query(
      `${scopedData.sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...scopedData.params, parseInt(limit), parseInt(offset)]
    );

    const scopedCount = appendCreatedAtWindow(
      'SELECT COUNT(*) as total FROM courses_taught WHERE faculty_id = ?',
      [facultyInfoId],
      sessionWindow
    );
    const [countResult] = await db.query(scopedCount.sql, scopedCount.params);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create course with draft/submit support
exports.createCourse = async (req, res) => {
  try {
    const {
      faculty_id,
      section,
      semester,
      course_code,
      course_name,
      remarks,
      project_title,
      project_type,
      project_role,
      student_name,
      project_duration,
      project_outcome,
      program,
      credits,
      enrollment,
      percentage,
      feedback_score,
      existing_evidence_file,
      status = 'draft'
    } = req.body;
    const sessionId = await getCurrentSessionWindow(db);
    const evidence_file = req.file ? req.file.filename : (existing_evidence_file || null);

    const parsedFeedback = feedback_score === undefined || feedback_score === null || feedback_score === ''
      ? null
      : Number(feedback_score);

    if (parsedFeedback !== null && (!Number.isFinite(parsedFeedback) || parsedFeedback < 0 || parsedFeedback > 5)) {
      return res.status(400).json({ success: false, message: 'Feedback score must be between 0 and 5.' });
    }

    const hasMeaningfulPayload = Boolean(
      hasText(course_name) ||
      hasText(course_code) ||
      hasText(program) ||
      hasText(semester) ||
      hasText(remarks) ||
      hasText(project_title) ||
      hasText(project_type) ||
      hasText(project_role) ||
      hasText(student_name) ||
      hasText(project_duration) ||
      hasText(project_outcome) ||
      credits !== undefined ||
      enrollment !== undefined ||
      percentage !== undefined ||
      parsedFeedback !== null ||
      evidence_file
    );

    if (!hasMeaningfulPayload) {
      return res.status(400).json({ success: false, message: 'Empty course row was ignored.' });
    }

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const availableColumns = await getCoursesTaughtColumns();
    const insertColumns = [
      'faculty_id',
      'session_id',
      'section',
      'semester',
      'course_code',
      'course_name',
      'program',
      'credits',
      'enrollment'
    ];

    const insertValues = [
      facultyInfoId,
      sessionId,
      section ?? null,
      semester ?? null,
      course_code ?? null,
      course_name ?? null,
      program ?? null,
      credits ?? null,
      enrollment ?? null
    ];

    if (availableColumns.has('percentage')) {
      insertColumns.push('percentage');
      insertValues.push(percentage || null);
    }

    if (availableColumns.has('feedback_score')) {
      insertColumns.push('feedback_score');
      insertValues.push(parsedFeedback);
    }

    if (availableColumns.has('remarks')) {
      insertColumns.push('remarks');
      insertValues.push(remarks || null);
    }

    if (availableColumns.has('project_title')) {
      insertColumns.push('project_title');
      insertValues.push(project_title || null);
    }

    if (availableColumns.has('project_type')) {
      insertColumns.push('project_type');
      insertValues.push(project_type || null);
    }

    if (availableColumns.has('project_role')) {
      insertColumns.push('project_role');
      insertValues.push(project_role || null);
    }

    if (availableColumns.has('student_name')) {
      insertColumns.push('student_name');
      insertValues.push(student_name || null);
    }

    if (availableColumns.has('project_duration')) {
      insertColumns.push('project_duration');
      insertValues.push(project_duration || null);
    }

    if (availableColumns.has('project_outcome')) {
      insertColumns.push('project_outcome');
      insertValues.push(project_outcome || null);
    }

    if (availableColumns.has('evidence_file')) {
      insertColumns.push('evidence_file');
      insertValues.push(evidence_file);
    }

    if (availableColumns.has('status')) {
      insertColumns.push('status');
      insertValues.push(status);
    }

    const placeholders = insertColumns.map(() => '?').join(', ');

    const [result] = await db.query(
      `INSERT INTO courses_taught (${insertColumns.join(', ')}) VALUES (${placeholders})`,
      insertValues
    );

    res.status(201).json({
      success: true,
      message: `Course ${status === 'submitted' ? 'submitted' : 'saved as draft'} successfully`,
      data: { id: result.insertId, status, fileName: evidence_file }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update an existing course taught
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = await getCurrentSessionWindow(db);
    const {
      semester,
      course_code,
      course_name,
      enrollment,
      percentage,
      feedback_score,
      status = 'submitted'
    } = req.body;

    const availableColumns = await getCoursesTaughtColumns();
    const setClauses = ['semester = ?', 'course_name = ?'];
    const values = [semester ?? null, course_name ?? null];

    if (availableColumns.has('course_code')) { setClauses.push('course_code = ?'); values.push(course_code ?? null); }
    if (availableColumns.has('enrollment')) { setClauses.push('enrollment = ?'); values.push(enrollment ?? null); }
    if (availableColumns.has('percentage')) { setClauses.push('percentage = ?'); values.push(percentage ?? null); }
    if (availableColumns.has('feedback_score')) { setClauses.push('feedback_score = ?'); values.push(feedback_score ?? null); }
    if (availableColumns.has('status')) { setClauses.push('status = ?'); values.push(status); }

    values.push(id, sessionId);

    const [result] = await db.query(
      `UPDATE courses_taught SET ${setClauses.join(', ')} WHERE id = ? AND session_id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({ success: true, message: 'Course updated successfully', data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new course developed with draft/submit support
exports.createNewCourse = async (req, res) => {
  try {
    const {
      faculty_id,
      level_type,
      program,
      course_name,
      course_code,
      level,
      remarks,
      existing_cif_file,
      status = 'draft'
    } = req.body;
    const sessionId = await getCurrentSessionWindow(db);
    const cif_file = req.file ? req.file.filename : (existing_cif_file || null);

    const hasMeaningfulPayload = Boolean(
      hasText(level_type) ||
      hasText(program) ||
      hasText(course_name) ||
      hasText(course_code) ||
      hasText(level) ||
      hasText(remarks) ||
      cif_file
    );

    if (!hasMeaningfulPayload) {
      return res.status(400).json({ success: false, message: 'Empty new-course row was ignored.' });
    }

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const [result] = await db.query(
      'INSERT INTO new_courses (faculty_id, session_id, level_type, program, course_name, course_code, level, remarks, cif_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [facultyInfoId, sessionId, level_type, program, course_name, course_code, level, remarks, cif_file, status]
    );

    res.status(201).json({
      success: true,
      message: `New course ${status === 'submitted' ? 'submitted' : 'saved as draft'} successfully`,
      data: { id: result.insertId, file: cif_file, status }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteNewCourse = async (req, res) => {
  try {
    const sessionId = await getCurrentSessionWindow(db);
    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const [result] = await db.query('DELETE FROM new_courses WHERE id = ? AND faculty_id = ? AND session_id = ?', [req.params.id, facultyInfoId, sessionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'New course not found' });
    }

    res.json({ success: true, message: 'New course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get new courses by faculty with pagination
exports.getNewCoursesByFaculty = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });
    const sessionWindow = await getCurrentSessionWindow(db);

    if (!facultyInfoId) {
      return res.json({
        success: true,
        data: [],
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          totalPages: 0
        }
      });
    }

    const scopedData = appendCreatedAtWindow(
      'SELECT * FROM new_courses WHERE faculty_id = ?',
      [facultyInfoId],
      sessionWindow
    );
    const [rows] = await db.query(
      `${scopedData.sql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...scopedData.params, parseInt(limit), parseInt(offset)]
    );

    const scopedCount = appendCreatedAtWindow(
      'SELECT COUNT(*) as total FROM new_courses WHERE faculty_id = ?',
      [facultyInfoId],
      sessionWindow
    );
    const [countResult] = await db.query(scopedCount.sql, scopedCount.params);

    res.json({
      success: true,
      data: rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const sessionId = await getCurrentSessionWindow(db);
    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const [result] = await db.query('DELETE FROM courses_taught WHERE id = ? AND faculty_id = ? AND session_id = ?', [req.params.id, facultyInfoId, sessionId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
