import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate, formatDuration } from '../utils/dateUtils';
import ClipCreationModal from '../components/ClipCreationModal';

const Transcriptions = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [completedTranscriptions, setCompletedTranscriptions] = useState([]);
  const [transcriptionsLoading, setTranscriptionsLoading] = useState(true);
  const [selectedTranscript, setSelectedTranscript] = useState(null);
  const [transcriptText, setTranscriptText] = useState('');
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [clipCreationData, setClipCreationData] = useState(null);
  const [transcriptSegments, setTranscriptSegments] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!searchQuery.trim()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const results = await api.searchTranscripts(searchQuery);
      setSearchResults(results);
    } catch (err) {
      setError('Failed to search transcripts');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (seconds) => {
    if (seconds === undefined) return '00:00';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const highlightMatch = (text, query) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ?
        <span key={i} className="bg-yellow-200">{part}</span> : part
    );
  };

  // Fetch completed transcriptions when component mounts
  useEffect(() => {
    const fetchTranscriptions = async () => {
      try {
        setTranscriptionsLoading(true);
        const data = await api.getAllTranscriptions();
        console.log("API response for transcriptions:", data);
        setCompletedTranscriptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to fetch completed transcriptions:', err);
      } finally {
        setTranscriptionsLoading(false);
      }
    };

    fetchTranscriptions();
  }, []);

  // Function to view the full transcript
  const viewTranscript = async (transcript) => {
    try {
      setSelectedTranscript(transcript);
      setTranscriptLoading(true);

      let response;
      if (transcript.type === 'clip') {
        response = await api.getClipTranscript(transcript.id);
      } else {
        response = await api.getTranscript(transcript.id);
      }

      // Parse transcript data to extract segments and timestamps
      let segments = [];
      let rawText = '';

      console.log("Transcript response:", response);

      try {
        // First, try to parse the response to extract segments
        if (response && typeof response === 'object') {
          // Direct Whisper format with segments array
          if (response.segments && Array.isArray(response.segments)) {
            segments = response.segments.map(segment => ({
              id: segment.id,
              start: segment.start,
              end: segment.end,
              text: segment.text
            }));
            rawText = response.text || '';
          }
          // API response with transcript field
          else if (response.transcript) {
            if (typeof response.transcript === 'string') {
              rawText = response.transcript;
            } else if (response.transcript.segments) {
              segments = response.transcript.segments.map(segment => ({
                id: segment.id,
                start: segment.start,
                end: segment.end,
                text: segment.text
              }));
              rawText = response.transcript.text || '';
            }
          }
          // If we have a response with text field
          else if (response.text) {
            rawText = response.text;
          }
        } else if (typeof response === 'string') {
          rawText = response;
        }

        // If we couldn't extract segments but have raw JSON, try one more parsing
        if (segments.length === 0 && typeof response === 'string') {
          try {
            const jsonData = JSON.parse(response);
            if (jsonData.segments && Array.isArray(jsonData.segments)) {
              segments = jsonData.segments.map(segment => ({
                id: segment.id,
                start: segment.start,
                end: segment.end,
                text: segment.text
              }));
              rawText = jsonData.text || '';
            }
          } catch (e) {
            // Not valid JSON, use as plain text
            console.log("Not valid JSON, using as plain text");
          }
        }
      } catch (err) {
        console.error("Error parsing transcript:", err);
        rawText = typeof response === 'string' ? response : JSON.stringify(response, null, 2);
      }

      // Format the segments with timestamps if available
      let formattedText = '';
      if (segments.length > 0) {
        formattedText = segments.map(segment => {
          const startTime = formatTimestamp(segment.start || 0);
          const endTime = formatTimestamp(segment.end || 0);
          return `[${startTime} → ${endTime}] ${segment.text}`;
        }).join('\n\n');
      } else {
        formattedText = rawText;
      }

      setTranscriptText(formattedText);
      setTranscriptSegments(segments);
    } catch (err) {
      console.error(`Failed to fetch transcript for ${transcript.id}:`, err);
      setTranscriptText('Error loading transcript: ' + (err.message || 'Unknown error'));
    } finally {
      setTranscriptLoading(false);
    }
  };

  // Close transcript modal
  const closeTranscript = () => {
    setSelectedTranscript(null);
    setTranscriptText('');
    setTranscriptSegments([]);
  };

  // Parse timestamp string and convert to seconds
  const parseTimestamp = (timestampStr) => {
    const match = timestampStr.match(/(\d{2}):(\d{2})/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      return minutes * 60 + seconds;
    }
    return 0;
  };

  // Handle creating a clip from a timestamp
  const handleCreateClipFromTimestamp = (timestampRange) => {
    // Parse the timestamp range [MM:SS → MM:SS]
    const match = timestampRange.match(/\[(\d{2}:\d{2}) → (\d{2}:\d{2})\]/);
    if (match) {
      const startTime = parseTimestamp(match[1]);
      const endTime = parseTimestamp(match[2]);
      
      // Add 1 second buffer before and after
      const bufferedStartTime = Math.max(0, startTime - 1);
      const bufferedEndTime = endTime + 1;
      
      // Set up clip creation data
      setClipCreationData({
        sessionId: selectedTranscript.id,
        startTime: bufferedStartTime,
        endTime: bufferedEndTime,
        defaultName: `Clip_${selectedTranscript.streamerName || 'Stream'}_${match[1].replace(':', '-')}_to_${match[2].replace(':', '-')}`
      });
    }
  };

  // Handle clip created
  const handleClipCreated = () => {
    setClipCreationData(null);
    // Optionally refresh the transcriptions list
  };

  return (
    <div className="text-gray-900 dark:text-dark-text">
      <h1 className="text-2xl font-bold mb-6">Transcriptions</h1>

      {/* Search Transcripts Section */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 mb-6 transition-colors duration-300">
        <h2 className="text-xl font-semibold mb-4">Search Transcripts</h2>

        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for words or phrases in transcripts"
              className="flex-grow px-3 py-2 border border-gray-300 dark:border-dark-border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !searchQuery.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-r-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && <div className="text-red-500 dark:text-red-400 mb-4">{error}</div>}

        <div>
          {searchResults.length > 0 ? (
            <div className="space-y-6">
              {searchResults.map((result, index) => (
                <div key={index} className="bg-gray-50 dark:bg-dark-surface p-4 rounded-lg transition-colors duration-300">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-medium text-lg text-gray-900 dark:text-dark-text">{result.streamerName || 'Unknown Stream'}</h3>
                      <p className="text-sm text-gray-500 dark:text-dark-muted">{result.timestamp}</p>
                    </div>
                    <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs">
                      {result.type === 'clip' ? 'Clip' : 'Full Session'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {result.matches.map((match, matchIndex) => (
                      <div key={matchIndex} className="bg-white dark:bg-dark-card p-3 rounded border border-gray-200 dark:border-dark-border transition-colors duration-300">
                        <div className="flex justify-between text-sm text-gray-500 dark:text-dark-muted mb-1">
                          <span>Time: {formatTimestamp(match.start)} - {formatTimestamp(match.end)}</span>
                          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors duration-200">Jump to clip</button>
                        </div>
                        <p className="text-gray-800 dark:text-dark-text">
                          {highlightMatch(match.text, searchQuery)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery && !isLoading ? (
            <div className="text-center py-8 text-gray-500 dark:text-dark-muted">
              No results found for "{searchQuery}"
            </div>
          ) : null}
        </div>
      </div>

      {/* Available Transcripts Section */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-md p-6 mb-6 transition-colors duration-300">
        <h2 className="text-xl font-semibold mb-4">Available Transcripts</h2>

        {transcriptionsLoading ? (
          <div className="text-center py-8 text-gray-500 dark:text-dark-muted">Loading transcriptions...</div>
        ) : completedTranscriptions.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-dark-muted">
            No transcriptions found. Create clips and transcribe them to see them here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {completedTranscriptions.map((transcript) => (
                  <tr key={transcript.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => viewTranscript(transcript)}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{transcript.name}</div>
                      <div className="text-xs text-gray-500">ID: {transcript.id.substring(0, 8)}...</div>
                      <div className="text-xs text-blue-600 hover:underline mt-1">
                        Click to view full transcript
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        transcript.type === 'clip' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {transcript.type === 'clip' ? 'Clip' : 'Session'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="truncate max-w-xs" title={transcript.source}>
                        {transcript.source}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(transcript.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(transcript.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transcript Viewer Modal */}
      {selectedTranscript && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col transition-colors duration-300">
            <div className="p-4 border-b border-gray-200 dark:border-dark-border flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text">
                {selectedTranscript.name}
                <span className="ml-2 text-sm font-normal text-gray-500 dark:text-dark-muted">
                  ({selectedTranscript.type === 'clip' ? 'Clip' : 'Session'})
                </span>
              </h2>
              <button
                onClick={closeTranscript}
                className="text-gray-500 dark:text-dark-muted hover:text-gray-700 dark:hover:text-dark-text focus:outline-none transition-colors duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 overflow-y-auto flex-grow">
              {transcriptLoading ? (
                <div className="flex justify-center items-center h-64">
                  <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              ) : (
                <div className="flex flex-col">
                  <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900 rounded border border-blue-200 dark:border-blue-700 text-sm transition-colors duration-300">
                    <p className="font-medium text-blue-800 dark:text-blue-200">Tip: Timestamps show when each segment occurs in the video. Click a timestamp to copy it to clipboard for easy clip creation.</p>
                  </div>
                  <div className="whitespace-pre-wrap font-mono text-sm bg-gray-50 dark:bg-dark-surface p-4 rounded border border-gray-200 dark:border-dark-border max-h-[60vh] overflow-y-auto transition-colors duration-300">
                    {transcriptText.split('\n\n').map((paragraph, i) => {
                      // Check if this is a timestamped paragraph
                      const isTimestamped = paragraph.match(/^\[\d{2}:\d{2} → \d{2}:\d{2}\]/);
                      return (
                        <div
                          key={i}
                          className={`mb-3 p-2 rounded ${isTimestamped ? 'hover:bg-blue-50 dark:hover:bg-blue-900' : ''} transition-colors duration-200`}
                        >
                          {isTimestamped ? (
                            <>
                              <div className="flex items-start gap-2">
                                <div className="flex gap-1">
                                  <button
                                    className="font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 px-1 rounded transition-colors duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const timestamp = paragraph.match(/^\[\d{2}:\d{2} → \d{2}:\d{2}\]/)[0];
                                      navigator.clipboard.writeText(timestamp.replace(/[\[\]]/g, ''));
                                      alert(`Timestamp ${timestamp} copied to clipboard!`);
                                    }}
                                    title="Click to copy timestamp to clipboard"
                                  >
                                    {paragraph.match(/^\[\d{2}:\d{2} → \d{2}:\d{2}\]/)[0]}
                                  </button>
                                  <button
                                    className="px-2 py-1 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white text-xs rounded transition-colors duration-200"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const timestamp = paragraph.match(/^\[\d{2}:\d{2} → \d{2}:\d{2}\]/)[0];
                                      handleCreateClipFromTimestamp(timestamp);
                                    }}
                                    title="Create clip from this timestamp (with 1s buffer)"
                                  >
                                    Create Clip
                                  </button>
                                </div>
                                <span className="flex-1 text-gray-900 dark:text-dark-text">{paragraph.replace(/^\[\d{2}:\d{2} → \d{2}:\d{2}\]/, '')}</span>
                              </div>
                            </>
                          ) : (
                            <span className="text-gray-900 dark:text-dark-text">{paragraph}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-dark-border flex justify-end">
              <button
                onClick={closeTranscript}
                className="px-4 py-2 bg-gray-300 dark:bg-dark-surface hover:bg-gray-400 dark:hover:bg-dark-border text-gray-800 dark:text-dark-text rounded transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clip Creation Modal */}
      {clipCreationData && (
        <ClipCreationModal
          capture={{
            sessionId: clipCreationData.sessionId,
            streamerName: selectedTranscript?.streamerName
          }}
          initialData={{
            name: clipCreationData.defaultName,
            startTime: clipCreationData.startTime,
            endTime: clipCreationData.endTime
          }}
          onClose={() => setClipCreationData(null)}
          onClipCreated={handleClipCreated}
        />
      )}
    </div>
  );
};

export default Transcriptions;