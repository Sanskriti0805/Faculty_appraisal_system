const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const { cacheMiddleware } = require('../middleware/cache');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Paper reviews routes with caching
router.get('/faculty/:facultyId', cacheMiddleware(180), reviewsController.getReviewsByFaculty);
router.post('/', authenticate, requireSectionEditAccess('paper_review'), reviewsController.createReview);
router.delete('/:id', authenticate, requireSectionEditAccess('paper_review'), reviewsController.deleteReview);

module.exports = router;
