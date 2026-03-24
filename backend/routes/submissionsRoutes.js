const express = require('express');
const router = express.Router();
const submissionsController = require('../controllers/submissionsController');

// Get all submissions with filters
router.get('/', submissionsController.getAllSubmissions);

// Get submission statistics
router.get('/stats', submissionsController.getSubmissionStats);

// Get submission by ID
router.get('/:id', submissionsController.getSubmissionById);

// Create new submission
router.post('/', submissionsController.createSubmission);

// Update submission status
router.put('/:id/status', submissionsController.updateSubmissionStatus);

// Lock/Unlock submission
router.put('/:id/lock', submissionsController.toggleSubmissionLock);

module.exports = router;
