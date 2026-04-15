const express = require('express');
const router = express.Router();
const registrationController = require('../controllers/registrationController');
const { authenticate, requireRole } = require('../middleware/authMiddleware');

// Department registration (admin, Dofa, or Dofa_office)
router.post('/department', authenticate, requireRole('admin', 'Dofa', 'Dofa_office'), registrationController.registerDepartment);

// Faculty registration (admin, Dofa, or Dofa_office)
router.post('/faculty', authenticate, requireRole('admin', 'Dofa', 'Dofa_office'), registrationController.registerFaculty);

// Bulk email invite - faculty or hod (Dofa / Dofa_office only)
router.post('/bulk-invite', authenticate, requireRole('admin', 'Dofa', 'Dofa_office'), registrationController.bulkInvite);

// Complete onboarding - any authenticated user (faculty or hod)
router.put('/onboarding', authenticate, registrationController.completeOnboarding);

// List all departments (any authenticated user)
router.get('/departments', authenticate, registrationController.getDepartments);

// List faculty in a department (for HOD)
router.get('/departments/:id/faculty', authenticate, requireRole('admin', 'hod', 'Dofa', 'Dofa_office'), registrationController.getDepartmentFaculty);

// List all users (admin, Dofa, or Dofa_office)
router.get('/users', authenticate, requireRole('admin', 'Dofa', 'Dofa_office'), registrationController.getAllUsers);

// Archive / restore faculty
router.put('/faculty/:id/archive', authenticate, requireRole('admin', 'hod', 'Dofa', 'Dofa_office'), registrationController.softDeleteFaculty);
router.put('/faculty/:id/restore', authenticate, requireRole('admin', 'hod', 'Dofa', 'Dofa_office'), registrationController.restoreFaculty);

// Archive / restore department (Dofa or Dofa Office)
router.put('/departments/:id/archive', authenticate, requireRole('admin', 'Dofa', 'Dofa_office'), registrationController.softDeleteDepartment);
router.put('/departments/:id/restore', authenticate, requireRole('admin', 'Dofa', 'Dofa_office'), registrationController.restoreDepartment);

// Archive data and exports
router.get('/archive', authenticate, requireRole('admin', 'hod', 'Dofa', 'Dofa_office'), registrationController.getArchiveData);
router.get('/archive/export', authenticate, requireRole('admin', 'hod', 'Dofa', 'Dofa_office'), registrationController.exportArchiveData);

// Historical submissions per faculty
router.get('/faculty/:id/submissions', authenticate, requireRole('admin', 'Dofa', 'Dofa_office'), registrationController.getFacultySubmissionHistory);

module.exports = router;

