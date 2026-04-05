const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const { cacheMiddleware } = require('../middleware/cache');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Faculty routes with caching for GET requests
router.get('/', cacheMiddleware(300), facultyController.getAllFaculty);
router.get('/:id', cacheMiddleware(300), facultyController.getFacultyById);
router.post('/', authenticate, requireSectionEditAccess('faculty_info'), facultyController.createFaculty);
router.put('/:id', authenticate, requireSectionEditAccess('faculty_info'), facultyController.updateFaculty);
router.delete('/:id', authenticate, requireSectionEditAccess('faculty_info'), facultyController.deleteFaculty);

module.exports = router;
