const express = require('express');
const router = express.Router();
const patentsController = require('../controllers/patentsController');
const { uploadSingle } = require('../middleware/upload');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Patents routes with caching
router.get('/faculty/:facultyId', patentsController.getPatentsByFaculty);
router.post('/', authenticate, uploadSingle('certificate_file'), requireSectionEditAccess('patents'), patentsController.createPatent);
router.delete('/:id', authenticate, requireSectionEditAccess('patents'), patentsController.deletePatent);

module.exports = router;
