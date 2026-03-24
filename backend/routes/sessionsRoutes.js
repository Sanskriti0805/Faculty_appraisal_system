const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessionsController');

// Get all sessions
router.get('/', sessionsController.getAllSessions);

// Get current active session
router.get('/current', sessionsController.getCurrentSession);

// Create new session
router.post('/', sessionsController.createSession);

// Update session
router.put('/:id', sessionsController.updateSession);

// Toggle session status
router.put('/:id/status', sessionsController.toggleSessionStatus);

module.exports = router;
