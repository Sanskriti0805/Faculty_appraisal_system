const db = require('../config/database');
const upload = require('../middleware/upload');

let coursesTaughtColumnsCache = null;

const getCoursesTaughtColumns = async () => {
  if (coursesTaughtColumnsCache) {
    return coursesTaughtColumnsCache;
  }

  const [rows] = await db.query('SHOW COLUMNS FROM courses_taught');
  coursesTaughtColumnsCache = new Set(rows.map((row) => row.Field));
  return coursesTaughtColumnsCache;
};

const resolveFacultyInformationId = async (candidateFacultyId) => {
  if (candidateFacultyId === undefined || candidateFacultyId === null || candidateFacultyId === '') {
    return null;
  }

  const [facultyRows] = await db.query(
    'SELECT id FROM faculty_information WHERE id = ? LIMIT 1',
    [candidateFacultyId]
  );

  if (facultyRows.length > 0) {
    return candidateFacultyId;
  }

  const [mappedRows] = await db.query(
    `SELECT fi.id
     FROM users u
     INNER JOIN faculty_information fi ON fi.email = u.email
     WHERE u.id = ?
     LIMIT 1`,
    [candidateFacultyId]
  );

  if (mappedRows.length > 0) {
    return mappedRows[0].id;
  }

  return null;
};

// Get all courses for a faculty with pagination
exports.getCoursesByFaculty = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      'SELECT * FROM courses_taught WHERE faculty_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.params.facultyId, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM courses_taught WHERE faculty_id = ?',
      [req.params.facultyId]
    );

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
      program,
      credits,
      enrollment,
      percentage,
      feedback_score,
      status = 'draft'
    } = req.body;

    const resolvedFacultyId = await resolveFacultyInformationId(faculty_id);
    if (!resolvedFacultyId) {
      return res.status(400).json({
        success: false,
        message: 'Faculty profile not found. Please complete profile onboarding or contact admin.'
      });
    }

    const availableColumns = await getCoursesTaughtColumns();
    const insertColumns = [
      'faculty_id',
      'section',
      'semester',
      'course_code',
      'course_name',
      'program',
      'credits',
      'enrollment'
    ];

    const insertValues = [
      resolvedFacultyId,
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
      insertValues.push(feedback_score || null);
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
      data: { id: result.insertId, status }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update an existing course taught
exports.updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
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

    values.push(id);

    const [result] = await db.query(
      `UPDATE courses_taught SET ${setClauses.join(', ')} WHERE id = ?`,
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
    const { faculty_id, level_type, program, course_name, course_code, level, remarks, status = 'draft' } = req.body;
    const cif_file = req.file ? req.file.filename : null;

    const resolvedFacultyId = await resolveFacultyInformationId(faculty_id);
    if (!resolvedFacultyId) {
      return res.status(400).json({
        success: false,
        message: 'Faculty profile not found. Please complete profile onboarding or contact admin.'
      });
    }

    const [result] = await db.query(
      'INSERT INTO new_courses (faculty_id, level_type, program, course_name, course_code, level, remarks, cif_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [resolvedFacultyId, level_type, program, course_name, course_code, level, remarks, cif_file, status]
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

// Get new courses by faculty with pagination
exports.getNewCoursesByFaculty = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    const [rows] = await db.query(
      'SELECT * FROM new_courses WHERE faculty_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [req.params.facultyId, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM new_courses WHERE faculty_id = ?',
      [req.params.facultyId]
    );

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
    const [result] = await db.query('DELETE FROM courses_taught WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
