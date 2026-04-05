const express = require('express');
const router = express.Router();
const publicationsController = require('../controllers/publicationsController');
const { cacheMiddleware } = require('../middleware/cache');
const { uploadSingle } = require('../middleware/upload');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Publications routes with caching and file upload
router.get('/faculty/:facultyId', cacheMiddleware(180), publicationsController.getPublicationsByFaculty);
router.post('/', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('research_publications'), publicationsController.createPublication);
router.delete('/:id', authenticate, requireSectionEditAccess('research_publications'), publicationsController.deletePublication);

module.exports = router;
