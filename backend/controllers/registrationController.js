/**
 * Registration Controller - Department and Faculty registration by Dofa
 * Sends temp password via email (LNMIIT template)
 */
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/database');
const emailService = require('../services/emailService');
const XLSX = require('xlsx');

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
    const ensureColumn = async (table, column, definition) => {
      const [rows] = await db.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,
        [table, column]
      );
      if (rows.length === 0) {
        await db.query(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
        console.log(`Migration: added ${table}.${column}`);
      }
    };

    const ensureEmploymentTypeEnum = async () => {
      const [rows] = await db.query(
        `SELECT COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employment_type'
         LIMIT 1`
      );

      if (rows.length === 0) {
        await db.query("ALTER TABLE users ADD COLUMN employment_type ENUM('regular','contractual') NULL DEFAULT NULL");
        console.log('Migration: added users.employment_type as regular/contractual enum');
        return;
      }

      const currentColumnType = String(rows[0].COLUMN_TYPE || '').toLowerCase();
      const isNullable = String(rows[0].IS_NULLABLE || '').toUpperCase() === 'YES';
      const defaultValueRaw = rows[0].COLUMN_DEFAULT;

      if (currentColumnType.includes("enum('fixed','contractual')") || currentColumnType.includes("enum('contractual','fixed')")) {
        const defaultWidened = (() => {
          if (defaultValueRaw === null || defaultValueRaw === undefined) return isNullable ? 'DEFAULT NULL' : "DEFAULT 'fixed'";
          const lowered = String(defaultValueRaw).trim().toLowerCase();
          if (lowered === 'fixed' || lowered === 'regular') return "DEFAULT 'fixed'";
          if (lowered === 'contractual') return "DEFAULT 'contractual'";
          return isNullable ? 'DEFAULT NULL' : "DEFAULT 'fixed'";
        })();
        const nullWidened = isNullable ? 'NULL' : 'NOT NULL';
        await db.query(`ALTER TABLE users MODIFY COLUMN employment_type ENUM('fixed','regular','contractual') ${nullWidened} ${defaultWidened}`);
      }

      await db.query(
        `UPDATE users
         SET employment_type = CASE
           WHEN employment_type IS NULL OR TRIM(employment_type) = '' THEN NULL
           WHEN LOWER(TRIM(employment_type)) IN ('fixed', 'regular') THEN 'regular'
           WHEN LOWER(TRIM(employment_type)) IN ('contractual', 'contract') THEN 'contractual'
           ELSE NULL
         END`
      );

      const normalizedDefault = (() => {
        if (defaultValueRaw === null || defaultValueRaw === undefined) return null;
        const lowered = String(defaultValueRaw).trim().toLowerCase();
        if (lowered === 'fixed' || lowered === 'regular') return 'regular';
        if (lowered === 'contractual') return 'contractual';
        return null;
      })();

      const nullSql = isNullable ? 'NULL' : 'NOT NULL';
      const defaultSql = normalizedDefault
        ? `DEFAULT '${normalizedDefault}'`
        : (isNullable ? 'DEFAULT NULL' : "DEFAULT 'regular'");

      if (currentColumnType !== "enum('regular','contractual')") {
        await db.query(`ALTER TABLE users MODIFY COLUMN employment_type ENUM('regular','contractual') ${nullSql} ${defaultSql}`);
        console.log('Migration: normalized users.employment_type enum to regular/contractual');
      }
    };

    await ensureColumn('users', 'onboarding_complete', 'onboarding_complete TINYINT(1) NOT NULL DEFAULT 1');
    await ensureEmploymentTypeEnum();
    await ensureColumn('users', 'is_archived', 'is_archived TINYINT(1) NOT NULL DEFAULT 0');
    await ensureColumn('users', 'archived_at', 'archived_at TIMESTAMP NULL DEFAULT NULL');
    await ensureColumn('users', 'archived_by', 'archived_by INT NULL DEFAULT NULL');
    await ensureColumn('users', 'archive_reason', 'archive_reason VARCHAR(255) NULL DEFAULT NULL');

    await ensureColumn('departments', 'is_archived', 'is_archived TINYINT(1) NOT NULL DEFAULT 0');
    await ensureColumn('departments', 'archived_at', 'archived_at TIMESTAMP NULL DEFAULT NULL');
    await ensureColumn('departments', 'archived_by', 'archived_by INT NULL DEFAULT NULL');
    await ensureColumn('departments', 'archive_reason', 'archive_reason VARCHAR(255) NULL DEFAULT NULL');

    // Ensure legacy appraisal tables have workflow columns expected by controllers.
    await ensureColumn('courses_taught', 'percentage', 'percentage VARCHAR(20) NULL');
    await ensureColumn('courses_taught', 'remarks', 'remarks TEXT NULL');
    await ensureColumn('courses_taught', 'evidence_file', 'evidence_file VARCHAR(255) NULL');
    await ensureColumn('courses_taught', 'project_title', 'project_title VARCHAR(500) NULL');
    await ensureColumn('courses_taught', 'project_type', 'project_type VARCHAR(100) NULL');
    await ensureColumn('courses_taught', 'project_role', 'project_role VARCHAR(100) NULL');
    await ensureColumn('courses_taught', 'student_name', 'student_name VARCHAR(255) NULL');
    await ensureColumn('courses_taught', 'project_duration', 'project_duration VARCHAR(100) NULL');
    await ensureColumn('courses_taught', 'project_outcome', 'project_outcome TEXT NULL');
    await ensureColumn('courses_taught', 'status', "status ENUM('draft','submitted') DEFAULT 'draft'");
    await ensureColumn('courses_taught', 'feedback_score', 'feedback_score DECIMAL(5,3) NULL');
    await ensureColumn('new_courses', 'status', "status ENUM('draft','submitted') DEFAULT 'draft'");

    // Ensure research_publications has evidence_file and status columns
    await ensureColumn('research_publications', 'evidence_file', "evidence_file VARCHAR(255) NULL COMMENT 'Path to uploaded evidence file'");
    await ensureColumn('research_publications', 'status', "status ENUM('draft','submitted') DEFAULT 'draft'");

    // Ensure evidence/certificate upload columns exist for legacy activity tables.
    await ensureColumn('research_grants', 'evidence_file', 'evidence_file VARCHAR(255) NULL');
    await ensureColumn('submitted_proposals', 'evidence_file', 'evidence_file VARCHAR(255) NULL');
    await ensureColumn('technology_transfer', 'evidence_file', "evidence_file VARCHAR(255) NULL COMMENT 'Path to uploaded evidence file'");
    await ensureColumn('paper_reviews', 'evidence_file', 'evidence_file VARCHAR(255) NULL');
    await ensureColumn('conference_sessions', 'evidence_file', 'evidence_file VARCHAR(255) NULL');
    await ensureColumn('keynotes_talks', 'evidence_file', 'evidence_file VARCHAR(255) NULL');
    await ensureColumn('awards_honours', 'evidence_file', 'evidence_file VARCHAR(255) NULL');
    await ensureColumn('patents', 'certificate_file', 'certificate_file VARCHAR(255) NULL');
    await ensureColumn('consultancy', 'evidence_file', 'evidence_file VARCHAR(255) NULL');

    // Paper review entries now store Tier 1 / Tier 2 explicitly.
    await ensureColumn('paper_reviews', 'tier', 'tier VARCHAR(50) NULL AFTER review_type');
    await ensureColumn('paper_reviews', 'evidence_file', 'evidence_file VARCHAR(255) NULL AFTER month_of_review');

    // Form builder v2 columns
    await ensureColumn('dynamic_sections', 'parent_id', 'parent_id INT NULL');
    await ensureColumn('dynamic_sections', 'description', 'description TEXT NULL');

    // Rule-driven rubric columns
    await ensureColumn('Dofa_rubrics', 'scoring_type', "scoring_type VARCHAR(20) NOT NULL DEFAULT 'manual'");
    await ensureColumn('Dofa_rubrics', 'per_unit_marks', 'per_unit_marks DECIMAL(10,2) NULL');
    await ensureColumn('Dofa_rubrics', 'dynamic_section_id', 'dynamic_section_id INT NULL');
    await ensureColumn('Dofa_rubrics', 'data_source', 'data_source VARCHAR(64) NULL');
    await ensureColumn('Dofa_rubrics', 'rule_config', 'rule_config JSON NULL');

    // Session finalization controls for year-level lock/unlock.
    await ensureColumn('appraisal_sessions', 'final_locked', 'final_locked TINYINT(1) NOT NULL DEFAULT 0');
    await ensureColumn('appraisal_sessions', 'final_locked_at', 'final_locked_at TIMESTAMP NULL DEFAULT NULL');
    await ensureColumn('appraisal_sessions', 'final_locked_by', 'final_locked_by INT NULL DEFAULT NULL');

    // Ensure workflow tables used by edit-request and lock guards exist.
    await db.query(`
      CREATE TABLE IF NOT EXISTS edit_requests (
        id INT NOT NULL AUTO_INCREMENT,
        submission_id INT NOT NULL,
        faculty_id INT NOT NULL,
        requested_sections JSON NOT NULL,
        request_message TEXT DEFAULT NULL,
        status ENUM('pending','approved','denied') DEFAULT 'pending',
        approved_sections JSON DEFAULT NULL,
        reviewed_by INT DEFAULT NULL,
        reviewed_at TIMESTAMP NULL DEFAULT NULL,
        Dofa_note TEXT DEFAULT NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY submission_id (submission_id),
        KEY faculty_id (faculty_id),
        KEY reviewed_by (reviewed_by),
        CONSTRAINT edit_requests_ibfk_1 FOREIGN KEY (submission_id) REFERENCES submissions (id) ON DELETE CASCADE,
        CONSTRAINT edit_requests_ibfk_2 FOREIGN KEY (faculty_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT edit_requests_ibfk_3 FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS submission_locks (
        id INT PRIMARY KEY AUTO_INCREMENT,
        submission_id INT NOT NULL,
        locked_by INT DEFAULT NULL,
        locked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unlocked_at TIMESTAMP NULL,
        is_locked BOOLEAN DEFAULT TRUE,
        FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
        FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    console.log('Migration: archive columns ensured');
  } catch (err) {
    console.log('Migration note:', err.message);
  }
};

const getBoolean = (value) => {
  if (value === true || value === 1 || value === '1' || value === 'true') return 1;
  return 0;
};

const normalizeOptionalDate = (value) => {
  if (value === null || value === undefined || value === '') return null;

  // Keep canonical YYYY-MM-DD values untouched.
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    return String(value);
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const normalizeEmploymentType = (value) => {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return null;

  if (raw === 'regular' || raw === 'contractual') return raw;
  if (raw === 'contract' || raw === 'contractual faculty') return 'contractual';
  if (raw === 'fixed') return 'regular';

  return null;
};

const resolveHodDepartmentContext = async (user) => {
  const deptId = Number(user?.department_id || 0);
  const deptName = String(user?.department || '').trim();

  if (deptId <= 0 && !deptName) return null;

  if (deptId > 0) {
    const [byIdRows] = await db.query('SELECT id, name FROM departments WHERE id = ? LIMIT 1', [deptId]);
    if (byIdRows.length > 0) {
      return {
        id: Number(byIdRows[0].id),
        name: byIdRows[0].name,
        nameNorm: String(byIdRows[0].name || '').trim().toLowerCase()
      };
    }
  }

  if (!deptName) return null;

  const [rows] = await db.query(
    `SELECT id, name
     FROM departments
     WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))
     ORDER BY id ASC`,
    [deptName]
  );

  // Name-only fallback must resolve to exactly one department.
  if (rows.length !== 1) return null;

  return {
    id: Number(rows[0].id),
    name: rows[0].name,
    nameNorm: String(rows[0].name || '').trim().toLowerCase()
  };
};

const toSafeCsv = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/"/g, '""');
};

const buildCsv = (headers, rows) => {
  const head = headers.join(',');
  const body = rows
    .map(row => headers.map(h => `"${toSafeCsv(row[h])}"`).join(','))
    .join('\n');
  return `${head}\n${body}`;
};

const tablePresenceCache = new Map();

const hasTable = async (tableName) => {
  if (tablePresenceCache.has(tableName)) {
    return tablePresenceCache.get(tableName);
  }

  const [rows] = await db.query(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    [tableName]
  );
  const exists = rows.length > 0;
  tablePresenceCache.set(tableName, exists);
  return exists;
};

/**
 * POST /api/register/department
 * Dofa registers a new department + HOD
 * Body: { name, code, hod_email, hod_name }
 */
exports.registerDepartment = async (req, res) => {
  try {
    const { name, code, hod_email, hod_name } = req.body;
    const normalizedName = String(name || '').trim();
    const normalizedCode = String(code || '').trim().toUpperCase();

    if (!normalizedName || !normalizedCode || !hod_email) {
      return res.status(400).json({ success: false, message: 'Department name, code, and HOD email are required' });
    }

    // Check if code already exists
    const [existing] = await db.query('SELECT id FROM departments WHERE UPPER(TRIM(code)) = ?', [normalizedCode]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Department code already exists' });
    }

    // Check if name already exists (case-insensitive)
    const [existingByName] = await db.query(
      'SELECT id, code FROM departments WHERE LOWER(TRIM(name)) = LOWER(TRIM(?)) LIMIT 1',
      [normalizedName]
    );
    if (existingByName.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Department name already exists (code: ${existingByName[0].code}). Use a unique department name.`
      });
    }

    // Create department
    const [deptResult] = await db.query(
      'INSERT INTO departments (name, code, hod_email, hod_name) VALUES (?, ?, ?, ?)',
      [normalizedName, normalizedCode, hod_email, hod_name || '']
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
        [hod_name || 'HOD', hod_email, hashedPassword, normalizedName, departmentId]
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
      console.log(`HOD temp password for ${hod_email}: ${tempPassword}`);
    } else {
      // Update existing user to have HOD role and link to department
      await db.query(
        'UPDATE users SET role = ?, department = ?, department_id = ? WHERE email = ?',
        ['hod', normalizedName, departmentId, hod_email]
      );
    }

    res.json({
      success: true,
      message: 'Department registered successfully. Temporary password email sent to HOD.',
      department: { id: departmentId, name: normalizedName, code: normalizedCode, hod_email, hod_name }
    });
  } catch (error) {
    console.error('Register department error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
};

/**
 * POST /api/register/faculty
 * Dofa registers a new faculty member
 * Body: { salutation, name, designation, email, employee_id, employment_type, date_of_joining, department_id }
 */
exports.registerFaculty = async (req, res) => {
  try {
    const { salutation, name, designation, email, employee_id, employment_type, date_of_joining, department_id } = req.body;
    const normalizedDateOfJoining = normalizeOptionalDate(date_of_joining);
    const normalizedEmploymentType = normalizeEmploymentType(employment_type);

    if (!name || !email || !department_id || !normalizedDateOfJoining) {
      return res.status(400).json({ success: false, message: 'Name, email, date of joining, and department are required' });
    }

    if (employment_type !== undefined && employment_type !== null && employment_type !== '' && !normalizedEmploymentType) {
      return res.status(400).json({ success: false, message: 'Employment type must be Regular or Contractual.' });
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

    // Create user - fully filled, so onboarding_complete = 1
    const [result] = await db.query(
      `INSERT INTO users (name, email, password, role, department, department_id, designation, salutation, employee_id, employment_type, date_of_joining, onboarding_complete)
       VALUES (?, ?, ?, 'faculty', ?, ?, ?, ?, ?, ?, ?, 1)`,
      [name, email, hashedPassword, deptName, department_id, designation, salutation, employee_id, normalizedEmploymentType, normalizedDateOfJoining]
    );

    // Also create a record in faculty_information table if it doesn't exist
    const [existingFI] = await db.query('SELECT id FROM faculty_information WHERE email = ?', [email]);
    if (existingFI.length === 0) {
      await db.query(
        `INSERT INTO faculty_information (name, email, department, designation, employee_id, date_of_joining) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, deptName, designation, employee_id, normalizedDateOfJoining]
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
    console.log(`Faculty temp password for ${email}: ${tempPassword}`);

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
 * Dofa sends invite emails to multiple faculty/HOD emails at once.
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

        // Create placeholder account - onboarding_complete = 0 so wizard is shown
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
          console.log(`Bulk invite sent to ${email} (${role}) - temp: ${tempPassword}`);
          results.push({ email, status: 'sent', message: 'Invitation sent' });
        } catch (emailErr) {
          console.error(`Email error for ${email}:`, emailErr.message);
          console.log(`(console fallback) ${email} temp password: ${tempPassword}`);
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
 * HOD body: { salutation, name, dept_name, dept_code }  -> creates department if needed
 */
exports.completeOnboarding = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (userRole === 'faculty') {
      const { salutation, name, designation, employee_id, employment_type, date_of_joining, department_id } = req.body;
      const normalizedDateOfJoining = normalizeOptionalDate(date_of_joining);
      const normalizedEmploymentType = normalizeEmploymentType(employment_type);

      if (!name || !department_id) {
        return res.status(400).json({ success: false, message: 'Name and department are required' });
      }

      if (employment_type !== undefined && employment_type !== null && employment_type !== '' && !normalizedEmploymentType) {
        return res.status(400).json({ success: false, message: 'Employment type must be Regular or Contractual.' });
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
        [name, salutation, designation, employee_id, normalizedEmploymentType, normalizedDateOfJoining, deptName, department_id, userId]
      );

      // Upsert faculty_information
      const [fi] = await db.query('SELECT id FROM faculty_information WHERE email = ?', [req.user.email]);
      if (fi.length === 0) {
        await db.query(
          `INSERT INTO faculty_information (name, email, department, designation, employee_id, date_of_joining) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [name, req.user.email, deptName, designation, employee_id, normalizedDateOfJoining]
        );
      } else {
        await db.query(
          `UPDATE faculty_information SET name=?, department=?, designation=?, employee_id=?, date_of_joining=? WHERE email=?`,
          [name, deptName, designation, employee_id, normalizedDateOfJoining, req.user.email]
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
    const includeArchived = getBoolean(req.query.include_archived);
    const [departments] = await db.query(`
      SELECT d.*, 
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'faculty' AND COALESCE(u.is_archived, 0) = 0) as faculty_count
      FROM departments d 
      WHERE COALESCE(d.is_archived, 0) = ?
      ORDER BY d.name
    `, [includeArchived]);
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
    const includeArchived = getBoolean(req.query.include_archived);
    let targetDepartmentId = Number(id);
    let targetDepartmentName = null;

    if (req.user.role === 'hod') {
      const hodDept = await resolveHodDepartmentContext(req.user);
      if (!hodDept) {
        return res.status(403).json({ success: false, message: 'HOD department mapping is missing' });
      }
      if (targetDepartmentId > 0 && targetDepartmentId !== hodDept.id) {
        return res.status(403).json({ success: false, message: 'HOD can only view faculty from own department' });
      }
      targetDepartmentId = hodDept.id;
      targetDepartmentName = hodDept.name;
    }

    if (!targetDepartmentId || Number.isNaN(targetDepartmentId)) {
      return res.status(400).json({ success: false, message: 'Valid department id is required' });
    }

    if (!targetDepartmentName) {
      const [depts] = await db.query('SELECT name FROM departments WHERE id = ?', [targetDepartmentId]);
      targetDepartmentName = depts.length > 0 ? depts[0].name : null;
    }

    const [faculty] = await db.query(`
      SELECT u.id, u.name, u.email, u.designation, u.salutation, u.employee_id, u.employment_type,
             COALESCE(u.date_of_joining,
               (
                 SELECT fi.date_of_joining
                 FROM faculty_information fi
                 WHERE fi.email = u.email
                 ORDER BY fi.id DESC
                 LIMIT 1
               ),
               DATE(u.created_at)
             ) AS date_of_joining,
             u.created_at, u.archived_at, u.archived_by, u.archive_reason
      FROM users u
      WHERE u.role = 'faculty' AND COALESCE(u.is_archived, 0) = ?
        AND (
          u.department_id = ?
          OR (u.department_id IS NULL AND ? <> '' AND LOWER(TRIM(u.department)) = LOWER(TRIM(?)))
        )
      ORDER BY u.name
    `, [includeArchived, targetDepartmentId, targetDepartmentName || '', targetDepartmentName || '']);

    res.json({ success: true, data: faculty });
  } catch (error) {
    console.error('Get dept faculty error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/register/users
 * Dofa: list all registered users
 */
exports.getAllUsers = async (req, res) => {
  try {
    const includeArchived = getBoolean(req.query.include_archived);
    const [users] = await db.query(`
      SELECT u.id, u.name, u.email, u.role, u.department, u.designation, u.salutation, u.employee_id, u.employment_type,
        COALESCE(u.date_of_joining,
          (
            SELECT fi.date_of_joining
            FROM faculty_information fi
            WHERE fi.email = u.email
            ORDER BY fi.id DESC
            LIMIT 1
          ),
          DATE(u.created_at)
        ) AS date_of_joining,
        u.created_at, u.onboarding_complete,
        u.archived_at, u.archived_by, u.archive_reason,
        d.name as department_name, d.code as department_code
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE COALESCE(u.is_archived, 0) = ?
      ORDER BY u.created_at DESC
    `, [includeArchived]);
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.softDeleteFaculty = async (req, res) => {
  try {
    const facultyId = Number(req.params.id);
    const { reason } = req.body || {};

    const [rows] = await db.query(
      'SELECT id, role, department, department_id, is_archived FROM users WHERE id = ? AND role = "faculty"',
      [facultyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const faculty = rows[0];
    if (Number(faculty.is_archived) === 1) {
      return res.status(400).json({ success: false, message: 'Faculty is already archived' });
    }

    if (req.user.role === 'hod') {
      const hodDept = await resolveHodDepartmentContext(req.user);
      if (!hodDept) {
        return res.status(403).json({ success: false, message: 'HOD department mapping is missing' });
      }

      const facultyDeptId = Number(faculty.department_id || 0);
      const sameDeptById = facultyDeptId > 0 && facultyDeptId === hodDept.id;
      const sameDeptByName = facultyDeptId <= 0
        && String(faculty.department || '').trim().toLowerCase() === hodDept.nameNorm;

      if (!sameDeptById && !sameDeptByName) {
        return res.status(403).json({ success: false, message: 'HOD can only archive faculty from own department' });
      }
    }

    await db.query(
      'UPDATE users SET is_archived = 1, archived_at = CURRENT_TIMESTAMP, archived_by = ?, archive_reason = ? WHERE id = ?',
      [req.user.id, reason || null, facultyId]
    );

    res.json({ success: true, message: 'Faculty archived successfully' });
  } catch (error) {
    console.error('Soft delete faculty error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.restoreFaculty = async (req, res) => {
  try {
    const facultyId = Number(req.params.id);

    const [rows] = await db.query(
      'SELECT id, role, department, department_id, is_archived FROM users WHERE id = ? AND role = "faculty"',
      [facultyId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }

    const faculty = rows[0];
    if (Number(faculty.is_archived) === 0) {
      return res.status(400).json({ success: false, message: 'Faculty is already active' });
    }

    if (req.user.role === 'hod') {
      const hodDept = await resolveHodDepartmentContext(req.user);
      if (!hodDept) {
        return res.status(403).json({ success: false, message: 'HOD department mapping is missing' });
      }

      const facultyDeptId = Number(faculty.department_id || 0);
      const sameDeptById = facultyDeptId > 0 && facultyDeptId === hodDept.id;
      const sameDeptByName = facultyDeptId <= 0
        && String(faculty.department || '').trim().toLowerCase() === hodDept.nameNorm;

      if (!sameDeptById && !sameDeptByName) {
        return res.status(403).json({ success: false, message: 'HOD can only restore faculty from own department' });
      }
    }

    await db.query(
      'UPDATE users SET is_archived = 0, archived_at = NULL, archived_by = NULL, archive_reason = NULL WHERE id = ?',
      [facultyId]
    );

    res.json({ success: true, message: 'Faculty restored successfully' });
  } catch (error) {
    console.error('Restore faculty error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.softDeleteDepartment = async (req, res) => {
  try {
    const departmentId = Number(req.params.id);
    const { reason } = req.body || {};

    const [rows] = await db.query('SELECT id, is_archived FROM departments WHERE id = ?', [departmentId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    if (Number(rows[0].is_archived) === 1) {
      return res.status(400).json({ success: false, message: 'Department is already archived' });
    }

    await db.query(
      'UPDATE departments SET is_archived = 1, archived_at = CURRENT_TIMESTAMP, archived_by = ?, archive_reason = ? WHERE id = ?',
      [req.user.id, reason || null, departmentId]
    );

    await db.query(
      'UPDATE users SET is_archived = 1, archived_at = CURRENT_TIMESTAMP, archived_by = ?, archive_reason = COALESCE(archive_reason, ?) WHERE department_id = ? AND role = \"faculty\" AND COALESCE(is_archived, 0) = 0',
      [req.user.id, 'Archived via department archival', departmentId]
    );

    res.json({ success: true, message: 'Department archived successfully' });
  } catch (error) {
    console.error('Soft delete department error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.restoreDepartment = async (req, res) => {
  try {
    const departmentId = Number(req.params.id);

    const [rows] = await db.query('SELECT id, is_archived FROM departments WHERE id = ?', [departmentId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }
    if (Number(rows[0].is_archived) === 0) {
      return res.status(400).json({ success: false, message: 'Department is already active' });
    }

    await db.query(
      'UPDATE departments SET is_archived = 0, archived_at = NULL, archived_by = NULL, archive_reason = NULL WHERE id = ?',
      [departmentId]
    );

    await db.query(
      'UPDATE users SET is_archived = 0, archived_at = NULL, archived_by = NULL, archive_reason = NULL WHERE department_id = ? AND role = \"faculty\"',
      [departmentId]
    );

    res.json({ success: true, message: 'Department restored successfully' });
  } catch (error) {
    console.error('Restore department error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getArchiveData = async (req, res) => {
  try {
    const isHod = req.user.role === 'hod';
    const params = [];
    let facultyWhere = 'WHERE u.role = \"faculty\" AND COALESCE(u.is_archived, 0) = 1';

    if (isHod) {
      const hodDept = await resolveHodDepartmentContext(req.user);
      if (!hodDept) {
        return res.status(403).json({ success: false, message: 'HOD department mapping is missing' });
      }

      facultyWhere += ' AND (u.department_id = ? OR (u.department_id IS NULL AND ? <> "" AND LOWER(TRIM(u.department)) = LOWER(TRIM(?))))';
      params.push(hodDept.id, hodDept.name, hodDept.name);
    }

    const [facultyRows] = await db.query(`
      SELECT u.id, u.name, u.email, u.department, u.department_id, u.designation, u.employee_id,
             u.archived_at, u.archive_reason,
             d.name AS department_name
      FROM users u
      LEFT JOIN departments d ON d.id = u.department_id
      ${facultyWhere}
      ORDER BY u.archived_at DESC
    `, params);

    let departmentRows = [];
    if (!isHod) {
      const [depts] = await db.query(`
        SELECT d.id, d.name, d.code, d.hod_name, d.hod_email, d.archived_at, d.archive_reason,
               (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.role = 'faculty') AS faculty_count
        FROM departments d
        WHERE COALESCE(d.is_archived, 0) = 1
        ORDER BY d.archived_at DESC
      `);
      departmentRows = depts;
    }

    res.json({ success: true, data: { faculty: facultyRows, departments: departmentRows } });
  } catch (error) {
    console.error('Get archive data error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.exportArchiveData = async (req, res) => {
  try {
    const { type = 'faculty', format = 'csv' } = req.query;
    const isHod = req.user.role === 'hod';
    const submissionsExists = await hasTable('submissions');

    if (!['faculty', 'department'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid export type' });
    }
    if (!['csv', 'xlsx'].includes(format)) {
      return res.status(400).json({ success: false, message: 'Invalid export format' });
    }
    if (isHod && type === 'department') {
      return res.status(403).json({ success: false, message: 'HOD can only export faculty archive data' });
    }

    let rows = [];
    if (type === 'faculty') {
      const params = [];
      let where = 'WHERE u.role = \"faculty\" AND COALESCE(u.is_archived, 0) = 1';
      if (isHod) {
        const hodDept = await resolveHodDepartmentContext(req.user);
        if (!hodDept) {
          return res.status(403).json({ success: false, message: 'HOD department mapping is missing' });
        }

        where += ' AND (u.department_id = ? OR (u.department_id IS NULL AND ? <> "" AND LOWER(TRIM(u.department)) = LOWER(TRIM(?))))';
        params.push(hodDept.id, hodDept.name, hodDept.name);
      }

      if (submissionsExists) {
        const [dataRows] = await db.query(`
          SELECT u.id, u.name, u.email, COALESCE(d.name, u.department) AS department,
                 u.designation, u.employee_id, u.archived_at,
                 s.academic_year,
                 YEAR(s.created_at) AS calendar_year,
                 s.status AS submission_status
          FROM users u
          LEFT JOIN departments d ON d.id = u.department_id
          LEFT JOIN submissions s ON s.faculty_id = u.id
          ${where}
          ORDER BY u.archived_at DESC, s.academic_year DESC
        `, params);
        rows = dataRows;
      } else {
        const [dataRows] = await db.query(`
          SELECT u.id, u.name, u.email, COALESCE(d.name, u.department) AS department,
                 u.designation, u.employee_id, u.archived_at,
                 NULL AS academic_year,
                 NULL AS calendar_year,
                 NULL AS submission_status
          FROM users u
          LEFT JOIN departments d ON d.id = u.department_id
          ${where}
          ORDER BY u.archived_at DESC
        `, params);
        rows = dataRows;
      }
    } else {
      if (submissionsExists) {
        const [dataRows] = await db.query(`
          SELECT d.id, d.name, d.code, d.hod_name, d.hod_email, d.archived_at,
                 COUNT(DISTINCT u.id) AS faculty_count,
                 s.academic_year,
                 YEAR(s.created_at) AS calendar_year,
                 COUNT(s.id) AS submission_count
          FROM departments d
          LEFT JOIN users u ON u.department_id = d.id AND u.role = 'faculty'
          LEFT JOIN submissions s ON s.faculty_id = u.id
          WHERE COALESCE(d.is_archived, 0) = 1
          GROUP BY d.id, d.name, d.code, d.hod_name, d.hod_email, d.archived_at, s.academic_year, YEAR(s.created_at)
          ORDER BY d.archived_at DESC
        `);
        rows = dataRows;
      } else {
        const [dataRows] = await db.query(`
          SELECT d.id, d.name, d.code, d.hod_name, d.hod_email, d.archived_at,
                 COUNT(DISTINCT u.id) AS faculty_count,
                 NULL AS academic_year,
                 NULL AS calendar_year,
                 0 AS submission_count
          FROM departments d
          LEFT JOIN users u ON u.department_id = d.id AND u.role = 'faculty'
          WHERE COALESCE(d.is_archived, 0) = 1
          GROUP BY d.id, d.name, d.code, d.hod_name, d.hod_email, d.archived_at
          ORDER BY d.archived_at DESC
        `);
        rows = dataRows;
      }
    }

    const stamp = new Date().toISOString().slice(0, 10);
    const baseName = `${type}_archive_${stamp}`;

    if (format === 'csv') {
      const headers = rows.length > 0 ? Object.keys(rows[0]) : ['id', 'name'];
      const csv = buildCsv(headers, rows);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${baseName}.csv"`);
      return res.send(csv);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, `${type}_archive`);
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Export archive data error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFacultySubmissionHistory = async (req, res) => {
  try {
    if (req.user?.role === 'hod') {
      return res.status(403).json({ success: false, message: 'HOD cannot access submission history.' });
    }

    const submissionsExists = await hasTable('submissions');
    const reviewCommentsExists = await hasTable('review_comments');
    const facultyId = Number(req.params.id);
    const [facultyRows] = await db.query(
      'SELECT id, role, department_id FROM users WHERE id = ? AND role = \"faculty\"',
      [facultyId]
    );

    if (facultyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Faculty not found' });
    }
    if (req.user.role === 'hod' && Number(req.user.department_id) !== Number(facultyRows[0].department_id)) {
      return res.status(403).json({ success: false, message: 'HOD can only view own department faculty history' });
    }

    if (!submissionsExists) {
      return res.json({ success: true, data: [] });
    }

    const commentsColumn = reviewCommentsExists
      ? '(SELECT COUNT(*) FROM review_comments rc WHERE rc.submission_id = s.id)'
      : '0';

    const [rows] = await db.query(`
      SELECT s.id, s.academic_year, s.status, s.form_type, s.created_at, s.updated_at,
             YEAR(s.created_at) AS calendar_year,
             ${commentsColumn} AS comments_count
      FROM submissions s
      WHERE s.faculty_id = ?
      ORDER BY s.academic_year DESC, s.created_at DESC
    `, [facultyId]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Faculty submission history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

