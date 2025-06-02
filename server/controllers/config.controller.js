const configService = require('../services/config.service');

// Get application configuration
exports.getConfig = async (req, res) => {
  try {
    const config = await configService.getConfig();
    return res.status(200).json(config);
  } catch (error) {
    console.error('Error getting config:', error);
    return res.status(500).json({ error: error.message || 'Could not get configuration' });
  }
};

// Save application configuration
exports.saveConfig = async (req, res) => {
  try {
    const config = req.body;
    
    if (!config) {
      return res.status(400).json({ error: 'Configuration data is required' });
    }
    
    const updatedConfig = await configService.saveConfig(config);
    return res.status(200).json(updatedConfig);
  } catch (error) {
    console.error('Error saving config:', error);
    return res.status(500).json({ error: error.message || 'Could not save configuration' });
  }
};

// Get Whisper status
exports.getWhisperStatus = async (req, res) => {
  try {
    const status = await configService.getWhisperStatus();
    return res.status(200).json(status);
  } catch (error) {
    console.error('Error getting Whisper status:', error);
    return res.status(500).json({ error: error.message || 'Could not get Whisper status' });
  }
};

// Install Whisper
exports.installWhisper = async (req, res) => {
  try {
    const result = await configService.installWhisper();
    return res.status(result.success ? 200 : 500).json(result);
  } catch (error) {
    console.error('Error installing Whisper:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Could not install Whisper',
      details: error.stack
    });
  }
};