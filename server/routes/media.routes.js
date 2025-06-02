const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');

// Get list of all captures
router.get('/captures', mediaController.getAllCaptures);

// Delete a capture session
router.delete('/captures/:sessionId', mediaController.deleteSession);

// Update capture metadata
router.patch('/captures/:sessionId', mediaController.updateCaptureMetadata);

// Create a single MP4 file from all segments in a session
router.post('/captures/:sessionId/export', mediaController.createSessionMp4);

// Get list of all clips
router.get('/clips', mediaController.getAllClips);

// Create a clip from a capture
router.post('/clips/create', mediaController.createClip);

// Stream a clip
router.get('/clips/stream/:clipId', mediaController.streamClip);

// Download a clip
router.get('/clips/:clipId/download', mediaController.downloadClip);

// Create a compilation from multiple clips
router.post('/compilations/create', mediaController.createCompilation);

// Get list of all M3U8 URLs
router.get('/m3u8-history', mediaController.getM3U8History);

// Favorite an M3U8 URL
router.post('/m3u8-history/favorite', mediaController.favoriteM3U8);

// Get stream status for all M3U8 URLs
router.get('/stream-status', mediaController.getStreamStatuses);

// Get live streams only
router.get('/stream-status/live', mediaController.getLiveStreams);

// Force refresh stream statuses
router.post('/stream-status/refresh', mediaController.refreshStreamStatuses);

// Get status for a specific M3U8 URL
router.get('/stream-status/check', mediaController.getStreamStatus);

module.exports = router;