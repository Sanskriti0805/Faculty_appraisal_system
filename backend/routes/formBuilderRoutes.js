const express = require('express');
const router = express.Router();
const formBuilderController = require('../controllers/formBuilderController');

// GET schema (nested with children, optional ?form_type=A|B)
router.get('/schema', formBuilderController.getFormSchema);

// GET schema flat (for dropdowns in wizard, optional ?form_type=A|B)
router.get('/schema/flat', formBuilderController.getFormSchemaFlat);

// Admin: Section routes
router.post('/sections', formBuilderController.createSection);
router.put('/sections/:id', formBuilderController.updateSection);
router.delete('/sections/:id', formBuilderController.deleteSection);

// Admin: Field routes
router.post('/fields', formBuilderController.createField);
router.put('/fields/order', formBuilderController.updateFieldOrder);
router.delete('/fields/:id', formBuilderController.deleteField);

// Faculty: Response routes
router.post('/responses', formBuilderController.saveResponses);
router.get('/responses', formBuilderController.getResponses);

module.exports = router;
