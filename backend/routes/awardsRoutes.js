const express = require('express');
const router = express.Router();
const awardsController = require('../controllers/awardsController');
const { uploadSingle } = require('../middleware/upload');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Create new award with evidence file upload
router.post('/', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('awards_honours'), awardsController.createAward);

// Get all awards for a faculty member
router.get('/:facultyId', awardsController.getAwards);

// Delete an award
router.delete('/:id', authenticate, requireSectionEditAccess('awards_honours'), awardsController.deleteAward);

module.exports = router;
