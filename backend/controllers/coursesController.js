const db = require('../config/database');
const upload = require('../middleware/upload');

// Get all courses for a faculty
exports.getCoursesByFaculty = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM courses_taught WHERE faculty_id = ? ORDER BY created_at DESC',
      [req.params.facultyId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create course
exports.createCourse = async (req, res) => {
  try {
    const { faculty_id, section, semester, course_code, course_name, program, credits, enrollment } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO courses_taught (faculty_id, section, semester, course_code, course_name, program, credits, enrollment) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [faculty_id, section, semester, course_code, course_name, program, credits, enrollment]
    );

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new course developed
exports.createNewCourse = async (req, res) => {
  try {
    const { faculty_id, level_type, program, course_name, course_code, level, remarks } = req.body;
    const cif_file = req.file ? req.file.filename : null;
    
    const [result] = await db.query(
      'INSERT INTO new_courses (faculty_id, level_type, program, course_name, course_code, level, remarks, cif_file) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [faculty_id, level_type, program, course_name, course_code, level, remarks, cif_file]
    );

    res.status(201).json({
      success: true,
      message: 'New course created successfully',
      data: { id: result.insertId, file: cif_file }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get new courses by faculty
exports.getNewCoursesByFaculty = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM new_courses WHERE faculty_id = ? ORDER BY created_at DESC',
      [req.params.facultyId]
    );
    res.json({ success: true, data: rows });
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
