const express = require('express');
const router = express.Router();
const grantsController = require('../controllers/grantsController');
const upload = require('../middleware/upload');

// Research grants routes
router.get('/faculty/:facultyId', grantsController.getGrantsByFaculty);
router.post('/', upload.single('evidence_file'), grantsController.createGrant);
router.delete('/:id', grantsController.deleteGrant);

// Proposals routes
router.get('/proposals/faculty/:facultyId', grantsController.getProposalsByFaculty);
router.post('/proposals', grantsController.createProposal);
router.delete('/proposals/:id', grantsController.deleteProposal);

module.exports = router;
