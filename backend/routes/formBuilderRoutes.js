const express = require('express');
const router = express.Router();
const formBuilderController = require('../controllers/formBuilderController');

// GET schema (for faculty and admin)
router.get('/schema', formBuilderController.getFormSchema);

// Admin: Section routes
router.post('/sections', formBuilderController.createSection);
router.put('/sections/:id', formBuilderController.updateSection);
router.delete('/sections/:id', formBuilderController.deleteSection);

// Admin: Field routes
router.post('/fields', formBuilderController.createField);
router.put('/fields/order', formBuilderController.updateFieldOrder);

// Faculty: Response routes
router.post('/responses', formBuilderController.saveResponses);
router.get('/responses', formBuilderController.getResponses);

module.exports = router;
