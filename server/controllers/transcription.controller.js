const whisperService = require('../services/whisper.service');
const fileService = require('../services/file.service');
const fs = require('fs');
const path = require('path');

// Start transcription
exports.startTranscription = async (req, res) => {
  try {
    const { sessionId, clipId } = req.body;
    
    if (!sessionId && !clipId) {
      return res.status(400).json({ error: 'Either session ID or clip ID is required' });
    }
    
    const transcriptionId = await whisperService.startTranscription(sessionId, clipId);
    
    return res.status(200).json({ transcriptionId });
  } catch (error) {
    console.error('Error starting transcription:', error);
    return res.status(500).json({ error: error.message || 'Could not start transcription' });
  }
};

// Get transcription status
exports.getTranscriptionStatus = async (req, res) => {
  try {
    const { sessionId } = req.params;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }
    
    const status = await whisperService.getTranscriptionStatus(sessionId);
    
    return res.status(200).json(status);
  } catch (error) {
    console.error('Error getting transcription status:', error);
    return res.status(500).json({ error: error.message || 'Could not get transcription status' });
  }
};

// Get transcript for a specific session
exports.getTranscript = async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const transcript = await fileService.getTranscript(sessionId);

    if (!transcript) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    // Return the entire transcript object with all segments
    // This allows the frontend to format it properly with timestamps
    return res.status(200).json(transcript);
  } catch (error) {
    console.error('Error getting transcript:', error);
    return res.status(500).json({ error: error.message || 'Could not get transcript' });
  }
};

