/**
 * Registration Controller — Department and Faculty registration by Admin
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const emailService = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * POST /api/register/department
 * Admin registers a new department
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
      // Create HOD user account
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
      const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

      await db.query(
        `INSERT INTO users (name, email, role, department, department_id, password_reset_token, password_reset_expires) 
         VALUES (?, ?, 'hod', ?, ?, ?, ?)`,
        [hod_name || 'HOD', hod_email, name, departmentId, hashedToken, expires]
      );

      // Send password setup email
      const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
      try {
        await emailService.sendPasswordReset({
          to: hod_email,
          name: hod_name || 'HOD',
          resetUrl,
          role: 'HOD'
        });
      } catch (emailErr) {
        console.error('Email error:', emailErr);
      }
      console.log(`🔗 HOD password reset URL for ${hod_email}: ${resetUrl}`);
    } else {
      // Update existing user to have HOD role and link to department
      await db.query(
        'UPDATE users SET role = ?, department = ?, department_id = ? WHERE email = ?',
        ['hod', name, departmentId, hod_email]
      );
    }

    res.json({
      success: true,
      message: 'Department registered successfully. Password setup email sent to HOD.',
      department: { id: departmentId, name, code, hod_email, hod_name }
    });
  } catch (error) {
    console.error('Register department error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

/**
 * POST /api/register/faculty
 * Admin registers a new faculty member
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

    // Create reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours

    // Create user
    const [result] = await db.query(
      `INSERT INTO users (name, email, role, department, department_id, designation, salutation, employee_id, employment_type, date_of_joining, password_reset_token, password_reset_expires)
       VALUES (?, ?, 'faculty', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, email, deptName, department_id, designation, salutation, employee_id, employment_type, date_of_joining, hashedToken, expires]
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

    // Send password setup email
    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;
    try {
      await emailService.sendPasswordReset({
        to: email,
        name: name,
        resetUrl,
        role: 'Faculty'
      });
    } catch (emailErr) {
      console.error('Email error:', emailErr);
    }
    console.log(`🔗 Faculty password reset URL for ${email}: ${resetUrl}`);

    res.json({
      success: true,
      message: 'Faculty registered successfully. Password setup email sent.',
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
 * Admin: list all registered users
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
