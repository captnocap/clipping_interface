const ffmpegService = require('../services/ffmpeg.service');
const fileService = require('../services/file.service');

// Start capture session
exports.startCapture = async (req, res) => {
  try {
    const { m3u8Url, streamerName, ffmpegSettings, autoTranscribe, namingConvention } = req.body;
    
    if (!m3u8Url) {
      return res.status(400).json({ error: 'M3U8 URL is required' });
    }
    
    const sessionId = await ffmpegService.startCapture(m3u8Url, {
      streamerName,
      ffmpegSettings,
      autoTranscribe,
      namingConvention
    });
    
    return res.status(200).json({ sessionId });
  } catch (error) {
    console.error('Error starting capture:', error);
    return res.status(500).json({ error: error.message || 'Could not start capture' });
  }
};

// Stop capture session
exports.stopCapture = async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    await ffmpegService.stopCapture(sessionId);
    
    return res.status(200).json({ success: true, message: 'Capture stopped successfully' });
  } catch (error) {
    console.error('Error stopping capture:', error);
    return res.status(500).json({ error: error.message || 'Could not stop capture' });
  }
};

// Get capture status
exports.getCaptureStatus = async (req, res) => {
  try {
    const activeCaptures = await ffmpegService.getActiveCaptures();
    
    return res.status(200).json({
      activeCaptures,
      count: activeCaptures.length
    });
  } catch (error) {
    console.error('Error getting capture status:', error);
    return res.status(500).json({ error: error.message || 'Could not get capture status' });
  }
};

// Get session logs
exports.getSessionLogs = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const logs = await fileService.getSessionLogs(sessionId);
    
    return res.status(200).json({ logs });
  } catch (error) {
    console.error('Error getting session logs:', error);
    return res.status(500).json({ error: error.message || 'Could not get session logs' });
  }
};