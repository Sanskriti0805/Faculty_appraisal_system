const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');

// GET all evaluation data (rubrics + submissions + scores + remarks)
router.get('/', evaluationController.getEvaluationData);

// POST save/update a score
router.post('/scores', evaluationController.saveScore);

// POST save/update a remark
router.post('/remarks', evaluationController.saveRemark);

module.exports = router;
