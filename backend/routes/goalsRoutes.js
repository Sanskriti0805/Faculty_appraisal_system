const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/:facultyId', goalsController.getGoalsByFaculty);
router.post('/save', authenticate, goalsController.saveGoals);

module.exports = router;
