const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { uploadSingle } = require('../middleware/upload');

router.post('/paper-reviews', uploadSingle('evidence_file'), activityController.createPaperReview);
router.post('/tech-transfer', uploadSingle('evidence_file'), activityController.createTechTransfer);
router.post('/conference-sessions', uploadSingle('evidence_file'), activityController.createConferenceSession);
router.post('/keynotes-talks', uploadSingle('evidence_file'), activityController.createKeynoteTalk);

module.exports = router;
