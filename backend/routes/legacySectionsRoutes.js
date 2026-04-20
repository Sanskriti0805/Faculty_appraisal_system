const express = require('express');
const router = express.Router();

const legacySectionsController = require('../controllers/legacySectionsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccessFromParam } = require('../middleware/submissionEditGuard');
const { uploadFields } = require('../middleware/upload');

router.get('/:sectionKey/my', authenticate, legacySectionsController.getMySectionData);
router.post(
	'/:sectionKey/save',
	authenticate,
	requireSectionEditAccessFromParam('sectionKey'),
	uploadFields([{ name: 'visit_evidence_files', maxCount: 30 }]),
	legacySectionsController.saveMySectionData
);

module.exports = router;
