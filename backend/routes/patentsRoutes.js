const express = require('express');
const router = express.Router();
const patentsController = require('../controllers/patentsController');
const upload = require('../middleware/upload');

// Patents routes
router.get('/faculty/:facultyId', patentsController.getPatentsByFaculty);
router.post('/', upload.single('certificate_file'), patentsController.createPatent);
router.delete('/:id', patentsController.deletePatent);

module.exports = router;
