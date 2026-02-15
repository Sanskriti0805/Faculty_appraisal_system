const express = require('express');
const router = express.Router();
const awardsController = require('../controllers/awardsController');
const { uploadSingle } = require('../middleware/upload');

// Create new award with evidence file upload
router.post('/', uploadSingle('evidence_file'), awardsController.createAward);

// Get all awards for a faculty member
router.get('/:facultyId', awardsController.getAwards);

// Delete an award
router.delete('/:id', awardsController.deleteAward);

module.exports = router;
