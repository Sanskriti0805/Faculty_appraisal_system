const express = require('express');
const router = express.Router();
const submissionsController = require('../controllers/submissionsController');
const { authenticate } = require('../middleware/authMiddleware');

// Get current faculty's submission (or create draft) — MUST be before /:id
router.get('/my', authenticate, submissionsController.getMySubmission);

// Get all submissions with filters
router.get('/', submissionsController.getAllSubmissions);

// Get submission statistics
router.get('/stats', submissionsController.getSubmissionStats);

// Get submission by ID
router.get('/:id', submissionsController.getSubmissionById);

// Create new submission
router.post('/', submissionsController.createSubmission);

// Update submission status
router.put('/:id/status', authenticate, submissionsController.updateSubmissionStatus);

// Consultancy save + Lock/Unlock
router.post('/consultancy/save', submissionsController.saveConsultancy);
router.put('/:id/lock', submissionsController.toggleSubmissionLock);

// Send manual reminder email to faculty
router.post('/:id/reminder', submissionsController.sendReminder);

module.exports = router;
