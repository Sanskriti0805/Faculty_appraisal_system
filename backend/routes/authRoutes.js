const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const collegeAuthController = require('../controllers/collegeAuthController');
const { authenticate } = require('../middleware/authMiddleware');

// Public routes
router.post('/login', authController.login);
router.post('/college-login', collegeAuthController.collegeLogin);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Dev mock endpoint for testing college API integration locally
if (process.env.NODE_ENV !== 'production') {
  router.get('/mock-college', (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing token' });
    }
    // Return sample professor details
    res.json({
      email: 'testfaculty@lnmiit.ac.in',
      name: 'Test Faculty'
    });
  });
}

// Protected routes
router.get('/me', authenticate, authController.getMe);
router.post('/change-password', authenticate, authController.changePassword);

module.exports = router;

