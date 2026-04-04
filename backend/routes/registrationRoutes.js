const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Department registration (admin only)
router.post('/department', authenticate, requireRole('admin'), registrationController.registerDepartment);

// Faculty registration (admin only)
router.post('/faculty', authenticate, requireRole('admin'), registrationController.registerFaculty);

// List all departments (any authenticated user)
router.get('/departments', registrationController.getDepartments);

// List faculty in a department (for HOD)
router.get('/departments/:id/faculty', authenticate, requireRole('admin', 'hod'), registrationController.getDepartmentFaculty);

// List all users (admin only)
router.get('/users', authenticate, requireRole('admin'), registrationController.getAllUsers);

module.exports = router;
