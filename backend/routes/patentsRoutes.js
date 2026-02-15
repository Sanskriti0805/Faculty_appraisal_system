const express = require('express');
const router = express.Router();
const patentsController = require('../controllers/patentsController');
const { uploadSingle } = require('../middleware/upload');
const { cacheMiddleware } = require('../middleware/cache');

// Patents routes with caching
router.get('/faculty/:facultyId', cacheMiddleware(180), patentsController.getPatentsByFaculty);
router.post('/', uploadSingle('certificate_file'), patentsController.createPatent);
router.delete('/:id', patentsController.deletePatent);

module.exports = router;
