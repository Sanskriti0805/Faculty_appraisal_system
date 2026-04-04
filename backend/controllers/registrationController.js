/**
 * Registration Controller — Department and Faculty registration by DOFA
 * Sends temp password via email (LNMIIT template)
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const emailService = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Generate a readable temporary password
 * Format: LNMIIT-XXXXXX (6 random alphanumeric chars)
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = 'LNMIIT-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * POST /api/register/department
 * DOFA registers a new department + HOD
 * Body: { name, code, hod_email, hod_name }
 */
exports.registerDepartment = async (req, res) => {
  try {
    const { name, code, hod_email, hod_name } = req.body;

    if (!name || !code || !hod_email) {
      return res.status(400).json({ success: false, message: 'Department name, code, and HOD email are required' });
    }

    // Check if code already exists
    const [existing] = await db.query('SELECT id FROM departments WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Department code already exists' });
    }

    // Create department
    const [deptResult] = await db.query(
      'INSERT INTO departments (name, code, hod_email, hod_name) VALUES (?, ?, ?, ?)',
      [name, code, hod_email, hod_name || '']
    );

    const departmentId = deptResult.insertId;

    // Check if HOD user already exists
    const [existingHod] = await db.query('SELECT id FROM users WHERE email = ?', [hod_email]);

    if (existingHod.length === 0) {
      // Generate temp password
      const tempPassword = generateTempPassword();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      await db.query(
        `INSERT INTO users (name, email, password, role, department, department_id) 
         VALUES (?, ?, ?, 'hod', ?, ?)`,
        [hod_name || 'HOD', hod_email, hashedPassword, name, departmentId]
      );

      // Send temp password email
      try {
        await emailService.sendTempPasswordEmail({
          to: hod_email,
          name: hod_name || 'HOD',
          tempPassword,
          role: 'HOD',
          loginUrl: FRONTEND_URL
        });
      } catch (emailErr) {
        console.error('Email error:', emailErr);
      }
      console.log(`🔑 HOD temp password for ${hod_email}: ${tempPassword}`);
    } else {
      // Update existing user to have HOD role and link to department
      await db.query(
        'UPDATE users SET role = ?, department = ?, department_id = ? WHERE email = ?',
        ['hod', name, departmentId, hod_email]
      );
    }

    res.json({
      success: true,
      message: 'Department registered successfully. Temporary password email sent to HOD.',
      department: { id: departmentId, name, code, hod_email, hod_name }
    });
  } catch (error) {
    console.error('Register department error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

/**
 * POST /api/register/faculty
 * DOFA registers a new faculty member
 * Body: { salutation, name, designation, email, employee_id, employment_type, date_of_joining, department_id }
 */
exports.registerFaculty = async (req, res) => {
  try {
    const { salutation, name, designation, email, employee_id, employment_type, date_of_joining, department_id } = req.body;

    if (!name || !email || !department_id) {
      return res.status(400).json({ success: false, message: 'Name, email, and department are required' });
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Get department name
    const [depts] = await db.query('SELECT name FROM departments WHERE id = ?', [department_id]);
    const deptName = depts.length > 0 ? depts[0].name : null;

    // Generate temp password
    const tempPassword = generateTempPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user with temp password (no reset token needed)
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, department, department_id, designation, salutation, employee_id, employment_type, date_of_joining)
       VALUES (?, ?, ?, 'faculty', ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, hashedPassword, deptName, department_id, designation, salutation, employee_id, employment_type, date_of_joining]
    );

    // Also create a record in faculty_information table if it doesn't exist
    const [existingFI] = await db.query('SELECT id FROM faculty_information WHERE email = ?', [email]);
    if (existingFI.length === 0) {
      await db.query(
        `INSERT INTO faculty_information (name, email, department, designation, employee_id, date_of_joining) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, deptName, designation, employee_id, date_of_joining]
      );
    }

    // Send temp password email
    try {
      await emailService.sendTempPasswordEmail({
        to: email,
        name: name,
        tempPassword,
        role: 'Faculty',
        loginUrl: FRONTEND_URL
      });
    } catch (emailErr) {
      console.error('Email error:', emailErr);
    }
    console.log(`🔑 Faculty temp password for ${email}: ${tempPassword}`);

    res.json({
      success: true,
      message: 'Faculty registered successfully. Temporary password email sent.',
      faculty: { id: result.insertId, name, email, designation, department: deptName }
    });
  } catch (error) {
    console.error('Register faculty error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

/**
 * GET /api/departments
 * List all departments
 */
exports.getDepartments = async (req, res) => {
  try {
    const [departments] = await db.query(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'faculty') as faculty_count
      FROM departments d 
      ORDER BY d.name
    `);
    res.json({ success: true, data: departments });
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/departments/:id/faculty
 * List faculty in a department (for HOD dashboard)
 */
exports.getDepartmentFaculty = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [faculty] = await db.query(`
      SELECT id, name, email, designation, salutation, employee_id, employment_type, date_of_joining, created_at 
      FROM users 
      WHERE department_id = ? AND role = 'faculty'
      ORDER BY name
    `, [id]);

    res.json({ success: true, data: faculty });
  } catch (error) {
    console.error('Get dept faculty error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/register/users
 * DOFA: list all registered users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.department, u.designation, u.salutation, u.employee_id, u.employment_type, u.date_of_joining, u.created_at,
        d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
