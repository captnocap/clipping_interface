const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const fileService = require("./file.service");
const whisperService = require("./whisper.service");

// Format file size to human-readable format
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Store active capture processes
const activeCaptures = new Map();

/**
 * Generate a unique session ID
 * @returns {string} - Session ID
 */
const generateSessionId = () => {
  return crypto.randomBytes(8).toString("hex");
};

/**
 * Create directory for capture session
 * @param {string} sessionId - Session ID
 * @param {string} streamerName - Streamer name or identifier
 * @param {string} m3u8Url - M3U8 URL
 * @returns {string} - Session directory path
 */
const createSessionDirectory = async (sessionId, streamerName, m3u8Url) => {
  // Create a hash of the M3U8 URL for the directory structure
  const m3u8Hash = crypto
    .createHash("md5")
    .update(m3u8Url)
    .digest("hex")
    .substring(0, 10);

  // Create directory name based on streamer name or hash
  const streamerDirName = streamerName
    ? streamerName.replace(/[^a-z0-9]/gi, "_").toLowerCase()
    : m3u8Hash;

  // Create timestamp for session
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  // Create session directory path
  const baseDir = path.join(__dirname, "..", "clips_library");
  const streamerDir = path.join(baseDir, streamerDirName);
  const sessionDir = path.join(streamerDir, timestamp);

  // Create directories if they don't exist
  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true });
  if (!fs.existsSync(streamerDir))
    fs.mkdirSync(streamerDir, { recursive: true });
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  // Create subdirectories
  fs.mkdirSync(path.join(sessionDir, "segments"), { recursive: true });
  fs.mkdirSync(path.join(sessionDir, "clips"), { recursive: true });
  fs.mkdirSync(path.join(sessionDir, "transcripts"), { recursive: true });
  fs.mkdirSync(path.join(sessionDir, "compilations"), { recursive: true });

  // Store session metadata
  const metadata = {
    sessionId,
    streamerName,
    m3u8Url,
    timestamp,
    status: "active",
  };

  await fileService.saveSessionMetadata(sessionDir, metadata);

  return sessionDir;
};

/**
 * Start capturing an M3U8 stream
 * @param {string} m3u8Url - M3U8 URL
 * @param {Object} options - Capture options
 * @param {string} options.streamerName - Streamer name
 * @param {Object} options.ffmpegSettings - FFmpeg settings
 * @param {boolean} options.autoTranscribe - Auto transcribe flag
 * @param {string} options.namingConvention - Naming convention template
 * @returns {Promise<string>} - Session ID
 */
exports.startCapture = async (m3u8Url, options = {}) => {
  try {
    const {
      streamerName,
      ffmpegSettings = {},
      autoTranscribe = false,
      namingConvention,
    } = options;

    // Generate session ID
    const sessionId = generateSessionId();

    // Create session directory
    const sessionDir = await createSessionDirectory(
      sessionId,
      streamerName,
      m3u8Url
    );

    // Setup logs file
    const logsPath = path.join(sessionDir, "capture_logs.txt");
    const logsStream = fs.createWriteStream(logsPath, { flags: "a" });

    // Add M3U8 URL to history
    await fileService.addM3U8ToHistory(m3u8Url, streamerName);

    // Create FFmpeg command
    const segmentPattern = path.join(sessionDir, "segments", "segment_%03d.ts");
    const segmentListFile = path.join(sessionDir, "segments", "segments.txt");

    // Ensure segments directory exists
    if (!fs.existsSync(path.join(sessionDir, "segments"))) {
      fs.mkdirSync(path.join(sessionDir, "segments"), { recursive: true });
    }

    // Default FFmpeg settings
    const {
      segmentDuration = 60,
      videoCodec = "copy",
      audioCodec = "copy",
      format = "mp4", // Changed default to mp4
    } = ffmpegSettings;

    // Build FFmpeg command
    const ffmpegArgs = [
      "-i",
      m3u8Url,
      "-c:v",
      videoCodec,
      "-c:a",
      audioCodec,
      "-f",
      "segment",  // Using segment format for proper segmentation
      "-segment_time",
      segmentDuration.toString(),
      "-segment_list",
      segmentListFile,
      "-segment_format",
      "mpegts",
      "-reset_timestamps",
      "1",
      segmentPattern,
    ];

    // Spawn FFmpeg process
    const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

    // Store process info
    activeCaptures.set(sessionId, {
      process: ffmpegProcess,
      sessionDir,
      startTime: new Date(),
      m3u8Url,
      streamerName,
      autoTranscribe,
    });

    // Handle process output
    ffmpegProcess.stdout.on("data", (data) => {
      logsStream.write(`[STDOUT] ${data.toString()}\n`);
    });

    ffmpegProcess.stderr.on("data", (data) => {
      logsStream.write(`[STDERR] ${data.toString()}\n`);
    });

    ffmpegProcess.on("close", async (code) => {
      logsStream.write(`[INFO] FFmpeg process exited with code ${code}\n`);
      logsStream.end();

      activeCaptures.delete(sessionId);

      // Update session status
      await fileService.updateSessionStatus(sessionDir, "completed");

      // Auto-transcribe if enabled
      if (autoTranscribe) {
        try {
          logsStream.write("[INFO] Starting auto-transcription\n");
          await whisperService.startTranscription(sessionId);
        } catch (error) {
          logsStream.write(
            `[ERROR] Auto-transcription failed: ${error.message}\n`
          );
        }
      }
    });

    return sessionId;
  } catch (error) {
    console.error("Error starting capture:", error);
    throw error;
  }
};

