const express = require('express');
const router = express.Router();
const editRequestsController = require('../controllers/editRequestsController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

// Faculty: create a new edit request
router.post('/', editRequestsController.createEditRequest);

// Dofa/Admin: get all edit requests (with optional ?status=pending filter)
// Faculty: gets only their own
router.get('/', editRequestsController.getEditRequests);

// Dofa: get count of pending requests (for badge)
router.get('/pending-count', editRequestsController.getPendingCount);

// Faculty: get edit requests for a specific submission
router.get('/my-submission/:submissionId', editRequestsController.getRequestsForSubmission);

// Dofa: approve or deny an edit request
router.put('/:id/review', editRequestsController.reviewEditRequest);

module.exports = router;

