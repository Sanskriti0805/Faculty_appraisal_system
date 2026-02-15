const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { cacheMiddleware } = require('../middleware/cache');

// Faculty routes with caching for GET requests
router.get('/', cacheMiddleware(300), facultyController.getAllFaculty);
router.get('/:id', cacheMiddleware(300), facultyController.getFacultyById);
router.post('/', facultyController.createFaculty);
router.put('/:id', facultyController.updateFaculty);
router.delete('/:id', facultyController.deleteFaculty);

module.exports = router;
