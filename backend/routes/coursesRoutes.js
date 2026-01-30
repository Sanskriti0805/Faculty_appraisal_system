const express = require('express');
const router = express.Router();
const coursesController = require('../controllers/coursesController');
const upload = require('../middleware/upload');

// Courses taught routes
router.get('/faculty/:facultyId', coursesController.getCoursesByFaculty);
router.post('/', coursesController.createCourse);
router.delete('/:id', coursesController.deleteCourse);

// New courses developed routes
router.get('/new/faculty/:facultyId', coursesController.getNewCoursesByFaculty);
router.post('/new', upload.single('cif_file'), coursesController.createNewCourse);

module.exports = router;
