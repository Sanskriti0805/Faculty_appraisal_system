const express = require('express');
const router = express.Router();
const consultancyController = require('../controllers/consultancyController');
const { uploadSingle } = require('../middleware/upload');

router.post('/', uploadSingle('evidence_file'), consultancyController.createConsultancy);
router.get('/faculty/:facultyId', consultancyController.getConsultancyByFaculty);
router.delete('/:id', consultancyController.deleteConsultancy);

module.exports = router;
