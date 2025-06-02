const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

// Config file path
const CONFIG_DIR = path.join(__dirname, '..', 'data');
const CONFIG_FILE = path.join(CONFIG_DIR, 'app_config.json');

// Default configuration
const DEFAULT_CONFIG = {
  ffmpegPath: '',
  whisperPath: '',
  outputPath: '',
  maxConcurrentCaptures: 3,
  defaultVideoCodec: 'copy',
  defaultAudioCodec: 'copy',
  defaultFormat: 'mp4',
  namingTemplate: '{streamer}_{date}_{time}',
  whisperModel: 'medium',
  whisperInstalled: false,
  whisperAutoSetup: false
};

// Ensure config directory exists
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}

// Initialize config file if it doesn't exist
if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf8');
}

/**
 * Get the current configuration
 * @returns {Promise<Object>} - Configuration object
 */
exports.getConfig = async () => {
  try {
    const configData = await fs.promises.readFile(CONFIG_FILE, 'utf8');
    const config = JSON.parse(configData);
    
    // Check if Whisper is installed
    config.whisperInstalled = await isWhisperInstalled();
    
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error('Error reading config:', error);
    return DEFAULT_CONFIG;
  }
};

/**
 * Save configuration
 * @param {Object} config - Configuration object to save
 * @returns {Promise<Object>} - Updated configuration
 */
exports.saveConfig = async (config) => {
  try {
    // Merge with existing config to ensure all fields exist
    const currentConfig = await exports.getConfig();
    const updatedConfig = { ...currentConfig, ...config };
    
    // Save to file
    await fs.promises.writeFile(CONFIG_FILE, JSON.stringify(updatedConfig, null, 2), 'utf8');
    
    return updatedConfig;
  } catch (error) {
    console.error('Error saving config:', error);
    throw error;
  }
};

/**
 * Check if Whisper is installed
 * @returns {Promise<boolean>} - True if Whisper is installed
 */
