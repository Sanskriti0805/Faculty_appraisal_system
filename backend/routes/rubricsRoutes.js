const express = require('express');
const router = express.Router();
const rubricsController = require('../controllers/rubricsController');

// Routes for DOFA rubrics
router.get('/', rubricsController.getAllRubrics);
router.post('/', rubricsController.createRubric);
router.put('/:id', rubricsController.updateRubric);
router.delete('/:id', rubricsController.deleteRubric);

module.exports = router;
