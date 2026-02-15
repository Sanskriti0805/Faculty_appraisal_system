const db = require('../config/database');
const upload = require('../middleware/upload');

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
      feedback_score,
      status = 'draft'
    } = req.body;

    const [result] = await db.query(
      'INSERT INTO courses_taught (faculty_id, section, semester, course_code, course_name, program, credits, enrollment, feedback_score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [faculty_id, section, semester, course_code, course_name, program, credits, enrollment, feedback_score, status]
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

    const [result] = await db.query(
      'INSERT INTO new_courses (faculty_id, level_type, program, course_name, course_code, level, remarks, cif_file, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [faculty_id, level_type, program, course_name, course_code, level, remarks, cif_file, status]
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
