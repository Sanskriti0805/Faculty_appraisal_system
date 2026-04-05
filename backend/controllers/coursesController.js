const db = require('../config/database');
const upload = require('../middleware/upload');

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

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
  }

  return null;
};

// Get all courses for a faculty with pagination
exports.getCoursesByFaculty = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const facultyInfoId = await resolveFacultyInfoId({ facultyId: req.params.facultyId });

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

    const [rows] = await db.query(
      'SELECT * FROM courses_taught WHERE faculty_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [facultyInfoId, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM courses_taught WHERE faculty_id = ?',
      [facultyInfoId]
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

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const [result] = await db.query(
      'INSERT INTO courses_taught (faculty_id, section, semester, course_code, course_name, program, credits, enrollment, percentage, feedback_score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [facultyInfoId, section, semester, course_code, course_name, program, credits, enrollment, percentage || null, feedback_score || null, status]
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

// Create new course developed with draft/submit support
exports.createNewCourse = async (req, res) => {
  try {
    const { faculty_id, level_type, program, course_name, course_code, level, remarks, status = 'draft' } = req.body;
    const cif_file = req.file ? req.file.filename : null;

    const facultyInfoId = await resolveFacultyInfoId({
      facultyId: faculty_id || req.user?.id,
      email: req.user?.email
    });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const [result] = await db.query(
      'INSERT INTO new_courses (faculty_id, level_type, program, course_name, course_code, level, remarks, cif_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [facultyInfoId, level_type, program, course_name, course_code, level, remarks, cif_file, status]
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
    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const [result] = await db.query('DELETE FROM new_courses WHERE id = ? AND faculty_id = ?', [req.params.id, facultyInfoId]);

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

    const [rows] = await db.query(
      'SELECT * FROM new_courses WHERE faculty_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [facultyInfoId, parseInt(limit), parseInt(offset)]
    );

    const [countResult] = await db.query(
      'SELECT COUNT(*) as total FROM new_courses WHERE faculty_id = ?',
      [facultyInfoId]
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
    const facultyInfoId = await resolveFacultyInfoId({ email: req.user?.email, facultyId: req.user?.id });

    if (!facultyInfoId) {
      return res.status(400).json({ success: false, message: 'Faculty profile not found. Complete onboarding first.' });
    }

    const [result] = await db.query('DELETE FROM courses_taught WHERE id = ? AND faculty_id = ?', [req.params.id, facultyInfoId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Course not found' });
    }

    res.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
