import React, { useState, useEffect } from 'react';
import api from '../services/api';
import ClipCreationModal from '../components/ClipCreationModal';
import CaptureDetailsModal from '../components/CaptureDetailsModal';
import ClipPlayerModal from '../components/ClipPlayerModal';
import { formatDate, formatDuration, formatTimecode } from '../utils/dateUtils';

const ClipsLibrary = () => {
  const [clips, setClips] = useState([]);
  const [captures, setCaptures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('captures');
  
  // Modal states
  const [selectedCapture, setSelectedCapture] = useState(null);
  const [selectedClip, setSelectedClip] = useState(null);
  const [clipModalVisible, setClipModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [playerModalVisible, setPlayerModalVisible] = useState(false);

  // Track transcription states for clips
  const [transcribingClips, setTranscribingClips] = useState({});
  const [transcribingCaptures, setTranscribingCaptures] = useState({});
  const [transcriptionStatuses, setTranscriptionStatuses] = useState({});
  const [transcripts, setTranscripts] = useState({});
  const [expandedTranscripts, setExpandedTranscripts] = useState({});

  useEffect(() => {
    fetchMedia();
  }, []);

  // Poll for transcription status updates
  useEffect(() => {
    const clipIds = Object.keys(transcribingClips);
    const captureIds = Object.keys(transcribingCaptures);

    if (clipIds.length === 0 && captureIds.length === 0) return;

    const pollInterval = setInterval(async () => {
      // Poll clip transcriptions
      for (const clipId of clipIds) {
        try {
          const status = await api.getTranscriptionStatus(clipId);
          setTranscriptionStatuses(prev => ({
            ...prev,
            [clipId]: status
          }));

          // If transcription is completed or failed, remove from tracking
          if (status.status === 'completed' || status.status === 'not_found') {
            setTranscribingClips(prev => {
              const newState = { ...prev };
              delete newState[clipId];
              return newState;
            });
          }
        } catch (error) {
          console.error(`Error polling transcription status for clip ${clipId}:`, error);
        }
      }

      // Poll capture transcriptions
      for (const captureId of captureIds) {
        try {
          const status = await api.getTranscriptionStatus(captureId);
          setTranscriptionStatuses(prev => ({
            ...prev,
            [captureId]: status
          }));

          // If transcription is completed or failed, remove from tracking
          if (status.status === 'completed' || status.status === 'not_found') {
            setTranscribingCaptures(prev => {
              const newState = { ...prev };
              delete newState[captureId];
              return newState;
            });
          }
        } catch (error) {
          console.error(`Error polling transcription status for capture ${captureId}:`, error);
        }
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pollInterval);
  }, [transcribingClips, transcribingCaptures]);

  const fetchMedia = async () => {
    try {
      setIsLoading(true);
      const [capturesResponse, clipsResponse] = await Promise.all([
        api.getAllCaptures(),
        api.getAllClips()
      ]);
      
      setCaptures(capturesResponse);
      setClips(clipsResponse);
    } catch (err) {
      setError('Failed to fetch media');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // We're using the imported formatDate and formatDuration functions from dateUtils.js
  
  const handleCreateClip = (capture) => {
    setSelectedCapture(capture);
    setClipModalVisible(true);
  };
  
  const handleViewCapture = (capture) => {
    setSelectedCapture(capture);
    setDetailsModalVisible(true);
  };
  
  const handlePlayClip = (clip) => {
    setSelectedClip(clip);
    setPlayerModalVisible(true);
  };
  
  const handleTranscribeCapture = async (capture) => {
    // Prevent starting multiple transcriptions for the same capture
    if (transcribingCaptures[capture.sessionId]) {
      alert('Transcription is already in progress for this session.');
      return;
    }

    // Mark capture as transcribing (loading state)
    setTranscribingCaptures(prev => ({
      ...prev,
      [capture.sessionId]: { startTime: new Date() }
    }));

    try {
      console.log("Starting transcription for capture session:", capture);
      const response = await api.startTranscription(capture.sessionId, null);
      console.log("Transcription started, response:", response);

      // Update transcription status
      setTranscriptionStatuses(prev => ({
        ...prev,
        [capture.sessionId]: { status: 'active', startTime: new Date() }
      }));

      // No alert - we'll show status in the UI
    } catch (err) {
      console.error("Transcription error:", err);
      let errorMessage = 'Failed to start transcription';

      if (err.response?.data?.error) {
        errorMessage += ': ' + err.response.data.error;
      } else if (err.message) {
        errorMessage += ': ' + err.message;
      }

      // Remove from transcribing state
      setTranscribingCaptures(prev => {
        const newState = { ...prev };
        delete newState[capture.sessionId];
        return newState;
      });

      // Set error status
      setTranscriptionStatuses(prev => ({
        ...prev,
        [capture.sessionId]: { status: 'error', error: errorMessage }
      }));

      alert(errorMessage);
    }
  };

  const handleTranscribeClip = async (clip) => {
    // Prevent starting multiple transcriptions for the same clip
    if (transcribingClips[clip.clipId]) {
      alert('Transcription is already in progress for this clip.');
      return;
    }

    // Mark clip as transcribing (loading state)
    setTranscribingClips(prev => ({
      ...prev,
      [clip.clipId]: { startTime: new Date() }
    }));

    try {
      console.log("Starting transcription for clip:", clip);
      const response = await api.startTranscription(null, clip.clipId);
      console.log("Transcription started, response:", response);

      // Update transcription status
      setTranscriptionStatuses(prev => ({
        ...prev,
        [clip.clipId]: { status: 'active', startTime: new Date() }
      }));

      // No alert - we'll show status in the UI
    } catch (err) {
      console.error("Transcription error:", err);
      let errorMessage = 'Failed to start transcription';

      if (err.response?.data?.error) {
        errorMessage += ': ' + err.response.data.error;
      } else if (err.message) {
        errorMessage += ': ' + err.message;
      }

      // Remove from transcribing state
      setTranscribingClips(prev => {
        const newState = { ...prev };
        delete newState[clip.clipId];
        return newState;
      });

      // Set error status
      setTranscriptionStatuses(prev => ({
        ...prev,
        [clip.clipId]: { status: 'error', error: errorMessage }
      }));

      alert(errorMessage);
    }
  };
  
  const handleRenameSession = (capture) => {
    const newName = prompt("Enter a new name for this session:", capture.streamerName || '');
    if (newName !== null && newName !== undefined) {
      api.updateCaptureMetadata(capture.sessionId, { streamerName: newName.trim() })
        .then(() => {
          fetchMedia(); // Refresh the data
        })
        .catch(error => {
          console.error("Error renaming session:", error);
          alert("Failed to rename session");
        });
    }
  };

  const handleExportSessionMp4 = (capture) => {
    const name = prompt("Enter a name for the exported MP4:", capture.streamerName || "Export");
    if (name !== null && name !== undefined) {
      api.createSessionMp4(capture.sessionId, name)
        .then(result => {
          alert("Export started. The file will be available in your downloads when complete.");
        })
        .catch(error => {
          console.error("Error exporting session:", error);
          alert("Failed to export session to MP4");
        });
    }
  };

  const handleDeleteSession = (capture) => {
    if (window.confirm(`Are you sure you want to delete session "${capture.streamerName || 'Unnamed'}"? This action cannot be undone.`)) {
      api.deleteSession(capture.sessionId)
        .then(() => {
          fetchMedia(); // Refresh the data
        })
        .catch(error => {
          console.error("Error deleting session:", error);
          alert("Failed to delete session");
        });
    }
  };

  const handleDownloadClip = (clip) => {
    if (!clip || !clip.clipId) {
      alert('Invalid clip information');
      return;
    }

    // Get download URL from API
    const downloadUrl = api.getClipDownloadUrl(clip.clipId);

    // Direct download - this is the most reliable way to trigger a download
    // that respects Content-Disposition across browsers
    window.location.href = downloadUrl;
  };

  const handleClipCreated = () => {
    // Refresh the clips list after creating a new clip
    fetchMedia();
  };

  const handleRenameUrlGroup = (url, displayName) => {
    // For this implementation, we'll just update all captures from this URL
    // with a common streamerName value
    const newName = prompt("Enter a new display name for this group:", displayName);
    if (newName !== null && newName !== undefined) {
      // Find all captures with this URL
      const sessionsToUpdate = captures.filter(capture => capture.m3u8Url === url);

      // Update each session's metadata
      const updatePromises = sessionsToUpdate.map(capture =>
        api.updateCaptureMetadata(capture.sessionId, { streamerName: newName })
      );

      Promise.all(updatePromises)
        .then(() => {
          fetchMedia();
        })
        .catch(error => {
          console.error("Error renaming URL group:", error);
          alert("Failed to rename URL group");
        });
    }
  };

  // Group captures by their m3u8Url
  const groupCapturesByUrl = () => {
    const groups = {};

    captures.forEach(capture => {
      const url = capture.m3u8Url || 'unknown';

      if (!groups[url]) {
        groups[url] = {
          url,
          displayName: getDisplayNameFromUrl(url),
          sessions: []
        };
      }

      groups[url].sessions.push(capture);
    });

    // Sort sessions within each group by timestamp (newest first)
    Object.values(groups).forEach(group => {
      group.sessions.sort((a, b) => {
        return new Date(b.timestamp) - new Date(a.timestamp);
      });
    });

    return Object.values(groups);
  };

  // Group clips by their source capture's m3u8Url
  const groupClipsBySource = () => {
    // First, build a map of sessionId to m3u8Url
    const sessionUrlMap = {};
    captures.forEach(capture => {
      sessionUrlMap[capture.sessionId] = {
        url: capture.m3u8Url || 'unknown',
        displayName: getDisplayNameFromUrl(capture.m3u8Url || 'unknown'),
        timestamp: capture.timestamp
      };
    });

    // Group clips by URL
    const groups = {};

    clips.forEach(clip => {
      // Get the source URL from the sessionId
      const sourceInfo = sessionUrlMap[clip.sessionId] || {
        url: 'unknown',
        displayName: 'Unknown Source',
        timestamp: new Date().toISOString()
      };

      const url = sourceInfo.url;

      if (!groups[url]) {
        groups[url] = {
          url,
          displayName: sourceInfo.displayName,
          clips: []
        };
      }

      groups[url].clips.push(clip);
    });

    // Sort clips within each group by creation time (newest first)
    Object.values(groups).forEach(group => {
      group.clips.sort((a, b) => {
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    });

    // Sort groups by most recent clip in each group
    const sortedGroups = Object.values(groups).sort((a, b) => {
      if (a.clips.length === 0) return 1;
      if (b.clips.length === 0) return -1;

      return new Date(b.clips[0].createdAt) - new Date(a.clips[0].createdAt);
    });

    return sortedGroups;
  };

  // Extract a display name from the URL
  const getDisplayNameFromUrl = (url) => {
    try {
      // Try to extract a meaningful name from the URL
      const urlObj = new URL(url);

      // Extract the hostname without www.
      let displayName = urlObj.hostname.replace(/^www\./, '');

      // Add the first part of the path if it exists and isn't just a slash
      if (urlObj.pathname && urlObj.pathname !== '/') {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          displayName += ' - ' + pathParts[0];
        }
      }

      return displayName;
    } catch (error) {
      // If URL parsing fails, return a shortened version of the URL
      return url.substring(0, 30) + '...';
    }
  };

  // Format seconds to MM:SS format
  const formatTimestamp = (seconds) => {
    if (seconds === undefined || seconds === null) return '00:00';

    // We can use formatTimecode but truncate the hours part
    const timecode = formatTimecode(seconds);
    return timecode.substring(3); // Remove the hours part and the first colon
  };

  const handleShowSessionTranscript = async (capture) => {
    if (!capture || !capture.sessionId) return;

    // If we already have the transcript, just toggle visibility
    if (transcripts[capture.sessionId]) {
      setExpandedTranscripts(prev => ({
        ...prev,
        [capture.sessionId]: !prev[capture.sessionId]
      }));
      return;
    }

    try {
      console.log("Fetching transcript for session:", capture.sessionId);
      const response = await api.getTranscript(capture.sessionId);
      console.log("Session transcript API response:", response);

      if (response && response.transcript) {
        // Store the full transcript object for sessions (to show timestamps)
        setTranscripts(prev => ({
          ...prev,
          [capture.sessionId]: response.transcript
        }));

        // Expand the transcript
        setExpandedTranscripts(prev => ({
          ...prev,
          [capture.sessionId]: true
        }));

        console.log(`Transcript loaded for session ${capture.sessionId}`);
      } else {
        console.error('No transcript in response:', response);

        // For demo, create a placeholder transcript
        setTranscripts(prev => ({
          ...prev,
          [capture.sessionId]: "This is a placeholder transcript for demonstration purposes. In a production system, this would be the actual transcription from Whisper AI."
        }));

        // Expand the transcript
        setExpandedTranscripts(prev => ({
          ...prev,
          [capture.sessionId]: true
        }));
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);

      // For demo, still show a placeholder
      setTranscripts(prev => ({
        ...prev,
        [capture.sessionId]: "Error loading transcript. This is a placeholder for demonstration purposes."
      }));

      // Expand the transcript
      setExpandedTranscripts(prev => ({
        ...prev,
        [capture.sessionId]: true
      }));
    }
  };

  const handleShowTranscript = async (clip) => {
    if (!clip || !clip.clipId) return;

    // If we already have the transcript, just toggle visibility
    if (transcripts[clip.clipId]) {
      setExpandedTranscripts(prev => ({
        ...prev,
        [clip.clipId]: !prev[clip.clipId]
      }));
      return;
    }

    try {
      console.log("Fetching transcript for clip:", clip.clipId);
      const response = await api.getClipTranscript(clip.clipId);
      console.log("Transcript API response:", response);

      if (response && response.transcript) {
        // Extract the text content depending on format
        let transcriptText;
        if (typeof response.transcript === 'string') {
          // If the transcript is already a string
          transcriptText = response.transcript;
        } else if (response.transcript.text) {
          // If the transcript has a text property
          transcriptText = response.transcript.text;
        } else if (response.transcript.segments && Array.isArray(response.transcript.segments)) {
          // If the transcript has segments
          transcriptText = response.transcript.segments
            .map(segment => segment.text)
            .join(' ');
        } else {
          // Fall back to JSON stringify if we can't figure out the format
          transcriptText = JSON.stringify(response.transcript);
        }

        // Store the transcript as a string for easier display
        setTranscripts(prev => ({
          ...prev,
          [clip.clipId]: transcriptText
        }));

        // Expand the transcript
        setExpandedTranscripts(prev => ({
          ...prev,
          [clip.clipId]: true
        }));

        console.log(`Transcript loaded for clip ${clip.clipId}, source: ${response.source}`);
      } else {
        console.error('No transcript in response:', response);

        // For demo, create a placeholder transcript
        setTranscripts(prev => ({
          ...prev,
          [clip.clipId]: "This is a placeholder transcript for demonstration purposes. In a production system, this would be the actual transcription from Whisper AI."
        }));

        // Expand the transcript
        setExpandedTranscripts(prev => ({
          ...prev,
          [clip.clipId]: true
        }));
      }
    } catch (error) {
      console.error('Error fetching transcript:', error);

      // For demo, still show a placeholder
      setTranscripts(prev => ({
        ...prev,
        [clip.clipId]: "Error loading transcript. This is a placeholder for demonstration purposes."
      }));

      // Expand the transcript
      setExpandedTranscripts(prev => ({
        ...prev,
        [clip.clipId]: true
      }));
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading media...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  return (
    <div className="text-gray-900 dark:text-dark-text">
      <h1 className="text-2xl font-bold mb-6">Clips Library</h1>
      
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-md overflow-hidden transition-colors duration-300">
        <div className="border-b border-gray-200 dark:border-dark-border">
          <nav className="-mb-px flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('captures')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'captures' 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text hover:border-gray-300 dark:hover:border-dark-border'
              }`}
            >
              Captures ({captures.length})
            </button>
            <button
              onClick={() => setActiveTab('clips')}
              className={`w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'clips' 
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                  : 'border-transparent text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text hover:border-gray-300 dark:hover:border-dark-border'
              }`}
            >
              Clips ({clips.length})
            </button>
          </nav>
        </div>
        
        <div className="p-4">
          {activeTab === 'captures' && (
            <div>
              {captures.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-dark-muted">No captures found</div>
              ) : (
                <div className="space-y-6">
                  {groupCapturesByUrl().map((group) => (
                    <div key={group.url} className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden transition-colors duration-300">
                      <div className="bg-gray-100 dark:bg-dark-border px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-medium text-gray-800 dark:text-dark-text">{group.displayName}</h3>
                            <p className="text-xs text-gray-500 dark:text-dark-muted truncate mt-1">{group.url}</p>
                          </div>
                          <button
                            onClick={() => handleRenameUrlGroup(group.url, group.displayName)}
                            className="text-sm bg-gray-200 dark:bg-dark-card hover:bg-gray-300 dark:hover:bg-dark-surface text-gray-700 dark:text-dark-text py-1 px-3 rounded transition-colors duration-200"
                          >
                            Rename Group
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                          <thead className="bg-gray-50 dark:bg-dark-surface">
                            <tr>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">Session</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">Date</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">Status</th>
                              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-muted uppercase tracking-wider">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-dark-card divide-y divide-gray-200 dark:divide-dark-border">
                            {group.sessions.map((capture) => (
                              <React.Fragment key={capture.sessionId}>
                                <tr>
                                  <td className="px-6 py-4">
                                    <div className="text-sm font-medium text-gray-900 dark:text-dark-text">{capture.streamerName || 'Unnamed'}</div>
                                    <div className="text-xs text-gray-500 dark:text-dark-muted">Session ID: {capture.sessionId.substring(0, 8)}...</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="text-sm text-gray-900 dark:text-dark-text">{formatDate(capture.timestamp)}</div>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                      capture.status === 'active' 
                                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                                        : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                    }`}>
                                      {capture.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-dark-muted">
                                    <div className="flex flex-wrap gap-2">
                                      <button
                                        onClick={() => handleCreateClip(capture)}
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors duration-200"
                                        title="Create a clip from this session"
                                      >
                                        Create Clip
                                      </button>
                                      <span className="mx-1 text-gray-300 dark:text-dark-border">|</span>
                                      <button
                                        onClick={() => handleViewCapture(capture)}
                                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors duration-200"
                                        title="View session details"
                                      >
                                        View
                                      </button>
                                      <span className="mx-1">|</span>
                                      <button
                                        onClick={() => handleRenameSession(capture)}
                                        className="text-gray-600 hover:text-gray-900"
                                        title="Rename this session"
                                      >
                                        Rename
                                      </button>
                                      <span className="mx-1">|</span>
                                      <button
                                        onClick={() => handleExportSessionMp4(capture)}
                                        className="text-purple-600 hover:text-purple-900"
                                        title="Export session to MP4"
                                      >
                                        Export MP4
                                      </button>
                                      <span className="mx-1">|</span>
                                      <button
                                        onClick={() => handleDeleteSession(capture)}
                                        className="text-red-600 hover:text-red-900"
                                        title="Delete this session"
                                      >
                                        Delete
                                      </button>
                                      <span className="mx-1">|</span>
                                      <button
                                        onClick={() => {
                                          const isTranscribing = Boolean(transcribingCaptures[capture.sessionId]);
                                          const transcriptionStatus = transcriptionStatuses[capture.sessionId];

                                          if (transcriptionStatus && transcriptionStatus.status === 'completed') {
                                            handleShowSessionTranscript(capture);
                                          } else if (!isTranscribing) {
                                            handleTranscribeCapture(capture);
                                          }
                                        }}
                                        className={`${
                                          transcribingCaptures[capture.sessionId]
                                            ? 'text-yellow-600 cursor-wait'
                                            : transcriptionStatuses[capture.sessionId]?.status === 'completed'
                                              ? 'text-green-600 hover:text-green-900'
                                              : 'text-green-600 hover:text-green-900'
                                        }`}
                                      >
                                        {transcribingCaptures[capture.sessionId]
                                          ? 'Transcribing...'
                                          : transcriptionStatuses[capture.sessionId]?.status === 'completed'
                                            ? (expandedTranscripts[capture.sessionId] ? 'Hide Transcript' : 'Show Transcript')
                                            : 'Transcribe'}
                                      </button>
                                    </div>
                                  </td>
                                </tr>

                                {/* Transcript row */}
                                {expandedTranscripts[capture.sessionId] && transcripts[capture.sessionId] && (
                                  <tr>
                                    <td colSpan={4} className="px-6 py-4 bg-gray-50">
                                      <div className="mb-2 font-medium text-gray-700">Transcript:</div>
                                      {typeof transcripts[capture.sessionId] === 'string' ? (
                                        // Simple string transcript
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                          {transcripts[capture.sessionId]}
                                        </div>
                                      ) : transcripts[capture.sessionId].segments ? (
                                        // Transcript with segments (timestamps)
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
                                          {transcripts[capture.sessionId].segments.map((segment, idx) => (
                                            <div key={idx} className="flex items-start p-2 hover:bg-gray-100 rounded cursor-pointer"
                                                 onClick={() => handleCreateClip({
                                                    ...capture,
                                                    startTime: Math.max(0, segment.start - 2), // Start 2 seconds before
                                                    endTime: segment.end + 2 // End 2 seconds after
                                                 })}>
                                              <div className="text-xs font-mono bg-gray-200 text-gray-700 px-2 py-1 rounded mr-2 whitespace-nowrap">
                                                {formatTimestamp(segment.start || 0)} - {formatTimestamp(segment.end || 0)}
                                              </div>
                                              <div className="flex-1 text-sm text-gray-800">
                                                {segment.text}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        // Fallback for unknown format
                                        <div className="text-sm text-gray-700">
                                          {JSON.stringify(transcripts[capture.sessionId])}
                                        </div>
                                      )}
                                      <div className="mt-2 text-xs text-gray-500 italic">
                                        Click on any segment to create a clip of that moment.
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {activeTab === 'clips' && (
            <div>
              {clips.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-dark-muted">No clips found</div>
              ) : (
                <div className="space-y-6">
                  {groupClipsBySource().map((group) => (
                    <div key={group.url} className="bg-white dark:bg-dark-surface rounded-lg shadow overflow-hidden transition-colors duration-300">
                      <div className="bg-gray-100 dark:bg-dark-border px-4 py-3 border-b border-gray-200 dark:border-dark-border">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-lg font-medium text-gray-800 dark:text-dark-text">{group.displayName}</h3>
                            <p className="text-xs text-gray-500 dark:text-dark-muted truncate mt-1">{group.url}</p>
                          </div>
                          <button
                            onClick={() => handleRenameUrlGroup(group.url, group.displayName)}
                            className="text-sm bg-gray-200 dark:bg-dark-card hover:bg-gray-300 dark:hover:bg-dark-surface text-gray-700 dark:text-dark-text py-1 px-3 rounded transition-colors duration-200"
                          >
                            Rename Group
                          </button>
                        </div>
                      </div>

                      <div className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.clips.map((clip) => {
                            const isTranscribing = Boolean(transcribingClips[clip.clipId]);
                            const transcriptionStatus = transcriptionStatuses[clip.clipId];

                            return (
                              <div key={clip.clipId} className="bg-gray-50 dark:bg-dark-card rounded-lg overflow-hidden shadow transition-colors duration-300">
                                <div className="p-4">
                                  <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text truncate">{clip.name}</h3>
                                  <div className="mt-2 flex justify-between text-sm text-gray-500 dark:text-dark-muted">
                                    <span>Duration: {formatDuration(clip.duration)}</span>
                                    <span>{formatDate(clip.createdAt)}</span>
                                  </div>

                                  {/* Transcription Status */}
                                  {(isTranscribing || transcriptionStatus) && (
                                    <div className="mt-2">
                                      {isTranscribing && (
                                        <div className="flex items-center text-yellow-600 text-sm">
                                          <svg className="animate-spin h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Transcribing...
                                        </div>
                                      )}

                                      {!isTranscribing && transcriptionStatus && transcriptionStatus.status === 'completed' && (
                                        <div className="flex items-center text-green-600 text-sm cursor-pointer" onClick={() => handleShowTranscript(clip)}>
                                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                          </svg>
                                          {expandedTranscripts[clip.clipId] ? 'Hide transcript' : 'Show transcript'}
                                        </div>
                                      )}

                                      {!isTranscribing && transcriptionStatus && transcriptionStatus.status === 'error' && (
                                        <div className="flex items-center text-red-600 text-sm">
                                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                          {transcriptionStatus.error || 'Transcription failed'}
                                        </div>
                                      )}

                                      {/* Transcript Display */}
                                      {expandedTranscripts[clip.clipId] && transcripts[clip.clipId] && (
                                        <div className="mt-2 bg-gray-100 p-2 rounded text-sm text-gray-700 max-h-64 overflow-y-auto">
                                          <div className="flex justify-between items-center mb-1">
                                            <div className="font-medium text-gray-700">Transcript:</div>
                                            <div className="text-xs text-gray-500">Click to copy</div>
                                          </div>
                                          <p
                                            className="whitespace-pre-wrap py-1 px-2 hover:bg-gray-200 rounded cursor-pointer"
                                            onClick={() => {
                                              navigator.clipboard.writeText(transcripts[clip.clipId])
                                                .then(() => alert("Transcript copied to clipboard"))
                                                .catch(err => console.error("Could not copy text: ", err));
                                            }}
                                          >
                                            {transcripts[clip.clipId]}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div className="mt-4 flex space-x-3">
                                    <button
                                      className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-800 py-1 px-3 rounded text-sm"
                                      onClick={() => handlePlayClip(clip)}
                                    >
                                      Play
                                    </button>
                                    <button
                                      className={`flex-1 py-1 px-3 rounded text-sm flex justify-center items-center ${
                                        isTranscribing
                                          ? 'bg-yellow-100 text-yellow-800 cursor-not-allowed'
                                          : 'bg-green-100 hover:bg-green-200 text-green-800'
                                      }`}
                                      onClick={() => !isTranscribing && handleTranscribeClip(clip)}
                                      disabled={isTranscribing}
                                    >
                                      {isTranscribing ? (
                                        <>
                                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-yellow-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                          Processing
                                        </>
                                      ) : "Transcribe"}
                                    </button>
                                    <button
                                      className="flex-1 bg-purple-100 hover:bg-purple-200 text-purple-800 py-1 px-3 rounded text-sm"
                                      onClick={() => handleDownloadClip(clip)}
                                    >
                                      Download
                                    </button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Clip Creation Modal */}
      {clipModalVisible && selectedCapture && (
        <ClipCreationModal 
          capture={selectedCapture}
          onClose={() => setClipModalVisible(false)}
          onClipCreated={handleClipCreated}
        />
      )}
      
      {/* Capture Details Modal */}
      {detailsModalVisible && selectedCapture && (
        <CaptureDetailsModal
          capture={selectedCapture}
          onClose={() => setDetailsModalVisible(false)}
        />
      )}
      
      {/* Clip Player Modal */}
      {playerModalVisible && selectedClip && (
        <ClipPlayerModal
          clip={selectedClip}
          onClose={() => setPlayerModalVisible(false)}
        />
      )}
    </div>
  );
};

export default ClipsLibrary;