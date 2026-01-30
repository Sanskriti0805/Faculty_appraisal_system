const db = require('../config/database');

// Get all faculty members
exports.getAllFaculty = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM faculty_information ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get faculty by ID
exports.getFacultyById = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM faculty_information WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new faculty
exports.createFaculty = async (req, res) => {
  try {
    const { name, employee_id, department, designation, email, phone, date_of_joining, qualifications } = req.body;
    
    const [result] = await db.query(
      'INSERT INTO faculty_information (name, employee_id, department, designation, email, phone, date_of_joining, qualifications) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, employee_id, department, designation, email, phone, date_of_joining, qualifications]
    );

    res.status(201).json({
      success: true,
      message: 'Faculty created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update faculty
exports.updateFaculty = async (req, res) => {
  try {
    const { name, employee_id, department, designation, email, phone, date_of_joining, qualifications } = req.body;
    
    const [result] = await db.query(
      'UPDATE faculty_information SET name = ?, employee_id = ?, department = ?, designation = ?, email = ?, phone = ?, date_of_joining = ?, qualifications = ? WHERE id = ?',
      [name, employee_id, department, designation, email, phone, date_of_joining, qualifications, req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    res.json({ success: true, message: 'Faculty updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete faculty
exports.deleteFaculty = async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM faculty_information WHERE id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    res.json({ success: true, message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
