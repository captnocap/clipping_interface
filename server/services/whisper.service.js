const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const fileService = require('./file.service');

// Store active transcription processes
const activeTranscriptions = new Map();

/**
 * Start transcription for a session or clip
 * @param {string} sessionId - Session ID (optional if clipId is provided)
 * @param {string} clipId - Clip ID (optional if sessionId is provided)
 * @returns {Promise<string>} - Transcription ID (same as sessionId or clipId)
 */
exports.startTranscription = async (sessionId, clipId) => {
  try {
    if (!sessionId && !clipId) {
      throw new Error('Either session ID or clip ID is required');
    }
    
    // Determine if we're transcribing a session or a clip
    let audioSource, transcriptionId, outputDir;
    
    if (sessionId) {
      // Transcribing a full session
      transcriptionId = sessionId;
      const sessionDir = await fileService.getSessionDirectory(sessionId);
      
      if (!sessionDir) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      // Concatenate all segment files for transcription
      const segmentsDir = path.join(sessionDir, 'segments');
      const segmentListFile = path.join(segmentsDir, 'segments.txt');

      // Check if segments.txt exists, if not try to generate it from existing segments
      if (!fs.existsSync(segmentListFile)) {
        console.log(`Segment list file not found at ${segmentListFile}, attempting to generate it...`);

        // Check if segments directory exists
        if (!fs.existsSync(segmentsDir)) {
          throw new Error(`Segments directory not found: ${segmentsDir}`);
        }

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
      
      // Create concatenated audio file for Whisper
      audioSource = path.join(sessionDir, 'transcripts', `${sessionId}_audio.wav`);
      
      // Extract audio from segments
      await extractAudioFromSegments(segmentListFile, audioSource);
      
      outputDir = path.join(sessionDir, 'transcripts');
    } else {
      // Transcribing a clip
      transcriptionId = clipId;
      const clipInfo = await fileService.getClipMetadata(clipId);
      
      if (!clipInfo) {
        throw new Error(`Clip not found: ${clipId}`);
      }
      
      // Get session directory from clip path
      const sessionDir = path.dirname(path.dirname(clipInfo.path));
      const transcriptsDir = path.join(sessionDir, 'transcripts');
      
      // Extract audio from clip
      audioSource = path.join(transcriptsDir, `${clipId}_audio.wav`);
      
      // Extract audio from clip
      await extractAudioFromClip(clipInfo.path, audioSource);
      
      outputDir = transcriptsDir;
    }
    
    // Get config and check if Whisper is installed
    const configService = require('./config.service');
    const config = await configService.getConfig();

    // Check if Whisper is installed
    const whisperStatus = await configService.getWhisperStatus();
    if (!whisperStatus.installed) {
      throw new Error('Whisper is not installed. Please install Whisper in the Settings page before transcribing.');
    }

    // Prepare output file paths
    const outputJson = path.join(outputDir, `${transcriptionId}_transcript.json`);
    const outputTxt = path.join(outputDir, `${transcriptionId}_transcript.txt`);

    // Prepare Whisper command - We use Python to run whisper since it's a Python package
    const whisperModel = config.whisperModel || 'base';

    console.log(`Starting transcription with model: ${whisperModel} for audio file: ${audioSource}`);

    // Use Python to run whisper directly
    const pythonScript = `
import whisper
import json
import sys
import os

try:
    # Load the model
    model = whisper.load_model("${whisperModel}")

    # Transcribe audio
    result = model.transcribe("${audioSource}")

    # Write result to JSON file
    with open("${outputJson}", "w") as f:
        json.dump(result, f, indent=2)

    # Write text to TXT file
    with open("${outputTxt}", "w") as f:
        f.write(result["text"])

    print("Transcription completed successfully")
    sys.exit(0)
except Exception as e:
    print(f"Error during transcription: {str(e)}")
    sys.exit(1)
`;

    // Create a temporary Python file
    const tempPythonFile = path.join(outputDir, `whisper_${transcriptionId}.py`);
    fs.writeFileSync(tempPythonFile, pythonScript);

    // Spawn Python process to run Whisper
    console.log(`Executing Python script at: ${tempPythonFile}`);
    const whisperProcess = spawn('python3', [tempPythonFile]);
    
    // Store process info
    activeTranscriptions.set(transcriptionId, {
      process: whisperProcess,
      startTime: new Date(),
      audioSource,
      outputJson,
      outputTxt
    });
    
    // Setup logs file
    const logsPath = path.join(outputDir, `${transcriptionId}_whisper_logs.txt`);
    const logsStream = fs.createWriteStream(logsPath, { flags: 'a' });
    
    // Handle process output
    whisperProcess.stdout.on('data', (data) => {
      logsStream.write(`[STDOUT] ${data.toString()}\n`);
    });
    
    whisperProcess.stderr.on('data', (data) => {
      logsStream.write(`[STDERR] ${data.toString()}\n`);
    });
    
    // Handle process completion
    return new Promise((resolve, reject) => {
      let stdoutData = '';
      let stderrData = '';

      whisperProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdoutData += output;
        logsStream.write(`[STDOUT] ${output}\n`);
      });

      whisperProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderrData += output;
        logsStream.write(`[STDERR] ${output}\n`);
      });

      whisperProcess.on('close', async (code) => {
        logsStream.write(`[INFO] Whisper process exited with code ${code}\n`);

        // Clean up temporary Python file
        try {
          fs.unlinkSync(tempPythonFile);
        } catch (err) {
          logsStream.write(`[WARN] Failed to delete temporary Python file: ${err.message}\n`);
        }

        activeTranscriptions.delete(transcriptionId);

        if (code === 0) {
          logsStream.write(`[INFO] Transcription completed successfully\n`);
          // Check if the output files exist
          if (fs.existsSync(outputJson) && fs.existsSync(outputTxt)) {
            try {
              await processWhisperOutput(transcriptionId, outputJson, outputTxt);
              logsStream.end();
              resolve(transcriptionId);
            } catch (error) {
              logsStream.write(`[ERROR] Error processing Whisper output: ${error.message}\n`);
              logsStream.end();
              reject(error);
            }
          } else {
            const err = new Error('Whisper output files not found despite successful exit code');
            logsStream.write(`[ERROR] ${err.message}\n`);
            logsStream.end();
            reject(err);
          }
        } else {
          const errorMsg = `Whisper process failed with code ${code}. Error: ${stderrData}`;
          logsStream.write(`[ERROR] ${errorMsg}\n`);
          logsStream.end();
          reject(new Error(errorMsg));
        }
      });
    });
  } catch (error) {
    console.error('Error starting transcription:', error);
    throw error;
  }
};

