const express = require('express');
const configController = require('../controllers/config.controller');

const router = express.Router();

// Get application configuration
router.get('/', configController.getConfig);

// Save application configuration
router.post('/', configController.saveConfig);

// Get Whisper status
router.get('/whisper/status', configController.getWhisperStatus);

// Install Whisper
router.post('/whisper/install', configController.installWhisper);

module.exports = router;