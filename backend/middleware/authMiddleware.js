/**
 * Auth Middleware - JWT verification and role checking
 */
const jwt = require('jsonwebtoken');
const db = require('../config/database');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.department_id, u.designation, u.salutation, u.employee_id,
              COALESCE(
                u.date_of_joining,
                (
                  SELECT fi.date_of_joining
                  FROM faculty_information fi
                  WHERE fi.email = u.email
                  ORDER BY fi.id DESC
                  LIMIT 1
                ),
                DATE(u.created_at)
              ) AS date_of_joining,
              u.is_archived
       FROM users u
       WHERE u.id = ?`,
      [decoded.id]
    );
    if (users.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (Number(users[0].is_archived) === 1) {
      return res.status(401).json({ success: false, message: 'Account is archived. Contact Dofa office.' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

/**
 * Role-based access control middleware
 * Usage: requireRole('admin', 'hod')
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    next();
  };
};

module.exports = { authenticate, requireRole };