/**
 * Extract audio from segments for transcription
 * @param {string} segmentListFile - Path to segment list file
 * @param {string} outputPath - Output path for audio file
 * @returns {Promise<void>}
 */
async function extractAudioFromSegments(segmentListFile, outputPath) {
  try {
    // Read segment list
    const segmentList = fs.readFileSync(segmentListFile, 'utf8').split('\n').filter(Boolean);
    
    if (segmentList.length === 0) {
      throw new Error('No segments found');
    }
    
    // Create a temporary file list for FFmpeg
    const tempDir = path.dirname(outputPath);
    const tempFileListPath = path.join(tempDir, `temp_filelist_${Date.now()}.txt`);
    
    // Write segment paths to temporary file list
    // Make sure all paths are absolute for FFmpeg
    const segmentsDir = path.dirname(segmentListFile);
    fs.writeFileSync(tempFileListPath,
      segmentList.map(segment => {
        // If the path is already absolute, use it as is
        // Otherwise, construct an absolute path
        const absolutePath = path.isAbsolute(segment) ?
          segment :
          path.join(segmentsDir, path.basename(segment));
        return `file '${absolutePath}'`;
      }).join('\n'),
      'utf8');
    
    // Setup FFmpeg command to extract audio
    const ffmpegArgs = [
      '-f', 'concat',
      '-safe', '0',
      '-i', tempFileListPath,
      '-vn',  // Disable video
      '-ar', '16000',  // 16kHz sample rate for Whisper
      '-ac', '1',      // Mono channel
      '-c:a', 'pcm_s16le',  // 16-bit PCM
      outputPath
    ];
    
    // Execute FFmpeg command
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      
      let stderrData = '';
      
      ffmpegProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      ffmpegProcess.on('close', (code) => {
        // Remove temporary file list
        fs.unlinkSync(tempFileListPath);
        
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderrData}`));
        }
      });
    });
  } catch (error) {
    console.error('Error extracting audio from segments:', error);
    throw error;
  }
}

/**
 * Extract audio from clip for transcription
 * @param {string} clipPath - Path to clip file
 * @param {string} outputPath - Output path for audio file
 * @returns {Promise<void>}
 */
async function extractAudioFromClip(clipPath, outputPath) {
  try {
    // Setup FFmpeg command to extract audio
    const ffmpegArgs = [
      '-i', clipPath,
      '-vn',  // Disable video
      '-ar', '16000',  // 16kHz sample rate for Whisper
      '-ac', '1',      // Mono channel
      '-c:a', 'pcm_s16le',  // 16-bit PCM
      outputPath
    ];
    
    // Execute FFmpeg command
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      
      let stderrData = '';
      
      ffmpegProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
      });
      
      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`FFmpeg exited with code ${code}: ${stderrData}`));
        }
      });
    });
  } catch (error) {
    console.error('Error extracting audio from clip:', error);
    throw error;
  }
}

/**
 * Process Whisper output files
 * @param {string} transcriptionId - Transcription ID
 * @param {string} jsonPath - Path to JSON output file
 * @param {string} txtPath - Path to text output file
 * @returns {Promise<void>}
 */
async function processWhisperOutput(transcriptionId, jsonPath, txtPath) {
  try {
    // Check if output files exist
    if (!fs.existsSync(jsonPath)) {
      throw new Error('Whisper JSON output file not found');
    }
    
    // Read JSON output
    const transcriptJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    
    // Create text output if it doesn't exist
    if (!fs.existsSync(txtPath)) {
      // Extract text from JSON
      const fullText = transcriptJson.segments
        .map(segment => segment.text)
        .join('\n');
      
      fs.writeFileSync(txtPath, fullText, 'utf8');
    }
    
    // Create a searchable index from the transcript
    await fileService.indexTranscript(transcriptionId, transcriptJson);
    
    return;
  } catch (error) {
    console.error('Error processing Whisper output:', error);
    throw error;
  }
}

/**
 * Get transcription status
 * @param {string} transcriptionId - Transcription ID
 * @returns {Promise<Object>} - Transcription status
 */
exports.getTranscriptionStatus = async (transcriptionId) => {
  try {
    const transcriptionInfo = activeTranscriptions.get(transcriptionId);
    
    if (transcriptionInfo) {
      // Transcription is active
      return {
        status: 'active',
        startTime: transcriptionInfo.startTime,
        duration: Math.floor((new Date() - transcriptionInfo.startTime) / 1000)
      };
    }
    
    // Check if transcription exists in completed transcriptions
    const transcriptPath = await fileService.findTranscriptPath(transcriptionId);
    
    if (transcriptPath) {
      return {
        status: 'completed',
        path: transcriptPath
      };
    }
    
    return {
      status: 'not_found'
    };
  } catch (error) {
    console.error('Error getting transcription status:', error);
    throw error;
  }
};