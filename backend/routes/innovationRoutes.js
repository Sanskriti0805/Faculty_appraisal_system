const express = require('express');
const router = express.Router();
const innovationController = require('../controllers/innovationController');
const { uploadSingle } = require('../middleware/upload');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

// Teaching Innovation
router.post('/teaching', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('teaching_innovation'), innovationController.createTeachingInnovation);
router.get('/teaching/:facultyId', innovationController.getTeachingInnovations);
router.delete('/teaching/:id', authenticate, requireSectionEditAccess('teaching_innovation'), innovationController.deleteTeachingInnovation);

// Institutional Contributions
router.post('/institutional', authenticate, uploadSingle('evidence_file'), requireSectionEditAccess('institutional_contributions'), innovationController.createInstitutionalContribution);
router.get('/institutional/:facultyId', innovationController.getInstitutionalContributions);
router.delete('/institutional/:id', authenticate, requireSectionEditAccess('institutional_contributions'), innovationController.deleteInstitutionalContribution);

module.exports = router;
