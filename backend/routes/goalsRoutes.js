const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireSectionEditAccess } = require('../middleware/submissionEditGuard');

router.get('/:facultyId', goalsController.getGoalsByFaculty);
router.post('/save', authenticate, requireSectionEditAccess('part_b'), goalsController.saveGoals);

module.exports = router;
