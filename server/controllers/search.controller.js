const searchService = require('../services/search.service');

// Search transcripts
exports.searchTranscripts = async (req, res) => {
  try {
    const { query, filters } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await searchService.searchTranscripts(query, filters);
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error searching transcripts:', error);
    return res.status(500).json({ error: error.message || 'Could not search transcripts' });
  }
};

// Search media by metadata
exports.searchMedia = async (req, res) => {
  try {
    const { query, filters } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await searchService.searchMedia(query, filters);
    
    return res.status(200).json(results);
  } catch (error) {
    console.error('Error searching media:', error);
    return res.status(500).json({ error: error.message || 'Could not search media' });
  }
};