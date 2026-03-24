const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');

router.get('/:facultyId', goalsController.getGoalsByFaculty);
router.post('/save', goalsController.saveGoals);

module.exports = router;
