const express = require('express');
const router = express.Router();
const transcriptionController = require('../controllers/transcription.controller');

// Start transcription
router.post('/start', transcriptionController.startTranscription);

// Get transcription status
router.get('/status/:sessionId', transcriptionController.getTranscriptionStatus);

// Get all completed transcriptions
router.get('/all', transcriptionController.getAllTranscriptions);

// Get transcript for a specific clip (this must come before the generic /:sessionId route)
router.get('/clip/:clipId', transcriptionController.getClipTranscript);

// Get transcript for a specific session
router.get('/:sessionId', transcriptionController.getTranscript);

module.exports = router;