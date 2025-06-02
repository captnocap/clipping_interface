const path = require('path');
const fs = require('fs');
const util = require('util');
const fileService = require('./file.service');

// Promisify fs functions
const readdir = util.promisify(fs.readdir);
const readFile = util.promisify(fs.readFile);
const stat = util.promisify(fs.stat);

/**
 * Search transcripts
 * @param {string} query - Search query
 * @param {Object} filters - Search filters
 * @returns {Promise<Array>} - Search results
 */
exports.searchTranscripts = async (query, filters = {}) => {
  try {
    const baseDir = path.join(__dirname, '..', 'clips_library');
    
    if (!fs.existsSync(baseDir)) {
      return [];
    }
    
    const results = [];
    const streamerDirs = await readdir(baseDir);
    
    // Apply streamer filter if provided
    const streamersToSearch = filters.streamer ? 
      streamerDirs.filter(dir => dir.toLowerCase().includes(filters.streamer.toLowerCase())) : 
      streamerDirs;
    
    for (const streamerDir of streamersToSearch) {
      const streamerPath = path.join(baseDir, streamerDir);
      const stats = await stat(streamerPath);
      
      if (!stats.isDirectory()) {
        continue;
      }
      
      const sessionDirs = await readdir(streamerPath);
      
      // Apply date range filter if provided
      let sessionsToSearch = sessionDirs;
      if (filters.startDate || filters.endDate) {
        sessionsToSearch = sessionsToSearch.filter(dir => {
          const timestamp = dir.replace(/[:\-]/g, '');
          const sessionDate = new Date(timestamp);
          
          let matchesFilter = true;
          
          if (filters.startDate) {
            const startDate = new Date(filters.startDate);
            matchesFilter = matchesFilter && sessionDate >= startDate;
          }
          
          if (filters.endDate) {
            const endDate = new Date(filters.endDate);
            matchesFilter = matchesFilter && sessionDate <= endDate;
          }
          
          return matchesFilter;
        });
      }
      
      for (const sessionDir of sessionsToSearch) {
        const sessionPath = path.join(streamerPath, sessionDir);
        const sessionStats = await stat(sessionPath);
        
        if (!sessionStats.isDirectory()) {
          continue;
        }
        
        const transcriptsDir = path.join(sessionPath, 'transcripts');
        
        if (!fs.existsSync(transcriptsDir)) {
          continue;
        }
        
        const transcriptFiles = await readdir(transcriptsDir);
        // Look for regular transcript files instead of index files
        const transcriptJsonFiles = transcriptFiles.filter(file =>
          file.endsWith('_transcript.json') || file.endsWith('_transcript.txt')
        );

        for (const transcriptFile of transcriptJsonFiles) {
          // Extract ID (sessionId or clipId) from filename
          const id = transcriptFile.split('_transcript')[0];
          const transcriptPath = path.join(transcriptsDir, transcriptFile);

          try {
            // Read and parse the transcript file
            let transcriptData, fullText, segments;

            if (transcriptFile.endsWith('.txt')) {
              fullText = await readFile(transcriptPath, 'utf8');
              segments = [{ text: fullText, start: 0, end: 0 }]; // Simple segment for text files
            } else {
              transcriptData = JSON.parse(await readFile(transcriptPath, 'utf8'));

              // Extract full text and segments
              if (transcriptData.text) {
                fullText = transcriptData.text;
              } else if (transcriptData.segments && Array.isArray(transcriptData.segments)) {
                fullText = transcriptData.segments.map(s => s.text).join(' ');
              } else {
                fullText = JSON.stringify(transcriptData);
              }

              segments = transcriptData.segments || [{ text: fullText, start: 0, end: 0 }];
            }

            // Convert to lowercase for case-insensitive search
            const searchableText = fullText.toLowerCase();

            // Check if transcript matches query
            if (searchableText.includes(query.toLowerCase())) {
              // Find matching segments
              const matchingSegments = segments.filter(segment =>
                segment.text && segment.text.toLowerCase().includes(query.toLowerCase())
              );

              if (matchingSegments.length > 0) {
                // Get session metadata
                const metadataPath = path.join(sessionPath, 'metadata.json');
                let sessionMetadata = {};

                if (fs.existsSync(metadataPath)) {
                  sessionMetadata = JSON.parse(await readFile(metadataPath, 'utf8'));
                }

                // Add result
                results.push({
                  transcriptionId: id,
                  type: transcriptFile.includes('clip') ? 'clip' : 'session',
                  streamerName: sessionMetadata.streamerName || streamerDir,
                  timestamp: sessionDir,
                  matches: matchingSegments.map(segment => ({
                    text: segment.text,
                    start: segment.start || 0,
                    end: segment.end || 0
                  }))
                });
              }
            }
          } catch (error) {
            console.error(`Error processing transcript ${transcriptFile}:`, error);
            // Continue with next transcript file
            continue;
          }
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error searching transcripts:', error);
    throw error;
  }
};

/**
 * Search media by metadata
 * @param {string} query - Search query
 * @param {Object} filters - Search filters
 * @returns {Promise<Array>} - Search results
 */
exports.searchMedia = async (query, filters = {}) => {
  try {
    const results = [];
    
    // Search in captures
    if (!filters.type || filters.type === 'capture') {
      const captures = await fileService.getAllCaptures();
      
      const matchingCaptures = captures.filter(capture => {
        // Check if capture matches query
        const matchesQuery = (
          (capture.streamerName && capture.streamerName.toLowerCase().includes(query.toLowerCase())) ||
          (capture.m3u8Url && capture.m3u8Url.toLowerCase().includes(query.toLowerCase()))
        );
        
        // Apply streamer filter if provided
        const matchesStreamer = !filters.streamer || 
          (capture.streamerName && capture.streamerName.toLowerCase().includes(filters.streamer.toLowerCase()));
        
        // Apply date range filter if provided
        let matchesDateRange = true;
        const captureDate = new Date(capture.timestamp);
        
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          matchesDateRange = matchesDateRange && captureDate >= startDate;
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          matchesDateRange = matchesDateRange && captureDate <= endDate;
        }
        
        return matchesQuery && matchesStreamer && matchesDateRange;
      });
      
      results.push(...matchingCaptures.map(capture => ({
        ...capture,
        type: 'capture'
      })));
    }
    
    // Search in clips
    if (!filters.type || filters.type === 'clip') {
      const clips = await fileService.getAllClips();
      
      const matchingClips = clips.filter(clip => {
        // Check if clip matches query
        const matchesQuery = clip.name && clip.name.toLowerCase().includes(query.toLowerCase());
        
        // We don't have streamer name directly in clip metadata, so we skip that filter for now
        // In a real implementation, you would add this information to clip metadata
        
        // Apply date range filter if provided
        let matchesDateRange = true;
        const clipDate = new Date(clip.createdAt);
        
        if (filters.startDate) {
          const startDate = new Date(filters.startDate);
          matchesDateRange = matchesDateRange && clipDate >= startDate;
        }
        
        if (filters.endDate) {
          const endDate = new Date(filters.endDate);
          matchesDateRange = matchesDateRange && clipDate <= endDate;
        }
        
        return matchesQuery && matchesDateRange;
      });
      
      results.push(...matchingClips.map(clip => ({
        ...clip,
        type: 'clip'
      })));
    }
    
    // Sort results by creation time (most recent first)
    results.sort((a, b) => {
      const dateA = a.type === 'capture' ? new Date(a.timestamp) : new Date(a.createdAt);
      const dateB = b.type === 'capture' ? new Date(b.timestamp) : new Date(b.createdAt);
      return dateB - dateA;
    });
    
    return results;
  } catch (error) {
    console.error('Error searching media:', error);
    throw error;
  }
};