const https = require('https');
const http = require('http');
const url = require('url');
const fileService = require('./file.service');

// Store stream status cache
const streamStatusCache = new Map();
const statusCheckInterval = 60000; // Check every minute
let statusCheckTimer = null;

/**
 * Check if an M3U8 stream is currently live
 * @param {string} m3u8Url - M3U8 URL to check
 * @returns {Promise<Object>} - { isLive: boolean, lastChecked: Date, error?: string }
 */
async function checkStreamStatus(m3u8Url) {
  return new Promise((resolve) => {
    try {
      const parsedUrl = url.parse(m3u8Url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.path,
        method: 'HEAD',
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Stream-Clipper/1.0'
        }
      };

      const req = client.request(options, (res) => {
        const isLive = res.statusCode >= 200 && res.statusCode < 400;
        resolve({
          isLive,
          lastChecked: new Date(),
          statusCode: res.statusCode
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          isLive: false,
          lastChecked: new Date(),
          error: 'Request timeout'
        });
      });

      req.on('error', (err) => {
        resolve({
          isLive: false,
          lastChecked: new Date(),
          error: err.message
        });
      });

      req.end();
    } catch (error) {
      resolve({
        isLive: false,
        lastChecked: new Date(),
        error: error.message
      });
    }
  });
}

/**
 * Check status of all M3U8 URLs in history
 * @returns {Promise<Map>} - Map of URL to status object
 */
async function checkAllStreamStatuses() {
  try {
    const m3u8History = await fileService.getM3U8History();
    const statusPromises = m3u8History.map(async (entry) => {
      const status = await checkStreamStatus(entry.url);
      return {
        url: entry.url,
        streamerName: entry.streamerName,
        ...status
      };
    });

    const results = await Promise.all(statusPromises);
    
    // Update cache
    results.forEach(result => {
      streamStatusCache.set(result.url, result);
    });

    console.log(`Checked ${results.length} streams, ${results.filter(r => r.isLive).length} are live`);
    return streamStatusCache;
  } catch (error) {
    console.error('Error checking stream statuses:', error);
    return streamStatusCache;
  }
}

/**
 * Get cached status for a specific URL
 * @param {string} m3u8Url - M3U8 URL
 * @returns {Object|null} - Cached status or null if not found
 */
function getCachedStatus(m3u8Url) {
  return streamStatusCache.get(m3u8Url) || null;
}

/**
 * Get all cached statuses
 * @returns {Array} - Array of all cached statuses
 */
function getAllCachedStatuses() {
  return Array.from(streamStatusCache.values());
}

/**
 * Get only live streams
 * @returns {Array} - Array of live stream statuses
 */
function getLiveStreams() {
  return Array.from(streamStatusCache.values()).filter(status => status.isLive);
}

/**
 * Start the periodic status checking
 */
function startStatusChecking() {
  if (statusCheckTimer) {
    clearInterval(statusCheckTimer);
  }

  // Check immediately on start
  checkAllStreamStatuses();

  // Then check periodically
  statusCheckTimer = setInterval(() => {
    checkAllStreamStatuses();
  }, statusCheckInterval);

  console.log('Stream status checking started');
}

/**
 * Stop the periodic status checking
 */
function stopStatusChecking() {
  if (statusCheckTimer) {
    clearInterval(statusCheckTimer);
    statusCheckTimer = null;
    console.log('Stream status checking stopped');
  }
}

/**
 * Force refresh all stream statuses
 * @returns {Promise<Map>} - Updated status cache
 */
async function refreshAllStatuses() {
  console.log('Force refreshing all stream statuses...');
  return await checkAllStreamStatuses();
}

module.exports = {
  checkStreamStatus,
  checkAllStreamStatuses,
  getCachedStatus,
  getAllCachedStatuses,
  getLiveStreams,
  startStatusChecking,
  stopStatusChecking,
  refreshAllStatuses
};