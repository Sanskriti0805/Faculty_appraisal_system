const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Department registration (admin, dofa, or dofa_office)
router.post('/department', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.registerDepartment);

// Faculty registration (admin, dofa, or dofa_office)
router.post('/faculty', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.registerFaculty);

// List all departments (any authenticated user)
router.get('/departments', registrationController.getDepartments);

// List faculty in a department (for HOD)
router.get('/departments/:id/faculty', authenticate, requireRole('admin', 'hod', 'dofa', 'dofa_office'), registrationController.getDepartmentFaculty);

// List all users (admin, dofa, or dofa_office)
router.get('/users', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.getAllUsers);

module.exports = router;
