const fileService = require('../services/file.service');
const ffmpegService = require('../services/ffmpeg.service');
const streamStatusService = require('../services/stream-status.service');
const fs = require('fs');
const path = require('path');

// Delete a capture session
exports.deleteSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    await fileService.deleteSession(sessionId);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    return res.status(500).json({ error: error.message || 'Could not delete session' });
  }
};

// Update capture metadata
exports.updateCaptureMetadata = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const updates = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    if (!updates || Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const updatedMetadata = await fileService.updateCaptureMetadata(sessionId, updates);

    return res.status(200).json(updatedMetadata);
  } catch (error) {
    console.error('Error updating capture metadata:', error);
    return res.status(500).json({ error: error.message || 'Could not update capture metadata' });
  }
};

// Create a single MP4 file from all segments in a session
exports.createSessionMp4 = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { name } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const result = await ffmpegService.createSessionMp4(sessionId, name);

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error creating session MP4:', error);
    return res.status(500).json({ error: error.message || 'Could not create session MP4' });
  }
};

// Get list of all captures
exports.getAllCaptures = async (req, res) => {
  try {
    const captures = await fileService.getAllCaptures();
    
    return res.status(200).json(captures);
  } catch (error) {
    console.error('Error getting all captures:', error);
    return res.status(500).json({ error: error.message || 'Could not get captures' });
  }
};

// Get list of all clips
exports.getAllClips = async (req, res) => {
  try {
    const clips = await fileService.getAllClips();
    
    return res.status(200).json(clips);
  } catch (error) {
    console.error('Error getting all clips:', error);
    return res.status(500).json({ error: error.message || 'Could not get clips' });
  }
};

// Create a clip from a capture
exports.createClip = async (req, res) => {
  try {
    const { sessionId, startTime, endTime, name } = req.body;
    
    if (!sessionId || startTime === undefined || endTime === undefined) {
      return res.status(400).json({ error: 'Session ID, start time, and end time are required' });
    }
    
    const clipId = await ffmpegService.createClip(sessionId, startTime, endTime, name);
    
    return res.status(200).json({ clipId });
  } catch (error) {
    console.error('Error creating clip:', error);
    return res.status(500).json({ error: error.message || 'Could not create clip' });
  }
};

// Stream a clip
exports.streamClip = async (req, res) => {
  try {
    const { clipId } = req.params;

    if (!clipId) {
      return res.status(400).json({ error: 'Clip ID is required' });
    }

    const clipInfo = await fileService.getClipMetadata(clipId);

    if (!clipInfo) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const clipPath = clipInfo.path;

    if (!fs.existsSync(clipPath)) {
      return res.status(404).json({ error: 'Clip file not found' });
    }

    const stat = fs.statSync(clipPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      // Handle range request
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(clipPath, { start, end });

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4'
      });

      file.pipe(res);
    } else {
      // Handle normal request
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4'
      });

      fs.createReadStream(clipPath).pipe(res);
    }
  } catch (error) {
    console.error('Error streaming clip:', error);
    return res.status(500).json({ error: error.message || 'Could not stream clip' });
  }
};

// Download a clip
exports.downloadClip = async (req, res) => {
  try {
    const { clipId } = req.params;

    if (!clipId) {
      return res.status(400).json({ error: 'Clip ID is required' });
    }

    const clipInfo = await fileService.getClipMetadata(clipId);

    if (!clipInfo) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const clipPath = clipInfo.path;

    if (!fs.existsSync(clipPath)) {
      return res.status(404).json({ error: 'Clip file not found' });
    }

    // Get original file name
    const filename = path.basename(clipPath);
    const sanitizedName = clipInfo.name ? `${clipInfo.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4` : filename;

    // Set headers for download - using more explicit header names for compatibility
    res.set({
      'Content-Disposition': `attachment; filename="${sanitizedName}"`,
      'Content-Type': 'video/mp4',
      'Content-Length': fs.statSync(clipPath).size,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Accept-Ranges': 'bytes'
    });

    // Stream the file
    const fileStream = fs.createReadStream(clipPath);
    fileStream.on('error', (err) => {
      console.error('Error streaming file:', err);
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Error streaming file' });
      }
    });

    fileStream.pipe(res);
  } catch (error) {
    console.error('Error downloading clip:', error);
    return res.status(500).json({ error: error.message || 'Could not download clip' });
  }
};

// Create a compilation from multiple clips
exports.createCompilation = async (req, res) => {
  try {
    const { clipIds, name } = req.body;
    
    if (!clipIds || !Array.isArray(clipIds) || clipIds.length === 0) {
      return res.status(400).json({ error: 'At least one clip ID is required' });
    }
    
    const compilationId = await ffmpegService.createCompilation(clipIds, name);
    
    return res.status(200).json({ compilationId });
  } catch (error) {
    console.error('Error creating compilation:', error);
    return res.status(500).json({ error: error.message || 'Could not create compilation' });
  }
};

// Get list of all M3U8 URLs
exports.getM3U8History = async (req, res) => {
  try {
    const m3u8History = await fileService.getM3U8History();
    
    return res.status(200).json(m3u8History);
  } catch (error) {
    console.error('Error getting M3U8 history:', error);
    return res.status(500).json({ error: error.message || 'Could not get M3U8 history' });
  }
};

// Favorite an M3U8 URL
exports.favoriteM3U8 = async (req, res) => {
  try {
    const { m3u8Url, isFavorite } = req.body;
    
    if (!m3u8Url) {
      return res.status(400).json({ error: 'M3U8 URL is required' });
    }
    
    await fileService.favoriteM3U8(m3u8Url, isFavorite);
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error favoriting M3U8:', error);
    return res.status(500).json({ error: error.message || 'Could not favorite M3U8' });
  }
};

// Get stream status for all M3U8 URLs
exports.getStreamStatuses = async (req, res) => {
  try {
    const statuses = streamStatusService.getAllCachedStatuses();
    return res.status(200).json(statuses);
  } catch (error) {
    console.error('Error getting stream statuses:', error);
    return res.status(500).json({ error: error.message || 'Could not get stream statuses' });
  }
};

// Get live streams only
exports.getLiveStreams = async (req, res) => {
  try {
    const liveStreams = streamStatusService.getLiveStreams();
    return res.status(200).json(liveStreams);
  } catch (error) {
    console.error('Error getting live streams:', error);
    return res.status(500).json({ error: error.message || 'Could not get live streams' });
  }
};

// Force refresh stream statuses
exports.refreshStreamStatuses = async (req, res) => {
  try {
    await streamStatusService.refreshAllStatuses();
    const statuses = streamStatusService.getAllCachedStatuses();
    return res.status(200).json(statuses);
  } catch (error) {
    console.error('Error refreshing stream statuses:', error);
    return res.status(500).json({ error: error.message || 'Could not refresh stream statuses' });
  }
};

// Get status for a specific M3U8 URL
exports.getStreamStatus = async (req, res) => {
  try {
    const { m3u8Url } = req.query;
    
    if (!m3u8Url) {
      return res.status(400).json({ error: 'M3U8 URL is required' });
    }
    
    const status = streamStatusService.getCachedStatus(m3u8Url);
    
    if (!status) {
      // If not cached, check it now
      const freshStatus = await streamStatusService.checkStreamStatus(m3u8Url);
      return res.status(200).json(freshStatus);
    }
    
    return res.status(200).json(status);
  } catch (error) {
    console.error('Error getting stream status:', error);
    return res.status(500).json({ error: error.message || 'Could not get stream status' });
  }
};