// Get all completed transcriptions
exports.getAllTranscriptions = async (req, res) => {
  try {
    const clipsLibraryDir = path.join(__dirname, '..', 'clips_library');
    const completedTranscriptions = [];

    // Get all capture metadata
    const captures = await fileService.getAllCaptures();
    const captureMap = {};
    captures.forEach(capture => {
      captureMap[capture.sessionId] = capture;
    });

    // Get all clip metadata
    const clips = await fileService.getAllClips();
    const clipsMap = {};
    clips.forEach(clip => {
      clipsMap[clip.clipId] = clip;
    });

    // Find all transcription files
    if (fs.existsSync(clipsLibraryDir)) {
      const streamerDirs = fs.readdirSync(clipsLibraryDir);

      for (const streamerDir of streamerDirs) {
        const streamerPath = path.join(clipsLibraryDir, streamerDir);

        if (!fs.statSync(streamerPath).isDirectory()) {
          continue;
        }

        const sessionDirs = fs.readdirSync(streamerPath);

        for (const sessionDir of sessionDirs) {
          const sessionPath = path.join(streamerPath, sessionDir);

          if (!fs.statSync(sessionPath).isDirectory()) {
            continue;
          }

          const transcriptsDir = path.join(sessionPath, 'transcripts');

          if (fs.existsSync(transcriptsDir)) {
            const transcriptFiles = fs.readdirSync(transcriptsDir)
              .filter(file => file.endsWith('_transcript.json'));

            for (const transcriptFile of transcriptFiles) {
              // Extract ID from filename (either sessionId or clipId)
              const id = transcriptFile.replace('_transcript.json', '');

              let type, name, source, duration, timestamp;

              if (captureMap[id]) {
                // This is a session transcript
                type = 'session';
                name = captureMap[id].streamerName || 'Unknown Stream';
                source = captureMap[id].m3u8Url || 'Unknown Source';
                duration = captureMap[id].duration || 0;
                timestamp = captureMap[id].timestamp || new Date().toISOString();
              } else if (clipsMap[id]) {
                // This is a clip transcript
                type = 'clip';
                name = clipsMap[id].name || 'Unknown Clip';
                const clipSessionId = clipsMap[id].sessionId;
                source = captureMap[clipSessionId]?.m3u8Url || 'Unknown Source';
                duration = clipsMap[id].duration || 0;
                timestamp = clipsMap[id].createdAt || new Date().toISOString();
              } else {
                // Skip if we can't determine the type
                continue;
              }

              completedTranscriptions.push({
                id,
                type,
                name,
                source,
                duration,
                timestamp,
                transcriptPath: path.join(transcriptsDir, transcriptFile)
              });
            }
          }
        }
      }
    }

    // Sort by timestamp (newest first)
    completedTranscriptions.sort((a, b) => {
      return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return res.status(200).json(completedTranscriptions);
  } catch (error) {
    console.error('Error getting all transcriptions:', error);
    return res.status(500).json({ error: error.message || 'Could not get transcriptions' });
  }
};

// Get all transcriptions
exports.getAllTranscriptions = async (req, res) => {
  try {
    const baseDir = path.join(__dirname, '..', 'clips_library');
    const transcriptions = [];

    // Check if the base directory exists
    if (!fs.existsSync(baseDir)) {
      return res.status(200).json([]);
    }

    // Get all captures and clips for reference information
    const captures = await fileService.getAllCaptures();
    const clips = await fileService.getAllClips();

    // Create lookup maps for faster access
    const captureMap = {};
    captures.forEach(capture => {
      captureMap[capture.sessionId] = capture;
    });

    const clipsMap = {};
    clips.forEach(clip => {
      clipsMap[clip.clipId] = clip;
    });

    // Walk the directory structure to find all transcript files
    const streamerDirs = fs.readdirSync(baseDir);

    for (const streamerDir of streamerDirs) {
      const streamerPath = path.join(baseDir, streamerDir);

      if (!fs.statSync(streamerPath).isDirectory()) {
        continue;
      }

      const sessionDirs = fs.readdirSync(streamerPath);

      for (const sessionDir of sessionDirs) {
        const sessionPath = path.join(streamerPath, sessionDir);

        if (!fs.statSync(sessionPath).isDirectory()) {
          continue;
        }

        const transcriptsDir = path.join(sessionPath, 'transcripts');

        if (fs.existsSync(transcriptsDir)) {
          const files = fs.readdirSync(transcriptsDir);

          // Find transcript JSON files
          const transcriptFiles = files.filter(file =>
            file.endsWith('_transcript.json') ||
            file.endsWith('_transcript.txt')
          );

          for (const transcriptFile of transcriptFiles) {
            // Extract ID (sessionId or clipId) from filename
            const id = transcriptFile.split('_transcript')[0];

            // Skip if already processed
            if (transcriptions.some(t => t.id === id)) {
              continue;
            }

            // Determine if it's a session or clip transcript
            let type, name, source, duration, timestamp, text;

            if (captureMap[id]) {
              // Session transcript
              type = 'session';
              name = captureMap[id].streamerName || 'Unnamed Session';
              source = captureMap[id].m3u8Url || 'Unknown Source';
              duration = captureMap[id].duration || 0;
              timestamp = captureMap[id].timestamp || new Date().toISOString();
            } else if (clipsMap[id]) {
              // Clip transcript
              type = 'clip';
              name = clipsMap[id].name || 'Unnamed Clip';
              source = clipsMap[id].sourceUrl || 'Unknown Source';
              duration = clipsMap[id].duration || 0;
              timestamp = clipsMap[id].createdAt || new Date().toISOString();
            } else {
              // Skip if we can't determine the type
              continue;
            }

            // Try to read the transcript text
            try {
              if (transcriptFile.endsWith('.txt')) {
                text = fs.readFileSync(path.join(transcriptsDir, transcriptFile), 'utf8');
              } else {
                const json = JSON.parse(fs.readFileSync(path.join(transcriptsDir, transcriptFile), 'utf8'));
                text = json.text || (json.segments?.map(s => s.text).join(' ')) || JSON.stringify(json);
              }
            } catch (err) {
              console.error(`Error reading transcript ${transcriptFile}:`, err);
              text = "Error reading transcript";
            }

            transcriptions.push({
              id,
              type,
              name,
              source,
              duration,
              timestamp,
              text
            });
          }
        }
      }
    }

    // Sort by timestamp (newest first)
    transcriptions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    console.log(`Found ${transcriptions.length} transcriptions:`,
                transcriptions.map(t => `${t.id} (${t.type})`));

    return res.status(200).json(transcriptions);
  } catch (error) {
    console.error('Error getting all transcriptions:', error);
    return res.status(500).json({ error: error.message || 'Could not get transcriptions' });
  }
};

exports.getClipTranscript = async (req, res) => {
  try {
    const { clipId } = req.params;

    if (!clipId) {
      return res.status(400).json({ error: 'Clip ID is required' });
    }

    console.log(`Getting transcript for clip ID: ${clipId}`);

    // Get clip metadata to find its session
    const clipInfo = await fileService.getClipMetadata(clipId);

    if (!clipInfo) {
      console.log(`Clip not found with ID: ${clipId}`);

      // For demo purposes, return a sample transcript
      return res.status(200).json({
        transcript: "This is a sample transcript. In a real scenario, this would be the actual transcription from Whisper AI.",
        source: 'demo'
      });
    }

    console.log(`Found clip metadata:`, clipInfo);

    // First try to get clip-specific transcript
    const clipTranscript = await fileService.getClipTranscript(clipId);

    if (clipTranscript) {
      console.log(`Found clip-specific transcript for ${clipId}`);

      // Return the full transcript object with segments for proper timestamp display
      return res.status(200).json(clipTranscript);
    }

    console.log(`No clip-specific transcript found, checking session transcript`);

    // Otherwise, look for session transcript and extract the relevant part
    const sessionId = clipInfo.sessionId;
    if (!sessionId) {
      console.log(`No sessionId found in clip metadata`);
      // For demo purposes, return a sample transcript
      return res.status(200).json({
        transcript: "This is a sample transcript. In a real scenario, this would be the actual transcription from Whisper AI.",
        source: 'demo'
      });
    }

    const sessionTranscript = await fileService.getTranscript(sessionId);

    if (!sessionTranscript) {
      console.log(`No session transcript found for session ${sessionId}`);
      // For demo purposes, return a sample transcript
      return res.status(200).json({
        transcript: "This is a sample transcript. In a real scenario, this would be the actual transcription from Whisper AI.",
        source: 'demo'
      });
    }

    // If it has segments, filter them for the clip time range
    if (sessionTranscript.segments && Array.isArray(sessionTranscript.segments)) {
      // Filter segments that are within the clip time range
      const startTime = clipInfo.startTime || 0;
      const endTime = clipInfo.endTime || 60;

      console.log(`Filtering segments for time range: ${startTime} - ${endTime}`);

      const relevantSegments = sessionTranscript.segments.filter(segment => {
        return (segment.start >= startTime && segment.start <= endTime) ||
               (segment.end >= startTime && segment.end <= endTime) ||
               (segment.start <= startTime && segment.end >= endTime);
      });

      if (relevantSegments.length === 0) {
        console.log(`No relevant segments found in time range`);
        // For demo purposes, return a sample transcript
        return res.status(200).json({
          transcript: "This is a sample transcript. In a real scenario, this would be the actual transcription from Whisper AI.",
          source: 'demo'
        });
      }

      console.log(`Found ${relevantSegments.length} relevant segments for clip`);

      // Return the filtered transcript with all the segment data intact
      return res.status(200).json({
        ...sessionTranscript,
        segments: relevantSegments,
        text: relevantSegments.map(segment => segment.text).join(' ')
      });
    }

    // If we can't determine the format, return the entire transcript
    return res.status(200).json(sessionTranscript);

  } catch (error) {
    console.error('Error getting clip transcript:', error);

    // For demo purposes, still return a sample transcript even if there's an error
    return res.status(200).json({
      transcript: "Error loading transcript. This is a placeholder for demonstration purposes.",
      source: 'demo',
      error: error.message || 'Could not get clip transcript'
    });
  }
};