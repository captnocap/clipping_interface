const fs = require('fs');
const path = require('path');
const util = require('util');

// Promisify fs functions
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);
const stat = util.promisify(fs.stat);
const rmdir = util.promisify(fs.rmdir);
const unlink = util.promisify(fs.unlink);

// Format file size to human-readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Data file paths
const DATA_DIR = path.join(__dirname, '..', 'data');
const M3U8_HISTORY_FILE = path.join(DATA_DIR, 'm3u8_history.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Save session metadata
 * @param {string} sessionDir - Session directory path
 * @param {Object} metadata - Session metadata
 * @returns {Promise<void>}
 */
exports.saveSessionMetadata = async (sessionDir, metadata) => {
  try {
    const metadataPath = path.join(sessionDir, 'metadata.json');
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving session metadata:', error);
    throw error;
  }
};

/**
 * Update session status
 * @param {string} sessionDir - Session directory path
 * @param {string} status - New status
 * @returns {Promise<void>}
 */
exports.updateSessionStatus = async (sessionDir, status) => {
  try {
    const metadataPath = path.join(sessionDir, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      throw new Error('Session metadata file not found');
    }
    
    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    metadata.status = status;
    
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error) {
    console.error('Error updating session status:', error);
    throw error;
  }
};

/**
 * Add M3U8 URL to history
 * @param {string} m3u8Url - M3U8 URL
 * @param {string} streamerName - Streamer name
 * @returns {Promise<void>}
 */
exports.addM3U8ToHistory = async (m3u8Url, streamerName) => {
  try {
    let history = [];
    
    // Read existing history
    if (fs.existsSync(M3U8_HISTORY_FILE)) {
      history = JSON.parse(await readFile(M3U8_HISTORY_FILE, 'utf8'));
    }
    
    // Check if URL already exists
    const existingIndex = history.findIndex(item => item.url === m3u8Url);
    
    if (existingIndex !== -1) {
      // Update existing entry
      history[existingIndex].lastUsed = new Date().toISOString();
      history[existingIndex].useCount = (history[existingIndex].useCount || 0) + 1;
      
      // Update streamer name if provided
      if (streamerName && !history[existingIndex].streamerName) {
        history[existingIndex].streamerName = streamerName;
      }
    } else {
      // Add new entry
      history.push({
        url: m3u8Url,
        streamerName,
        added: new Date().toISOString(),
        lastUsed: new Date().toISOString(),
        useCount: 1,
        isFavorite: false
      });
    }
    
    // Sort by last used (most recent first)
    history.sort((a, b) => new Date(b.lastUsed) - new Date(a.lastUsed));
    
    // Write updated history
    await writeFile(M3U8_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Error adding M3U8 to history:', error);
    throw error;
  }
};

/**
 * Get session directory from session ID
 * @param {string} sessionId - Session ID
 * @returns {Promise<string|null>} - Session directory path or null if not found
 */
exports.getSessionDirectory = async (sessionId) => {
  try {
    const baseDir = path.join(__dirname, '..', 'clips_library');
    
    if (!fs.existsSync(baseDir)) {
      return null;
    }
    
    // Search for session directory
    const streamerDirs = await readdir(baseDir);
    
    for (const streamerDir of streamerDirs) {
      const streamerPath = path.join(baseDir, streamerDir);
      const stats = await stat(streamerPath);
      
      if (!stats.isDirectory()) {
        continue;
      }
      
      const sessionDirs = await readdir(streamerPath);
      
      for (const sessionDir of sessionDirs) {
        const sessionPath = path.join(streamerPath, sessionDir);
        const sessionStats = await stat(sessionPath);
        
        if (!sessionStats.isDirectory()) {
          continue;
        }
        
        const metadataPath = path.join(sessionPath, 'metadata.json');
        
        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
          
          if (metadata.sessionId === sessionId) {
            return sessionPath;
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting session directory:', error);
    throw error;
  }
};

/**
 * Get session logs
 * @param {string} sessionId - Session ID
 * @returns {Promise<string>} - Session logs
 */
exports.getSessionLogs = async (sessionId) => {
  try {
    const sessionDir = await exports.getSessionDirectory(sessionId);
    
    if (!sessionDir) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    const logsPath = path.join(sessionDir, 'capture_logs.txt');
    
    if (!fs.existsSync(logsPath)) {
      return '';
    }
    
    return await readFile(logsPath, 'utf8');
  } catch (error) {
    console.error('Error getting session logs:', error);
    throw error;
  }
};

/**
 * Save clip metadata
 * @param {string} sessionDir - Session directory path
 * @param {string} clipId - Clip ID
 * @param {Object} metadata - Clip metadata
 * @returns {Promise<void>}
 */
exports.saveClipMetadata = async (sessionDir, clipId, metadata) => {
  try {
    const clipsDir = path.join(sessionDir, 'clips');
    const metadataPath = path.join(clipsDir, `${clipId}_metadata.json`);
    
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving clip metadata:', error);
    throw error;
  }
};

/**
 * Get clip metadata
 * @param {string} clipId - Clip ID
 * @returns {Promise<Object|null>} - Clip metadata or null if not found
 */
exports.getClipMetadata = async (clipId) => {
  try {
    const baseDir = path.join(__dirname, '..', 'clips_library');
    
    if (!fs.existsSync(baseDir)) {
      return null;
    }
    
    // Search for clip metadata
    const streamerDirs = await readdir(baseDir);
    
    for (const streamerDir of streamerDirs) {
      const streamerPath = path.join(baseDir, streamerDir);
      const stats = await stat(streamerPath);
      
      if (!stats.isDirectory()) {
        continue;
      }
      
      const sessionDirs = await readdir(streamerPath);
      
      for (const sessionDir of sessionDirs) {
        const sessionPath = path.join(streamerPath, sessionDir);
        const sessionStats = await stat(sessionPath);
        
        if (!sessionStats.isDirectory()) {
          continue;
        }
        
        const clipsDir = path.join(sessionPath, 'clips');
        
        if (fs.existsSync(clipsDir)) {
          const clipFiles = await readdir(clipsDir);
          const metadataFile = clipFiles.find(file => file === `${clipId}_metadata.json`);
          
          if (metadataFile) {
            const metadataPath = path.join(clipsDir, metadataFile);
            return JSON.parse(await readFile(metadataPath, 'utf8'));
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting clip metadata:', error);
    throw error;
  }
};

/**
 * Save compilation metadata
 * @param {string} sessionDir - Session directory path
 * @param {string} compilationId - Compilation ID
 * @param {Object} metadata - Compilation metadata
 * @returns {Promise<void>}
 */
exports.saveCompilationMetadata = async (sessionDir, compilationId, metadata) => {
  try {
    const compilationsDir = path.join(sessionDir, 'compilations');
    const metadataPath = path.join(compilationsDir, `${compilationId}_metadata.json`);
    
    await writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving compilation metadata:', error);
    throw error;
  }
};

/**
 * Index transcript for search
 * @param {string} transcriptionId - Transcription ID
 * @param {Object} transcriptJson - Whisper JSON output
 * @returns {Promise<void>}
 */
exports.indexTranscript = async (transcriptionId, transcriptJson) => {
  try {
    // In a real implementation, this would use a more sophisticated indexing approach
    // For this example, we'll just save the transcript with an additional searchable property
    
    // Create a simple search index from the transcript
    const searchableText = transcriptJson.segments
      .map(segment => segment.text)
      .join(' ')
      .toLowerCase();
    
    const indexedTranscript = {
      ...transcriptJson,
      searchableText,
      transcriptionId
    };
    
    // Find where to save the indexed transcript
    let transcriptDir;
    
    // Check if this is a session transcription
    const sessionDir = await exports.getSessionDirectory(transcriptionId);
    
    if (sessionDir) {
      transcriptDir = path.join(sessionDir, 'transcripts');
    } else {
      // Check if this is a clip transcription
      const clipInfo = await exports.getClipMetadata(transcriptionId);
      
      if (clipInfo) {
        const sessionDir = path.dirname(path.dirname(clipInfo.path));
        transcriptDir = path.join(sessionDir, 'transcripts');
      } else {
        throw new Error(`Could not find location to save indexed transcript for: ${transcriptionId}`);
      }
    }
    
    // Save indexed transcript
    const indexPath = path.join(transcriptDir, `${transcriptionId}_transcript_index.json`);
    await writeFile(indexPath, JSON.stringify(indexedTranscript, null, 2), 'utf8');
  } catch (error) {
    console.error('Error indexing transcript:', error);
    throw error;
  }
};

/**
 * Find transcript path
 * @param {string} transcriptionId - Transcription ID
 * @returns {Promise<string|null>} - Transcript path or null if not found
 */
exports.findTranscriptPath = async (transcriptionId) => {
  try {
    // Check if this is a session transcription
    const sessionDir = await exports.getSessionDirectory(transcriptionId);
    
    if (sessionDir) {
      const transcriptPath = path.join(sessionDir, 'transcripts', `${transcriptionId}_transcript.json`);
      
      if (fs.existsSync(transcriptPath)) {
        return transcriptPath;
      }
    }
    
    // Check if this is a clip transcription
    const clipInfo = await exports.getClipMetadata(transcriptionId);
    
    if (clipInfo) {
      const sessionDir = path.dirname(path.dirname(clipInfo.path));
      const transcriptPath = path.join(sessionDir, 'transcripts', `${transcriptionId}_transcript.json`);
      
      if (fs.existsSync(transcriptPath)) {
        return transcriptPath;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error finding transcript path:', error);
    throw error;
  }
};

/**
 * Get transcript
 * @param {string} transcriptionId - Transcription ID
 * @returns {Promise<Object|null>} - Transcript or null if not found
 */
exports.getTranscript = async (transcriptionId) => {
  try {
    const transcriptPath = await exports.findTranscriptPath(transcriptionId);

    if (!transcriptPath) {
      return null;
    }

    return JSON.parse(await readFile(transcriptPath, 'utf8'));
  } catch (error) {
    console.error('Error getting transcript:', error);
    throw error;
  }
};

/**
 * Get transcript for a clip
 * @param {string} clipId - Clip ID
 * @returns {Promise<Object|null>} - Transcript or null if not found
 */
exports.getClipTranscript = async (clipId) => {
  try {
    const clipInfo = await exports.getClipMetadata(clipId);

    if (!clipInfo) {
      throw new Error(`Clip not found: ${clipId}`);
    }

    // Derive session directory from clip path
    const sessionDir = path.dirname(path.dirname(clipInfo.path));

    // Check if the clip has its own transcript
    const clipTranscriptPath = path.join(sessionDir, 'transcripts', `${clipId}_transcript.json`);

    if (fs.existsSync(clipTranscriptPath)) {
      const transcriptJson = JSON.parse(await readFile(clipTranscriptPath, 'utf8'));
      return transcriptJson;
    }

    // If no clip-specific transcript, return null
    // The controller will handle looking up session transcripts
    return null;
  } catch (error) {
    console.error('Error getting clip transcript:', error);
    throw error;
  }
};

/**
 * Get all captures
 * @returns {Promise<Array>} - List of all captures
 */
exports.getAllCaptures = async () => {
  try {
    const baseDir = path.join(__dirname, '..', 'clips_library');

    if (!fs.existsSync(baseDir)) {
      return [];
    }

    const captures = [];
    const streamerDirs = await readdir(baseDir);

    for (const streamerDir of streamerDirs) {
      const streamerPath = path.join(baseDir, streamerDir);
      const stats = await stat(streamerPath);

      if (!stats.isDirectory()) {
        continue;
      }

      const sessionDirs = await readdir(streamerPath);

      for (const sessionDir of sessionDirs) {
        const sessionPath = path.join(streamerPath, sessionDir);
        const sessionStats = await stat(sessionPath);

        if (!sessionStats.isDirectory()) {
          continue;
        }

        const metadataPath = path.join(sessionPath, 'metadata.json');

        if (fs.existsSync(metadataPath)) {
          const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));

          // Calculate directory size
          let totalSize = 0;
          const calculateSize = async (dirPath) => {
            const items = await readdir(dirPath);

            for (const item of items) {
              const itemPath = path.join(dirPath, item);
              const itemStats = await stat(itemPath);

              if (itemStats.isDirectory()) {
                await calculateSize(itemPath);
              } else {
                totalSize += itemStats.size;
              }
            }
          };

          await calculateSize(sessionPath);

          // Add session path and size to metadata
          captures.push({
            ...metadata,
            path: sessionPath,
            size: totalSize,
            displaySize: formatFileSize(totalSize)
          });
        }
      }
    }
    
    // Sort by start time (most recent first)
    captures.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    return captures;
  } catch (error) {
    console.error('Error getting all captures:', error);
    throw error;
  }
};

/**
 * Delete a capture session
 * @param {string} sessionId - Session ID
 * @returns {Promise<boolean>} - True if deleted successfully
 */
exports.deleteSession = async (sessionId) => {
  try {
    const sessionDir = await exports.getSessionDirectory(sessionId);

    if (!sessionDir) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Function to recursively delete a directory
    const deleteDirectory = async (dirPath) => {
      const items = await readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const itemStats = await stat(itemPath);

        if (itemStats.isDirectory()) {
          await deleteDirectory(itemPath);
        } else {
          await unlink(itemPath);
        }
      }

      await rmdir(dirPath);
    };

    await deleteDirectory(sessionDir);

    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

/**
 * Update capture metadata
 * @param {string} sessionId - Session ID
 * @param {Object} updates - Updates to apply to metadata
 * @returns {Promise<Object>} - Updated metadata
 */
exports.updateCaptureMetadata = async (sessionId, updates) => {
  try {
    const sessionDir = await exports.getSessionDirectory(sessionId);

    if (!sessionDir) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const metadataPath = path.join(sessionDir, 'metadata.json');

    if (!fs.existsSync(metadataPath)) {
      throw new Error('Session metadata file not found');
    }

    const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
    const updatedMetadata = { ...metadata, ...updates };

    await writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2), 'utf8');

    return updatedMetadata;
  } catch (error) {
    console.error('Error updating capture metadata:', error);
    throw error;
  }
};

/**
 * Get all clips
 * @returns {Promise<Array>} - List of all clips
 */
exports.getAllClips = async () => {
  try {
    const baseDir = path.join(__dirname, '..', 'clips_library');
    
    if (!fs.existsSync(baseDir)) {
      return [];
    }
    
    const clips = [];
    const streamerDirs = await readdir(baseDir);
    
    for (const streamerDir of streamerDirs) {
      const streamerPath = path.join(baseDir, streamerDir);
      const stats = await stat(streamerPath);
      
      if (!stats.isDirectory()) {
        continue;
      }
      
      const sessionDirs = await readdir(streamerPath);
      
      for (const sessionDir of sessionDirs) {
        const sessionPath = path.join(streamerPath, sessionDir);
        const sessionStats = await stat(sessionPath);
        
        if (!sessionStats.isDirectory()) {
          continue;
        }
        
        const clipsDir = path.join(sessionPath, 'clips');
        
        if (!fs.existsSync(clipsDir)) {
          continue;
        }
        
        const clipFiles = await readdir(clipsDir);
        const metadataFiles = clipFiles.filter(file => file.endsWith('_metadata.json'));
        
        for (const metadataFile of metadataFiles) {
          const metadataPath = path.join(clipsDir, metadataFile);
          const clipMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));
          
          clips.push(clipMetadata);
        }
      }
    }
    
    // Sort by creation time (most recent first)
    clips.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return clips;
  } catch (error) {
    console.error('Error getting all clips:', error);
    throw error;
  }
};

/**
 * Get M3U8 history
 * @returns {Promise<Array>} - M3U8 history
 */
exports.getM3U8History = async () => {
  try {
    if (!fs.existsSync(M3U8_HISTORY_FILE)) {
      return [];
    }
    
    return JSON.parse(await readFile(M3U8_HISTORY_FILE, 'utf8'));
  } catch (error) {
    console.error('Error getting M3U8 history:', error);
    throw error;
  }
};

/**
 * Favorite M3U8 URL
 * @param {string} m3u8Url - M3U8 URL
 * @param {boolean} isFavorite - Favorite flag
 * @returns {Promise<void>}
 */
exports.favoriteM3U8 = async (m3u8Url, isFavorite) => {
  try {
    if (!fs.existsSync(M3U8_HISTORY_FILE)) {
      throw new Error('M3U8 history file not found');
    }
    
    const history = JSON.parse(await readFile(M3U8_HISTORY_FILE, 'utf8'));
    
    const existingIndex = history.findIndex(item => item.url === m3u8Url);
    
    if (existingIndex === -1) {
      throw new Error(`M3U8 URL not found in history: ${m3u8Url}`);
    }
    
    history[existingIndex].isFavorite = !!isFavorite;
    
    await writeFile(M3U8_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error('Error favoriting M3U8:', error);
    throw error;
  }
};