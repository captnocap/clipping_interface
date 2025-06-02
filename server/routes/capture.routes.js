const express = require('express');
const router = express.Router();
const captureController = require('../controllers/capture.controller');

// Start capture session
router.post('/start', captureController.startCapture);

// Stop capture session
router.post('/stop', captureController.stopCapture);

// Get capture status
router.get('/status', captureController.getCaptureStatus);

// Get session logs
router.get('/:sessionId/logs', captureController.getSessionLogs);

module.exports = router;