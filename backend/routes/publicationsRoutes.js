const express = require('express');
const router = express.Router();
const publicationsController = require('../controllers/publicationsController');

// Publications routes
router.get('/faculty/:facultyId', publicationsController.getPublicationsByFaculty);
router.post('/', publicationsController.createPublication);
router.delete('/:id', publicationsController.deletePublication);

module.exports = router;
