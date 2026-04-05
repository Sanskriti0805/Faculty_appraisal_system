const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const { uploadSingle } = require('../middleware/upload');
const { cacheMiddleware } = require('../middleware/cache');

// Courses taught routes with caching
router.get('/faculty/:facultyId', cacheMiddleware(180), coursesController.getCoursesByFaculty);
router.post('/', coursesController.createCourse);
router.put('/:id', coursesController.updateCourse);
router.delete('/:id', coursesController.deleteCourse);

// New courses developed routes with caching
router.get('/new/faculty/:facultyId', cacheMiddleware(180), coursesController.getNewCoursesByFaculty);
router.post('/new', uploadSingle('cif_file'), coursesController.createNewCourse);

module.exports = router;
