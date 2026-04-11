const express = require('express');
const router = express.Router();
const submissionsController = require('../controllers/submissionsController');
const pdfController = require('../controllers/pdfController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Get current faculty's submission (or create draft) — MUST be before /:id
router.get('/my', authenticate, submissionsController.getMySubmission);

// Get all submissions with filters
router.get('/', submissionsController.getAllSubmissions);

// Get submission statistics
router.get('/stats', submissionsController.getSubmissionStats);

// Export bulk excel 
router.get('/export/excel/:academic_year', authenticate, submissionsController.exportComprehensiveExcel);

// ── PDF download — MUST be before /:id ──────────────────────────────────────
router.get('/:id/pdf', authenticate, pdfController.generateSubmissionPdf);

// Submission version history
router.get('/:id/versions', authenticate, submissionsController.getSubmissionVersions);
router.get('/:id/versions/:versionNumber', authenticate, submissionsController.getSubmissionVersionByNumber);

// Get submission by ID
router.get('/:id', authenticate, submissionsController.getSubmissionById);


// Create new submission
router.post('/', submissionsController.createSubmission);

// Update submission status
router.put('/:id/status', authenticate, submissionsController.updateSubmissionStatus);

// Consultancy save + Lock/Unlock
router.post('/consultancy/save', authenticate, requireSectionEditAccess('consultancy'), submissionsController.saveConsultancy);
router.put('/:id/lock', submissionsController.toggleSubmissionLock);

// Send manual reminder email to faculty
router.post('/:id/reminder', submissionsController.sendReminder);

module.exports = router;