/**
 * Stop a capture session
 * @param {string} sessionId - Session ID
 * @returns {Promise<void>}
 */
exports.stopCapture = async (sessionId) => {
  try {
    const captureInfo = activeCaptures.get(sessionId);

    if (!captureInfo) {
      throw new Error(`No active capture found with session ID: ${sessionId}`);
    }

    // Send SIGTERM to FFmpeg process
    captureInfo.process.kill("SIGTERM");

    // Wait for process to exit
    await new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!activeCaptures.has(sessionId)) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
    });

    return;
  } catch (error) {
    console.error("Error stopping capture:", error);
    throw error;
  }
};

/**
 * Get active captures
 * @returns {Promise<Array>} - List of active captures
 */
exports.getActiveCaptures = async () => {
  return Array.from(activeCaptures.entries()).map(([sessionId, info]) => ({
    sessionId,
    m3u8Url: info.m3u8Url,
    streamerName: info.streamerName,
    startTime: info.startTime,
    duration: Math.floor((new Date() - info.startTime) / 1000),
  }));
};

/**
 * Create a clip from a capture session
 * @param {string} sessionId - Session ID
 * @param {number} startTime - Start time in seconds
 * @param {number} endTime - End time in seconds
 * @param {string} name - Clip name
 * @returns {Promise<string>} - Clip ID
 */
