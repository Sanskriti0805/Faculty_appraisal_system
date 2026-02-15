const express = require('express');
const router = express.Router();
const publicationsController = require('../controllers/publicationsController');
const { cacheMiddleware } = require('../middleware/cache');
const { uploadSingle } = require('../middleware/upload');

// Publications routes with caching and file upload
router.get('/faculty/:facultyId', cacheMiddleware(180), publicationsController.getPublicationsByFaculty);
router.post('/', uploadSingle('evidence_file'), publicationsController.createPublication);
router.delete('/:id', publicationsController.deletePublication);

module.exports = router;
