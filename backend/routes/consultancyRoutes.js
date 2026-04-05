const express = require('express');
const router = express.Router();
const consultancyController = require('../controllers/consultancyController');
const { uploadSingle } = require('../middleware/upload');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

router.post('/', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('consultancy'), consultancyController.createConsultancy);
router.get('/faculty/:facultyId', consultancyController.getConsultancyByFaculty);
router.delete('/:id', authenticate, requireSectionEditAccess('consultancy'), consultancyController.deleteConsultancy);

module.exports = router;