exports.createClip = async (sessionId, startTime, endTime, name) => {
  try {
    // Find session directory
    const sessionDir = await fileService.getSessionDirectory(sessionId);
    if (!sessionDir) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Generate clip ID
    const clipId = crypto.randomBytes(8).toString("hex");

    // Create clip name
    const clipName = name || `clip_${startTime}_${endTime}`;
    const sanitizedName = clipName.replace(/[^a-z0-9]/gi, "_").toLowerCase();

    // Create clip file path
    const clipPath = path.join(
      sessionDir,
      "clips",
      `${sanitizedName}_${clipId}.mp4`
    );

    // Create FFmpeg command to merge segments
    const segmentsDir = path.join(sessionDir, "segments");
    const segmentListFile = path.join(segmentsDir, "segments.txt");

    // Check if segments.txt exists, if not try to generate it from existing segments
    if (!fs.existsSync(segmentListFile)) {
      console.log(
        `Segment list file not found at ${segmentListFile}, attempting to generate it...`
      );

      // Check if segments directory exists
      if (!fs.existsSync(segmentsDir)) {
        throw new Error(`Segments directory not found: ${segmentsDir}`);
      }

      // Find all .ts files in the segments directory
      const segmentFiles = fs
        .readdirSync(segmentsDir)
        .filter((file) => file.endsWith(".ts"))
        .sort((a, b) => {
          // Sort by segment number
          const numA = parseInt(a.match(/segment_(\d+)\.ts/)?.[1] || "0");
          const numB = parseInt(b.match(/segment_(\d+)\.ts/)?.[1] || "0");
          return numA - numB;
        });

      if (segmentFiles.length === 0) {
        throw new Error("No segment files found in segments directory");
      }

      // Generate segments.txt file
      const segmentPaths = segmentFiles.map((file) =>
        path.join(segmentsDir, file)
      );
      fs.writeFileSync(segmentListFile, segmentPaths.join("\n"), "utf8");
      console.log(
        `Generated segments.txt with ${segmentPaths.length} segments`
      );
    }

    // Get segment information to determine which segments to include
    const segmentList = fs
      .readFileSync(segmentListFile, "utf8")
      .split("\n")
      .filter(Boolean);

    // Create a temporary file list for FFmpeg
    const tempFileListPath = path.join(
      sessionDir,
      "clips",
      `temp_filelist_${clipId}.txt`
    );

    // Calculate which segments to include based on start and end times
    // This is a simplified approach and might need adjustment based on actual segment durations
    const segmentDuration = 60; // Assuming 60-second segments, adjust based on actual configuration
    const startSegment = Math.floor(startTime / segmentDuration);
    const endSegment = Math.ceil(endTime / segmentDuration);

    const relevantSegments = segmentList.slice(startSegment, endSegment + 1);
    if (relevantSegments.length === 0) {
      throw new Error("No segments found for the specified time range");
    }

    // Write segment paths to temporary file list
    // Make sure all paths are absolute for FFmpeg
    fs.writeFileSync(
      tempFileListPath,
      relevantSegments
        .map((segment) => {
          // If the path is already absolute, use it as is
          // Otherwise, construct an absolute path
          const absolutePath = path.isAbsolute(segment)
            ? segment
            : path.join(segmentsDir, path.basename(segment));
          return `file '${absolutePath}'`;
        })
        .join("\n"),
      "utf8"
    );

    // Setup FFmpeg command to extract the clip
    const ffmpegArgs = [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      tempFileListPath,
      "-ss",
      (startTime % segmentDuration).toString(),
      "-to",
      (endTime - startSegment * segmentDuration).toString(),
      "-c",
      "copy",
      clipPath,
    ];

    // Execute FFmpeg command
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      let stdoutData = "";
      let stderrData = "";

      ffmpegProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      ffmpegProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      ffmpegProcess.on("close", async (code) => {
        // Remove temporary file list
        fs.unlinkSync(tempFileListPath);

        if (code === 0) {
          // Save clip metadata
          const metadata = {
            clipId,
            sessionId,
            name: clipName,
            startTime,
            endTime,
            duration: endTime - startTime,
            path: clipPath,
            createdAt: new Date().toISOString(),
          };

          await fileService.saveClipMetadata(sessionDir, clipId, metadata);

          resolve(clipId);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderrData}`));
        }
      });
    });
  } catch (error) {
    console.error("Error creating clip:", error);
    throw error;
  }
};

/**
 * Create a single MP4 file from all segments in a session
 * @param {string} sessionId - Session ID
 * @param {string} name - Output file name (optional)
 * @returns {Promise<Object>} - Result with file path and id
 */
exports.createSessionMp4 = async (sessionId, name) => {
  try {
    const sessionDir = await fileService.getSessionDirectory(sessionId);

    if (!sessionDir) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Get session metadata
    const metadataPath = path.join(sessionDir, 'metadata.json');
    if (!fs.existsSync(metadataPath)) {
      throw new Error('Session metadata file not found');
    }

    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    const streamerName = metadata.streamerName || 'unknown';

    // Generate a unique ID for the output file
    const outputId = crypto.randomBytes(8).toString('hex');

    // Create a descriptive name if not provided
    if (!name) {
      const date = new Date();
      const dateStr = `${date.getFullYear()}_${(date.getMonth() + 1).toString().padStart(2, '0')}_${date.getDate().toString().padStart(2, '0')}`;
      const timeStr = `${date.getHours().toString().padStart(2, '0')}_${date.getMinutes().toString().padStart(2, '0')}`;
      name = `${streamerName}_full_${dateStr}_${timeStr}`;
    }

    // Sanitize the name
    const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();

    // Find all segments
    const segmentsDir = path.join(sessionDir, 'segments');

    if (!fs.existsSync(segmentsDir)) {
      throw new Error('Segments directory not found');
    }

    // Check if segments.txt exists, if not create it
    const segmentListFile = path.join(segmentsDir, 'segments.txt');

    if (!fs.existsSync(segmentListFile)) {
      console.log(`Segment list file not found at ${segmentListFile}, generating it...`);

      // Find all .ts files in the segments directory
      const segmentFiles = fs.readdirSync(segmentsDir)
        .filter(file => file.endsWith('.ts'))
        .sort((a, b) => {
          // Sort by segment number
          const numA = parseInt(a.match(/segment_(\d+)\.ts/)?.[1] || '0');
          const numB = parseInt(b.match(/segment_(\d+)\.ts/)?.[1] || '0');
          return numA - numB;
        });

      if (segmentFiles.length === 0) {
        throw new Error('No segment files found in segments directory');
      }

      // Generate segments.txt file
      const segmentPaths = segmentFiles.map(file => path.join(segmentsDir, file));
      fs.writeFileSync(segmentListFile, segmentPaths.join('\n'), 'utf8');
      console.log(`Generated segments.txt with ${segmentPaths.length} segments`);
    }

    // Create output directories if they don't exist
    const outputDir = path.join(sessionDir, 'full_exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Set output path
    const outputPath = path.join(outputDir, `${sanitizedName}_${outputId}.mp4`);

    // Setup FFmpeg command to concatenate all segments
    const ffmpegArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', segmentListFile,
      '-c:v', 'copy',  // Copy video codec
      '-c:a', 'aac',   // Convert audio to AAC (more compatible)
      '-strict', 'experimental',
      outputPath
    ];

    // Execute FFmpeg command
    console.log(`Starting FFmpeg with command: ffmpeg ${ffmpegArgs.join(' ')}`);

    await new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);

      let stderr = '';

      ffmpegProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.log(`FFmpeg: ${data.toString()}`);
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr}`));
        }
      });
    });

    // Create metadata
    const outputMetadata = {
      id: outputId,
      name: sanitizedName,
      path: outputPath,
      createdAt: new Date().toISOString(),
      sessionId: sessionId,
      size: fs.statSync(outputPath).size,
      displaySize: formatFileSize(fs.statSync(outputPath).size)
    };

    // Save metadata
    const outputMetadataPath = path.join(outputDir, `${outputId}_metadata.json`);
    fs.writeFileSync(outputMetadataPath, JSON.stringify(outputMetadata, null, 2), 'utf8');

    return outputMetadata;
  } catch (error) {
    console.error('Error creating session MP4:', error);
    throw error;
  }
};

