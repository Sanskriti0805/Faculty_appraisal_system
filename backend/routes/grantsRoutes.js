const express = require('express');
const router = express.Router();
const grantsController = require('../controllers/grantsController');
const { uploadSingle } = require('../middleware/upload');
const { cacheMiddleware } = require('../middleware/cache');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Research grants routes with caching
router.get('/faculty/:facultyId', cacheMiddleware(180), grantsController.getGrantsByFaculty);
router.post('/', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('research_grants'), grantsController.createGrant);
router.put('/:id', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('research_grants'), grantsController.updateGrant);
router.delete('/:id', authenticate, requireSectionEditAccess('research_grants'), grantsController.deleteGrant);

// Proposals routes with caching
router.get('/proposals/faculty/:facultyId', cacheMiddleware(180), grantsController.getProposalsByFaculty);
router.post('/proposals', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('research_grants'), grantsController.createProposal);
router.put('/proposals/:id', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('research_grants'), grantsController.updateProposal);
router.delete('/proposals/:id', authenticate, requireSectionEditAccess('research_grants'), grantsController.deleteProposal);

module.exports = router;
