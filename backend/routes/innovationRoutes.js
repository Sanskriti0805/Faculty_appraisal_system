const express = require('express');
const router = express.Router();
const innovationController = require('../controllers/innovationController');
const { uploadSingle } = require('../middleware/upload');

// Teaching Innovation
router.post('/teaching', uploadSingle('evidence_file'), innovationController.createTeachingInnovation);
router.get('/teaching/:facultyId', innovationController.getTeachingInnovations);
router.delete('/teaching/:id', innovationController.deleteTeachingInnovation);

// Institutional Contributions
router.post('/institutional', uploadSingle('evidence_file'), innovationController.createInstitutionalContribution);
router.get('/institutional/:facultyId', innovationController.getInstitutionalContributions);
router.delete('/institutional/:id', innovationController.deleteInstitutionalContribution);

module.exports = router;
