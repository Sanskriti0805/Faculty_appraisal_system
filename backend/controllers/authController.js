/**
 * Auth Controller — login, forgot-password, reset-password, me
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../config/database');
const emailService = require('../services/emailService');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * POST /api/auth/login
 * Body: { email, password, role }
 */
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or role' });
    }

    const user = users[0];

    if (Number(user.is_archived) === 1) {
      return res.status(403).json({ success: false, message: 'Account is archived. Contact DOFA office.' });
    }

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Password not set. Please check your email for the temporary password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Get department info if applicable
    let departmentInfo = null;
    if (user.department_id) {
      const [depts] = await db.query('SELECT * FROM departments WHERE id = ?', [user.department_id]);
      if (depts.length > 0) departmentInfo = depts[0];
    }

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        department_id: user.department_id,
        departmentInfo,
        designation: user.designation,
        salutation: user.salutation,
        employee_id: user.employee_id,
        date_of_joining: user.date_of_joining,
        onboarding_complete: user.onboarding_complete
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Body: { email, role }
 * Role is required to identify the correct user account
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    if (!role) {
      return res.status(400).json({ success: false, message: 'Please select your role' });
    }

    // Look up user by email AND role
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, role]);
    if (users.length === 0) {
      // Don't reveal whether email exists — always return success
      return res.json({ success: true, message: 'If that email is registered with the selected role, a reset link has been sent.' });
    }

    const user = users[0];
    if (Number(user.is_archived) === 1) {
      return res.json({ success: true, message: 'If that email is registered with the selected role, a reset link has been sent.' });
    }
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [hashedToken, expires, user.id]
    );

    // Include role in reset URL so frontend knows which role is resetting
    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}?role=${encodeURIComponent(role)}`;

    try {
      await emailService.sendForgotPassword({
        to: user.email,
        name: user.name,
        resetUrl,
        role: role.toUpperCase()
      });
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      // Still return success — don't reveal email status
    }

    console.log(`🔗 Password reset URL for ${user.email} (${role}): ${resetUrl}`);

    res.json({ success: true, message: 'If that email is registered with the selected role, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/auth/reset-password/:token
 * Body: { password }
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const [users] = await db.query(
      'SELECT * FROM users WHERE password_reset_token = ? AND password_reset_expires > NOW()',
      [hashedToken]
    );

    if (users.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const user = users[0];
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      'UPDATE users SET password = ?, password_reset_token = NULL, password_reset_expires = NULL WHERE id = ?',
      [hashedPassword, user.id]
    );

    res.json({ success: true, message: 'Password reset successful. You can now log in.', role: user.role });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GET /api/auth/me
 * Returns current user from JWT
 */
exports.getMe = async (req, res) => {
  try {
    let departmentInfo = null;
    if (req.user.department_id) {
      const [depts] = await db.query('SELECT * FROM departments WHERE id = ?', [req.user.department_id]);
      if (depts.length > 0) departmentInfo = depts[0];
    }

    // Re-fetch to get latest onboarding_complete
    const [freshUsers] = await db.query('SELECT onboarding_complete FROM users WHERE id = ?', [req.user.id]);
    const onboarding_complete = freshUsers.length > 0 ? freshUsers[0].onboarding_complete : 1;

    res.json({
      success: true,
      user: {
        ...req.user,
        departmentInfo,
        onboarding_complete
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword }
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect current password' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
