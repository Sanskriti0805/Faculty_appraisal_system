const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const { uploadSingle } = require('../middleware/upload');
const { cacheMiddleware } = require('../middleware/cache');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Courses taught routes with caching
router.get('/faculty/:facultyId', cacheMiddleware(180), coursesController.getCoursesByFaculty);
router.post('/', authenticate, requireSectionEditAccess('courses_taught'), coursesController.createCourse);
router.delete('/:id', authenticate, requireSectionEditAccess('courses_taught'), coursesController.deleteCourse);

// New courses developed routes with caching
router.get('/new/faculty/:facultyId', cacheMiddleware(180), coursesController.getNewCoursesByFaculty);
router.post('/new', authenticate, requireSectionEditAccess('new_courses'), uploadSingle('cif_file'), coursesController.createNewCourse);
router.delete('/new/:id', authenticate, requireSectionEditAccess('new_courses'), coursesController.deleteNewCourse);

module.exports = router;
