const express = require('express');
const router = express.Router();
const rubricsController = require('../controllers/rubricsController');

// Routes for Dofa rubrics
router.get('/', rubricsController.getAllRubrics);
router.post('/', rubricsController.createRubric);
router.put('/:id', rubricsController.updateRubric);
router.delete('/:id', rubricsController.deleteRubric);

router.post('/recalculate', rubricsController.recalculateScores);

module.exports = router;