async function isWhisperInstalled() {
  try {
    // Try to check if the whisper module is installed via Python
    // This is more reliable than checking for the whisper command
    await execPromise('python3 -c "import whisper"');
    return true;
  } catch (error) {
    try {
      // Fallback to the command line check
      await execPromise('whisper --help');
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Install Whisper for non-technical users
 * @returns {Promise<Object>} - Installation result
 */
exports.installWhisper = async () => {
  try {
    // Check if Python is installed
    try {
      await execPromise('python3 --version');
    } catch (error) {
      return {
        success: false,
        step: 'python_check',
        message: 'Python 3 is not installed. Please install Python 3 before continuing.'
      };
    }

    // Check if pip is installed
    try {
      await execPromise('pip3 --version');
    } catch (error) {
      return {
        success: false,
        step: 'pip_check',
        message: 'pip3 is not installed. Please install pip3 before continuing.'
      };
    }

    // Install dependencies
    let output = '';
    try {
      output = 'Installing required packages...\n';
      const { stdout, stderr } = await execPromise('pip3 install --upgrade --user pip setuptools wheel');
      output += stdout + stderr;
    } catch (error) {
      return {
        success: false,
        step: 'dependencies',
        message: 'Failed to install dependencies.',
        details: error.message,
        output
      };
    }

    // Install Whisper
    try {
      output += '\nInstalling OpenAI Whisper...\n';
      const { stdout, stderr } = await execPromise('pip3 install --user openai-whisper');
      output += stdout + stderr;
    } catch (error) {
      return {
        success: false,
        step: 'whisper_install',
        message: 'Failed to install Whisper.',
        details: error.message,
        output
      };
    }

    // Install ffmpeg if not present
    try {
      await execPromise('ffmpeg -version');
    } catch (error) {
      output += '\nffmpeg not found, attempting to install...\n';
      try {
        // Try to determine the platform and install ffmpeg
        const { stdout: platformStdout } = await execPromise('uname -s');
        const platform = platformStdout.trim().toLowerCase();
        
        if (platform === 'linux') {
          // Check for apt (Debian/Ubuntu)
          try {
            await execPromise('apt -v');
            const { stdout, stderr } = await execPromise('sudo apt update && sudo apt install -y ffmpeg');
            output += stdout + stderr;
          } catch (aptError) {
            // Check for yum (RHEL/CentOS/Fedora)
            try {
              await execPromise('yum --version');
              const { stdout, stderr } = await execPromise('sudo yum install -y ffmpeg');
              output += stdout + stderr;
            } catch (yumError) {
              output += '\nCould not automatically install ffmpeg. Please install it manually.\n';
            }
          }
        } else if (platform === 'darwin') {
          // macOS - try with Homebrew
          try {
            await execPromise('brew --version');
            const { stdout, stderr } = await execPromise('brew install ffmpeg');
            output += stdout + stderr;
          } catch (brewError) {
            output += '\nCould not automatically install ffmpeg. Please install it manually.\n';
          }
        } else {
          output += `\nUnsupported platform: ${platform}. Please install ffmpeg manually.\n`;
        }
      } catch (platformError) {
        output += '\nCould not determine platform. Please install ffmpeg manually.\n';
      }
    }

    // Download base model
    try {
      output += '\nDownloading Whisper base model (this may take a while)...\n';
      const { stdout, stderr } = await execPromise('python3 -c "import whisper; whisper.load_model(\'base\')"');
      output += stdout + stderr;
    } catch (error) {
      return {
        success: false,
        step: 'model_download',
        message: 'Failed to download Whisper model.',
        details: error.message,
        output
      };
    }

    // Verify installation
    const installed = await isWhisperInstalled();

    // Update config regardless of installation result
    const config = await exports.getConfig();
    config.whisperInstalled = installed;
    config.whisperAutoSetup = installed;
    await exports.saveConfig(config);

    if (installed) {
      return {
        success: true,
        message: 'Whisper installed successfully!',
        output
      };
    } else {
      return {
        success: false,
        step: 'verification',
        message: 'Installation completed but Whisper could not be verified.',
        output
      };
    }
  } catch (error) {
    console.error('Error installing Whisper:', error);
    return {
      success: false,
      step: 'unknown',
      message: 'An unexpected error occurred during installation.',
      details: error.message
    };
  }
};

/**
 * Get Whisper installation status and details
 * @returns {Promise<Object>} - Whisper status
 */
exports.getWhisperStatus = async () => {
  try {
    const config = await exports.getConfig();

    // Check if Whisper is installed
    const installed = await isWhisperInstalled();

    // Update config if the installation status has changed
    if (config.whisperInstalled !== installed) {
      config.whisperInstalled = installed;
      await exports.saveConfig(config);
    }

    let modelsList = [];
    let modelInfo = {};

    if (installed) {
      try {
        // Try to get installed models
        const { stdout } = await execPromise('python3 -c "import whisper; import json; print(json.dumps([m for m in whisper.available_models()]))"');
        modelsList = JSON.parse(stdout.trim());

        // Get info about the current model
        const currentModel = config.whisperModel || 'base';
        try {
          const { stdout: modelInfoStdout } = await execPromise(`python3 -c "import whisper; import json; model = whisper.load_model('${currentModel}'); print(json.dumps({'dims': model.dims.__dict__, 'is_multilingual': model.is_multilingual}))" 2>/dev/null`);
          modelInfo = JSON.parse(modelInfoStdout.trim());
        } catch (modelError) {
          console.error('Error loading Whisper model:', modelError);
          // Try with base model as fallback
          try {
            const { stdout: fallbackStdout } = await execPromise(`python3 -c "import whisper; import json; model = whisper.load_model('base'); print(json.dumps({'dims': model.dims.__dict__, 'is_multilingual': model.is_multilingual}))" 2>/dev/null`);
            modelInfo = JSON.parse(fallbackStdout.trim());
          } catch (fallbackError) {
            console.error('Error loading fallback model:', fallbackError);
          }
        }
      } catch (error) {
        console.error('Error getting Whisper models:', error);
      }
    }

    return {
      installed,
      autoSetup: config.whisperAutoSetup || false,
      currentModel: config.whisperModel || 'base',
      availableModels: modelsList,
      modelInfo
    };
  } catch (error) {
    console.error('Error getting Whisper status:', error);
    throw error;
  }
};