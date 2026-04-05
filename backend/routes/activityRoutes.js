const express = require('express');
const router = express.Router();
const activityController = require('../controllers/activityController');
const { uploadSingle } = require('../middleware/upload');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

router.post('/paper-reviews', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('paper_review'), activityController.createPaperReview);
router.delete('/paper-reviews/:id', authenticate, requireSectionEditAccess('paper_review'), activityController.deletePaperReview);
router.post('/tech-transfer', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('technology_transfer'), activityController.createTechTransfer);
router.delete('/tech-transfer/:id', authenticate, requireSectionEditAccess('technology_transfer'), activityController.deleteTechTransfer);
router.post('/conference-sessions', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('conference_sessions'), activityController.createConferenceSession);
router.delete('/conference-sessions/:id', authenticate, requireSectionEditAccess('conference_sessions'), activityController.deleteConferenceSession);
router.post('/keynotes-talks', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('keynotes_talks'), activityController.createKeynoteTalk);
router.delete('/keynotes-talks/:id', authenticate, requireSectionEditAccess('keynotes_talks'), activityController.deleteKeynoteTalk);

module.exports = router;
