const scraperService = require('../services/scraper.service');

// Find M3U8 URL from stream page URL
exports.findM3U8 = async (req, res) => {
  try {
    const { streamPageUrl } = req.body;
    
    if (!streamPageUrl) {
      return res.status(400).json({ error: 'Stream page URL is required' });
    }
    
    const m3u8Url = await scraperService.findM3U8(streamPageUrl);
    
    return res.status(200).json({ m3u8Url });
  } catch (error) {
    console.error('Error finding M3U8 URL:', error);
    return res.status(500).json({ error: error.message || 'Could not find M3U8 URL' });
  }
};