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

    if (!user.password) {
      return res.status(401).json({ success: false, message: 'Password not set. Please check your email for the password setup link.' });
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
        employee_id: user.employee_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      // Don't reveal whether email exists
      return res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
    }

    const user = users[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.query(
      'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
      [hashedToken, expires, user.id]
    );

    const resetUrl = `${FRONTEND_URL}/reset-password/${resetToken}`;

    try {
      await emailService.sendForgotPassword({
        to: user.email,
        name: user.name,
        resetUrl
      });
    } catch (emailErr) {
      console.error('Email send error:', emailErr);
      // Still return success — don't reveal email status
    }

    console.log(`🔗 Password reset URL for ${user.email}: ${resetUrl}`);

    res.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
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

    res.json({ success: true, message: 'Password reset successful. You can now log in.' });
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

    res.json({
      success: true,
      user: {
        ...req.user,
        departmentInfo
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
