const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Find M3U8 URL from a stream page URL
 * @param {string} streamPageUrl - URL of the stream page
 * @returns {Promise<string>} - M3U8 URL
 */
exports.findM3U8 = async (streamPageUrl) => {
  try {
    // Request the page content with a common user agent
    const response = await axios.get(streamPageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);
    
    // Strategy 1: Look for video tags with src attribute containing m3u8
    const videoTags = $('video').toArray();
    for (const video of videoTags) {
      const src = $(video).attr('src');
      if (src && src.includes('.m3u8')) {
        return src;
      }
      
      // Sometimes the source is in a child source tag
      const sources = $(video).find('source').toArray();
      for (const source of sources) {
        const sourceSrc = $(source).attr('src');
        if (sourceSrc && sourceSrc.includes('.m3u8')) {
          return sourceSrc;
        }
      }
    }
    
    // Strategy 2: Look for m3u8 in script tags (common for embedded players)
    const scriptTags = $('script').toArray();
    for (const script of scriptTags) {
      const content = $(script).html();
      if (content) {
        // Look for m3u8 URL patterns
        const m3u8Match = content.match(/["']((https?:\/\/|\/)([\w\.-]+\/)*(\w+\/)+[\w\.]+\.m3u8[\w\?\=\&\.\-\/]*)["']/i);
        if (m3u8Match && m3u8Match[1]) {
          return m3u8Match[1].replace(/["']/g, '');
        }
      }
    }
    
    // Strategy 3: Look for m3u8 URL in any element's attributes
    const m3u8InAttr = $('*').toArray().find(el => {
      const attribs = $(el).attr();
      return Object.values(attribs).some(attr => typeof attr === 'string' && attr.includes('.m3u8'));
    });
    
    if (m3u8InAttr) {
      const attribs = $(m3u8InAttr).attr();
      const m3u8Attr = Object.values(attribs).find(attr => typeof attr === 'string' && attr.includes('.m3u8'));
      if (m3u8Attr) {
        // Extract the m3u8 URL using a regex
        const m3u8Match = m3u8Attr.match(/(https?:\/\/[\w\.-]+\/)*(\w+\/)+[\w\.]+\.m3u8[\w\?\=\&\.\-\/]*/i);
        if (m3u8Match && m3u8Match[0]) {
          return m3u8Match[0];
        }
        return m3u8Attr;
      }
    }
    
    // Strategy 4: Look for m3u8 in the entire HTML (last resort)
    const fullHtmlMatch = html.match(/["']((https?:\/\/|\/)([\w\.-]+\/)*(\w+\/)+[\w\.]+\.m3u8[\w\?\=\&\.\-\/]*)["']/i);
    if (fullHtmlMatch && fullHtmlMatch[1]) {
      return fullHtmlMatch[1].replace(/["']/g, '');
    }
    
    throw new Error('Could not find M3U8 URL in the page content');
  } catch (error) {
    console.error('Error in findM3U8:', error);
    throw error;
  }
};