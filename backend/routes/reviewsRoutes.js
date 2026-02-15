const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');
const { cacheMiddleware } = require('../middleware/cache');

// Paper reviews routes with caching
router.get('/faculty/:facultyId', cacheMiddleware(180), reviewsController.getReviewsByFaculty);
router.post('/', reviewsController.createReview);
router.delete('/:id', reviewsController.deleteReview);

module.exports = router;
