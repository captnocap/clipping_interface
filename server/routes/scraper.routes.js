const express = require('express');
const router = express.Router();
const scraperController = require('../controllers/scraper.controller');

// Find M3U8 URL from stream page URL
router.post('/find-m3u8', scraperController.findM3U8);

module.exports = router;