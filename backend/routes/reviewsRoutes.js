const express = require('express');
const router = express.Router();
const reviewsController = require('../controllers/reviewsController');

// Reviews routes
router.get('/faculty/:facultyId', reviewsController.getReviewsByFaculty);
router.post('/', reviewsController.createReview);
router.delete('/:id', reviewsController.deleteReview);

module.exports = router;
