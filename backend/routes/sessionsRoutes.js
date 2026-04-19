const express = require('express');
const router = express.Router();
const sessionsController = require('../controllers/sessionsController');

// Get all sessions
router.get('/', sessionsController.getAllSessions);

// Get current active session
router.get('/current', sessionsController.getCurrentSession);

// Get active session with release status (for faculty dashboard)
router.get('/active', sessionsController.getActiveSession);

// Create new session
router.post('/', sessionsController.createSession);

// Update session
router.put('/:id', sessionsController.updateSession);

// Toggle session status
router.put('/:id/status', sessionsController.toggleSessionStatus);

// ─── Form Release Endpoints ──────────────────────────────

// Release forms immediately
router.post('/release', sessionsController.releaseFormsNow);

// Schedule form release for a future date
router.post('/schedule', sessionsController.scheduleRelease);

// Cancel a scheduled release
router.post('/cancel-schedule', sessionsController.cancelSchedule);

// Un-release forms (close access)
router.post('/unrelease', sessionsController.unreleaseForms);

// Extend deadline for active session
router.put('/:id/extend-deadline', sessionsController.extendDeadline);

module.exports = router;
