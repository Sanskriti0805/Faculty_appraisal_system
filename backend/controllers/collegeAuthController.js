/**
 * College Auth Controller
 * ──────────────────────
 * Integration layer between the college's main system and this app.
 *
 * ISOLATION GUARANTEE: All college-API-specific logic lives here.
 * If the college changes their API format, only this file needs updating.
 *
 * Flow:
 *   1. Frontend receives a short-lived token from the college SSO redirect.
 *   2. Frontend POSTs { college_token } to POST /api/auth/college-login.
 *   3. This controller calls the college API server-side (token never re-exposed).
 *   4. College API returns { email, name }.
 *   5. We look up the user by email in our `users` table.
 *   6. If not found → create a new faculty user (role = 'faculty').
 *   7. Issue our own JWT and return it — same shape as the normal login response.
 */

const jwt = require('jsonwebtoken');
const db  = require('../config/database');

// ── College API adapter ────────────────────────────────────────────────────────
// To support a different API format later, only modify fetchProfessorFromCollege().

/**
 * Call the college system API and extract { email, name }.
 * Currently expects:  GET COLLEGE_API_URL  with  Authorization: Bearer <token>
 * Response expected:  { "email": "...", "name": "..." }
 */
async function fetchProfessorFromCollegeAPI(collegeToken) {
  const apiUrl = process.env.COLLEGE_API_URL;
  if (!apiUrl) {
    throw new Error('COLLEGE_API_URL is not configured in environment variables.');
  }

  // Build headers — include optional shared secret if configured
  const headers = {
    Authorization: `Bearer ${collegeToken}`,
    'Content-Type': 'application/json',
  };
  if (process.env.COLLEGE_API_SECRET) {
    headers['X-Api-Secret'] = process.env.COLLEGE_API_SECRET;
  }

  let res;
  try {
    res = await fetch(apiUrl, { headers });
  } catch (networkErr) {
    throw new Error(`College API unreachable: ${networkErr.message}`);
  }

  if (!res.ok) {
    throw new Error(`College API returned HTTP ${res.status}. Please try again.`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error('College API returned an unexpected response format.');
  }

  // ── Extract email & name from the college API response ──────────────────────
  // Adjust the field names below if the college uses different keys.
  const email = body.email || body.Email || body.user_email || null;
  const name  = body.name  || body.Name  || body.user_name  || body.full_name || null;

  if (!email) {
    throw new Error('College API response did not include a professor email.');
  }

  return { email: String(email).trim().toLowerCase(), name: String(name || '').trim() };
}

// ── Helper: canonicalize role (mirrors authMiddleware.js) ─────────────────────
function canonicalizeRole(value) {
  const normalized = String(value || '').trim().toLowerCase();
  const map = {
    admin: 'admin', faculty: 'faculty', hod: 'hod',
    dofa: 'Dofa', dofa_office: 'Dofa_office',
    'dofa office': 'Dofa_office', dofaoffice: 'Dofa_office',
  };
  return map[normalized] || value;
}

// ── Main route handler ─────────────────────────────────────────────────────────

/**
 * POST /api/auth/college-login
 * Body: { college_token: string }
 */
exports.collegeLogin = async (req, res) => {
  try {
    const { college_token } = req.body;

    if (!college_token || String(college_token).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'No authentication token received from the college system.',
      });
    }

    // 1. Call college API
    let professorInfo;
    try {
      professorInfo = await fetchProfessorFromCollegeAPI(college_token);
    } catch (apiErr) {
      console.error('[CollegeAuth] College API error:', apiErr.message);
      return res.status(502).json({ success: false, message: apiErr.message });
    }

    const { email, name } = professorInfo;

    // 2. Look up user by email in our users table
    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.department_id,
              u.designation, u.salutation, u.employee_id, u.onboarding_complete, u.is_archived,
              COALESCE(
                u.date_of_joining,
                (SELECT fi.date_of_joining FROM faculty_information fi
                 WHERE fi.email = u.email ORDER BY fi.id DESC LIMIT 1),
                DATE(u.created_at)
              ) AS date_of_joining
       FROM users u
       WHERE LOWER(TRIM(u.email)) = ? AND LOWER(TRIM(u.role)) = 'faculty'
       LIMIT 1`,
      [email]
    );

    let user;

    if (users.length > 0) {
      // 3a. Existing user found
      user = users[0];

      if (Number(user.is_archived) === 1) {
        return res.status(403).json({
          success: false,
          message: 'Your account is archived. Please contact the DoFA office.',
        });
      }

      // Update name if it changed in the college system
      if (name && user.name !== name) {
        await db.query('UPDATE users SET name = ? WHERE id = ?', [name, user.id]);
        user.name = name;
      }
    } else {
      // 3b. Professor not in our DB yet — create a minimal faculty account
      console.log(`[CollegeAuth] Creating new faculty user for ${email}`);
      const [result] = await db.query(
        `INSERT INTO users (name, email, role, onboarding_complete, created_at, updated_at)
         VALUES (?, ?, 'faculty', 0, NOW(), NOW())`,
        [name || email, email]
      );
      const newId = result.insertId;

      const [newUsers] = await db.query(
        `SELECT u.id, u.name, u.email, u.role, u.department, u.department_id,
                u.designation, u.salutation, u.employee_id, u.onboarding_complete, u.is_archived,
                DATE(u.created_at) AS date_of_joining
         FROM users u WHERE u.id = ?`,
        [newId]
      );
      user = newUsers[0];
    }

    // 4. Issue our own JWT (same structure as authController.login)
    const safeRole = canonicalizeRole(user.role);
    const token = jwt.sign(
      { id: user.id, email: user.email, role: safeRole },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // 5. Fetch department info if applicable (mirrors authController.login)
    let departmentInfo = null;
    if (user.department_id) {
      const [depts] = await db.query('SELECT * FROM departments WHERE id = ?', [user.department_id]);
      if (depts.length > 0) departmentInfo = depts[0];
    }

    return res.json({
      success: true,
      token,
      user: {
        id:                  user.id,
        name:                user.name,
        email:               user.email,
        role:                safeRole,
        department:          user.department,
        department_id:       user.department_id,
        departmentInfo,
        designation:         user.designation,
        salutation:          user.salutation,
        employee_id:         user.employee_id,
        date_of_joining:     user.date_of_joining || null,
        onboarding_complete: user.onboarding_complete,
      },
    });

  } catch (err) {
    console.error('[CollegeAuth] Unexpected error:', err);
    return res.status(500).json({ success: false, message: 'Server error during college authentication.' });
  }
};
