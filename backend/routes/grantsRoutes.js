const express = require('express');
const router = express.Router();
const grantsController = require('../controllers/grantsController');
const { uploadSingle } = require('../middleware/upload');
const { cacheMiddleware } = require('../middleware/cache');

// Research grants routes with caching
router.get('/faculty/:facultyId', cacheMiddleware(180), grantsController.getGrantsByFaculty);
router.post('/', uploadSingle('evidence_file'), grantsController.createGrant);
router.delete('/:id', grantsController.deleteGrant);

// Proposals routes with caching
router.get('/proposals/faculty/:facultyId', cacheMiddleware(180), grantsController.getProposalsByFaculty);
router.post('/proposals', uploadSingle('evidence_file'), grantsController.createProposal);
router.delete('/proposals/:id', grantsController.deleteProposal);

module.exports = router;
