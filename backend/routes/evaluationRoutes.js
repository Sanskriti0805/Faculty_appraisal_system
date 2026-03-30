const express = require('express');
const router = express.Router();
const evaluationController = require('../controllers/evaluationController');

// GET all evaluation data (rubrics + submissions + scores + remarks)
router.get('/', evaluationController.getEvaluationData);

// GET sheet 2 data
router.get('/sheet2', evaluationController.getSheet2Data);

// POST save/update a score (Sheet 1)
router.post('/scores', evaluationController.saveScore);

// POST save/update a remark (Sheet 1)
router.post('/remarks', evaluationController.saveRemark);

// POST save sheet 2 remarks/feedback
router.post('/sheet2/remarks', evaluationController.saveSheet2Remarks);

// GET grading parameters
router.get('/grading-parameters', evaluationController.getGradingParameters);

// POST save grading parameters
router.post('/grading-parameters', evaluationController.saveGradingParameters);

// POST apply grading to all
router.post('/apply-grading', evaluationController.applyGrading);

// GET sheet 3 data
router.get('/sheet3', evaluationController.getSheet3Data);

// GET grade increments mapping
router.get('/grade-increments', evaluationController.getGradeIncrements);

// POST save grade increments mapping
router.post('/grade-increments', evaluationController.saveGradeIncrements);

// POST apply increments based on grades
router.post('/apply-increments', evaluationController.applyIncrements);

module.exports = router;