/**
 * Create a compilation from multiple clips
 * @param {Array<string>} clipIds - Array of clip IDs
 * @param {string} name - Compilation name
 * @returns {Promise<string>} - Compilation ID
 */
exports.createCompilation = async (clipIds, name) => {
  try {
    if (!clipIds || clipIds.length === 0) {
      throw new Error("No clip IDs provided");
    }

    // Get clip information for all clips
    const clipsInfo = await Promise.all(
      clipIds.map((clipId) => fileService.getClipMetadata(clipId))
    );

    // Verify all clips were found
    if (clipsInfo.some((info) => !info)) {
      throw new Error("One or more clips not found");
    }

    // Get session directory from the first clip (assuming all clips are from same session)
    const sessionDir = path.dirname(path.dirname(clipsInfo[0].path));

    // Generate compilation ID
    const compilationId = crypto.randomBytes(8).toString("hex");

    // Create compilation name
    const compilationName = name || `compilation_${compilationId}`;
    const sanitizedName = compilationName
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase();

    // Create compilation file path
    const compilationPath = path.join(
      sessionDir,
      "compilations",
      `${sanitizedName}_${compilationId}.mp4`
    );

    // Create a temporary file list for FFmpeg
    const tempFileListPath = path.join(
      sessionDir,
      "compilations",
      `temp_filelist_${compilationId}.txt`
    );

    // Write clip paths to temporary file list
    fs.writeFileSync(
      tempFileListPath,
      clipsInfo.map((clip) => `file '${clip.path}'`).join("\n"),
      "utf8"
    );

    // Setup FFmpeg command to concatenate clips
    const ffmpegArgs = [
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      tempFileListPath,
      "-c",
      "copy",
      compilationPath,
    ];

    // Execute FFmpeg command
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

      let stdoutData = "";
      let stderrData = "";

      ffmpegProcess.stdout.on("data", (data) => {
        stdoutData += data.toString();
      });

      ffmpegProcess.stderr.on("data", (data) => {
        stderrData += data.toString();
      });

      ffmpegProcess.on("close", async (code) => {
        // Remove temporary file list
        fs.unlinkSync(tempFileListPath);

        if (code === 0) {
          // Calculate total duration
          const totalDuration = clipsInfo.reduce(
            (sum, clip) => sum + clip.duration,
            0
          );

          // Save compilation metadata
          const metadata = {
            compilationId,
            name: compilationName,
            clipIds,
            duration: totalDuration,
            path: compilationPath,
            createdAt: new Date().toISOString(),
          };

          await fileService.saveCompilationMetadata(
            sessionDir,
            compilationId,
            metadata
          );

          resolve(compilationId);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderrData}`));
        }
      });
    });
  } catch (error) {
    console.error("Error creating compilation:", error);
    throw error;
  }
};
