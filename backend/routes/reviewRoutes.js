const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authenticate } = require('../middleware/authMiddleware');

// Add comment
router.post('/comment', authenticate, reviewController.addComment);

// Get comments by submission
router.get('/comments/:submissionId', authenticate, reviewController.getCommentsBySubmission);

// Delete comment
router.delete('/comment/:id', authenticate, reviewController.deleteComment);

module.exports = router;
