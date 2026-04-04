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
 * Format: LNMIIT-XXXXXXXX (8 random alphanumeric chars)
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
 * Ensure onboarding_complete column exists (called at startup)
 */
exports.runMigrations = async () => {
  try {
    const [rows] = await db.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='onboarding_complete'"
    );
    if (rows.length === 0) {
      await db.query('ALTER TABLE users ADD COLUMN onboarding_complete TINYINT(1) NOT NULL DEFAULT 1');
      console.log('✅ Migration: added onboarding_complete column');
    } else {
      console.log('✅ Migration: onboarding_complete column already present');
    }
  } catch (err) {
    console.log('ℹ️  Migration note:', err.message);
  }
};

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
        `INSERT INTO users (name, email, password, role, department, department_id, onboarding_complete) 
         VALUES (?, ?, ?, 'hod', ?, ?, 1)`,
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

    // Create user — fully filled, so onboarding_complete = 1
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, department, department_id, designation, salutation, employee_id, employment_type, date_of_joining, onboarding_complete)
       VALUES (?, ?, ?, 'faculty', ?, ?, ?, ?, ?, ?, ?, 1)`,
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
 * POST /api/register/bulk-invite
 * DOFA sends invite emails to multiple faculty/HOD emails at once.
 * Body: { role: 'faculty'|'hod', emails: ['a@x.com', 'b@x.com', ...] }
 * 
 * Creates placeholder accounts (onboarding_complete = 0) and emails each person
 * their temp password. They complete profile info on first login.
 */
exports.bulkInvite = async (req, res) => {
  try {
    const { role, emails } = req.body;

    if (!role || !['faculty', 'hod'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be "faculty" or "hod"' });
    }
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one email is required' });
    }

    const results = [];

    for (const rawEmail of emails) {
      const email = rawEmail.trim().toLowerCase();
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        results.push({ email, status: 'invalid', message: 'Invalid email format' });
        continue;
      }

      // Check if already registered
      const [existing] = await db.query('SELECT id, role FROM users WHERE email = ?', [email]);
      if (existing.length > 0) {
        results.push({ email, status: 'skipped', message: 'Already registered' });
        continue;
      }

      try {
        const tempPassword = generateTempPassword();
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        // Create placeholder account — onboarding_complete = 0 so wizard is shown
        await db.query(
          `INSERT INTO users (name, email, password, role, onboarding_complete)
           VALUES (?, ?, ?, ?, 0)`,
          [email, email, hashedPassword, role]
        );

        // Send invitation email
        try {
          await emailService.sendTempPasswordEmail({
            to: email,
            name: email,
            tempPassword,
            role: role === 'hod' ? 'HOD' : 'Faculty',
            loginUrl: FRONTEND_URL
          });
          console.log(`📧 Bulk invite sent to ${email} (${role}) — temp: ${tempPassword}`);
          results.push({ email, status: 'sent', message: 'Invitation sent' });
        } catch (emailErr) {
          console.error(`Email error for ${email}:`, emailErr.message);
          console.log(`🔑 (console fallback) ${email} temp password: ${tempPassword}`);
          results.push({ email, status: 'sent_no_email', message: 'Account created; email delivery failed' });
        }
      } catch (dbErr) {
        console.error(`DB error for ${email}:`, dbErr.message);
        results.push({ email, status: 'error', message: 'Failed to create account' });
      }
    }

    const sent = results.filter(r => r.status === 'sent' || r.status === 'sent_no_email').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const failed = results.filter(r => r.status === 'error' || r.status === 'invalid').length;

    res.json({
      success: true,
      message: `Processed ${emails.length} emails: ${sent} sent, ${skipped} skipped, ${failed} failed.`,
      results
    });
  } catch (error) {
    console.error('Bulk invite error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

/**
 * PUT /api/register/onboarding
 * Faculty or HOD completes their profile on first login.
 * 
 * Faculty body: { salutation, name, designation, employee_id, employment_type, date_of_joining, department_id }
 * HOD body: { salutation, name, dept_name, dept_code }  ← creates department if needed
 */
exports.completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'faculty') {
      const { salutation, name, designation, employee_id, employment_type, date_of_joining, department_id } = req.body;

      if (!name || !department_id) {
        return res.status(400).json({ success: false, message: 'Name and department are required' });
      }

      // Get department name
      const [depts] = await db.query('SELECT name FROM departments WHERE id = ?', [department_id]);
      const deptName = depts.length > 0 ? depts[0].name : null;

      await db.query(
        `UPDATE users SET 
          name = ?, salutation = ?, designation = ?, employee_id = ?,
          employment_type = ?, date_of_joining = ?, department = ?, department_id = ?,
          onboarding_complete = 1
         WHERE id = ?`,
        [name, salutation, designation, employee_id, employment_type, date_of_joining, deptName, department_id, userId]
      );

      // Upsert faculty_information
      const [fi] = await db.query('SELECT id FROM faculty_information WHERE email = ?', [req.user.email]);
      if (fi.length === 0) {
        await db.query(
          `INSERT INTO faculty_information (name, email, department, designation, employee_id, date_of_joining) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [name, req.user.email, deptName, designation, employee_id, date_of_joining]
        );
      } else {
        await db.query(
          `UPDATE faculty_information SET name=?, department=?, designation=?, employee_id=?, date_of_joining=? WHERE email=?`,
          [name, deptName, designation, employee_id, date_of_joining, req.user.email]
        );
      }

      // Return updated user
      const [updated] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      return res.json({ success: true, message: 'Profile completed successfully!', user: updated[0] });

    } else if (userRole === 'hod') {
      const { salutation, name, dept_name, dept_code } = req.body;

      if (!name || !dept_name || !dept_code) {
        return res.status(400).json({ success: false, message: 'Name, department name, and department code are required' });
      }

      // Check if dept code is already taken (by a different dept)
      const [existingDept] = await db.query(
        'SELECT id FROM departments WHERE code = ? AND (hod_email != ? OR hod_email IS NULL)',
        [dept_code, req.user.email]
      );
      if (existingDept.length > 0) {
        return res.status(400).json({ success: false, message: 'Department code already in use' });
      }

      // Create or get existing department for this HOD
      const [myDept] = await db.query('SELECT id FROM departments WHERE hod_email = ?', [req.user.email]);
      let departmentId;

      if (myDept.length > 0) {
        departmentId = myDept[0].id;
        await db.query(
          'UPDATE departments SET name = ?, code = ?, hod_name = ? WHERE id = ?',
          [dept_name, dept_code, name, departmentId]
        );
      } else {
        const [deptResult] = await db.query(
          'INSERT INTO departments (name, code, hod_email, hod_name) VALUES (?, ?, ?, ?)',
          [dept_name, dept_code, req.user.email, name]
        );
        departmentId = deptResult.insertId;
      }

      await db.query(
        `UPDATE users SET 
          name = ?, salutation = ?, department = ?, department_id = ?,
          onboarding_complete = 1
         WHERE id = ?`,
        [name, salutation, dept_name, departmentId, userId]
      );

      const [updated] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
      return res.json({ success: true, message: 'Profile completed successfully!', user: updated[0] });

    } else {
      return res.status(400).json({ success: false, message: 'Onboarding not applicable for this role' });
    }
  } catch (error) {
    console.error('Complete onboarding error:', error);
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
      SELECT u.id, u.name, u.email, u.role, u.department, u.designation, u.salutation, u.employee_id, u.employment_type, u.date_of_joining, u.created_at, u.onboarding_complete,
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
