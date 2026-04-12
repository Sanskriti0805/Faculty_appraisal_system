const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Department registration (admin, dofa, or dofa_office)
router.post('/department', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.registerDepartment);

// Faculty registration (admin, dofa, or dofa_office)
router.post('/faculty', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.registerFaculty);

// Bulk email invite — faculty or hod (dofa / dofa_office only)
router.post('/bulk-invite', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.bulkInvite);

// Complete onboarding — any authenticated user (faculty or hod)
router.put('/onboarding', authenticate, registrationController.completeOnboarding);

// List all departments (any authenticated user)
router.get('/departments', authenticate, registrationController.getDepartments);

// List faculty in a department (for HOD)
router.get('/departments/:id/faculty', authenticate, requireRole('admin', 'hod', 'dofa', 'dofa_office'), registrationController.getDepartmentFaculty);

// List all users (admin, dofa, or dofa_office)
router.get('/users', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.getAllUsers);

// Archive / restore faculty
router.put('/faculty/:id/archive', authenticate, requireRole('admin', 'hod', 'dofa', 'dofa_office'), registrationController.softDeleteFaculty);
router.put('/faculty/:id/restore', authenticate, requireRole('admin', 'hod', 'dofa', 'dofa_office'), registrationController.restoreFaculty);

// Archive / restore department (DOFA or DOFA Office)
router.put('/departments/:id/archive', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.softDeleteDepartment);
router.put('/departments/:id/restore', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.restoreDepartment);

// Archive data and exports
router.get('/archive', authenticate, requireRole('admin', 'hod', 'dofa', 'dofa_office'), registrationController.getArchiveData);
router.get('/archive/export', authenticate, requireRole('admin', 'hod', 'dofa', 'dofa_office'), registrationController.exportArchiveData);

// Historical submissions per faculty
router.get('/faculty/:id/submissions', authenticate, requireRole('admin', 'dofa', 'dofa_office'), registrationController.getFacultySubmissionHistory);

module.exports = router;
