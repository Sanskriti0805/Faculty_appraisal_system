const express = require('express');
const router = express.Router();

const legacySectionsController = require('../controllers/legacySectionsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccessFromParam } = require('../middleware/submissionEditGuard');

router.get('/:sectionKey/my', authenticate, legacySectionsController.getMySectionData);
router.post('/:sectionKey/save', authenticate, requireSectionEditAccessFromParam('sectionKey'), legacySectionsController.saveMySectionData);

module.exports = router;
