const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');

// Add comment
router.post('/comment', reviewController.addComment);

// Get comments by submission
router.get('/comments/:submissionId', reviewController.getCommentsBySubmission);

// Delete comment
router.delete('/comment/:id', reviewController.deleteComment);

module.exports = router;
