const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');

// Search transcripts
router.post('/transcripts', searchController.searchTranscripts);

// Search media by metadata
router.post('/media', searchController.searchMedia);

module.exports = router;