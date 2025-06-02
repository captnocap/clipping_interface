import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';
import LiveStreamViewer from './LiveStreamViewer';

const LiveStreamsWidget = ({ onSelect }) => {
  const [liveStreams, setLiveStreams] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [viewingStream, setViewingStream] = useState(null);

  // Fetch live streams
  const fetchLiveStreams = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const streams = await api.getLiveStreams();
      setLiveStreams(streams);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch live streams:', err);
      setError('Failed to load live streams');
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh all stream statuses
  const refreshStatuses = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const streams = await api.refreshStreamStatuses();
      setLiveStreams(streams.filter(stream => stream.isLive));
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to refresh stream statuses:', err);
      setError('Failed to refresh stream statuses');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load and periodic refresh
  useEffect(() => {
    fetchLiveStreams();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchLiveStreams, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleStreamSelect = (stream, action = 'capture') => {
    if (action === 'capture' && onSelect) {
      onSelect(stream.url);
    } else if (action === 'watch') {
      setViewingStream(stream);
    }
  };

  const handleCloseViewer = () => {
    setViewingStream(null);
  };

  const formatTimeSince = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <>
      <div className="bg-gradient-to-br from-red-50 via-pink-50 to-purple-50 dark:from-dark-surface dark:via-dark-card dark:to-dark-surface rounded-2xl shadow-xl border border-red-100 dark:border-gray-700 overflow-hidden backdrop-blur-sm transition-colors duration-300">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center">
              <div className="relative mr-3">
                <div className="w-4 h-4 bg-white rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-4 h-4 bg-white rounded-full animate-ping opacity-75"></div>
              </div>
              Live Streams
              {liveStreams.length > 0 && (
                <span className="ml-3 bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  {liveStreams.length}
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-3">
              <button
                onClick={refreshStatuses}
                disabled={isLoading}
                className="p-2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-lg disabled:opacity-50 transition-all duration-200 backdrop-blur-sm"
                title="Refresh stream statuses"
              >
                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              {lastRefresh && (
                <span className="text-white text-opacity-80 text-sm">
                  {formatTimeSince(lastRefresh)}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-r-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            </div>
          )}

          {isLoading && liveStreams.length === 0 ? (
            <div className="text-center py-8">
              <div className="relative mx-auto w-16 h-16 mb-4">
                <div className="absolute inset-0 border-4 border-purple-200 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-purple-600 rounded-full animate-spin border-t-transparent"></div>
              </div>
              <p className="text-gray-600 font-medium">Scanning for live streams...</p>
              <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
            </div>
          ) : liveStreams.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium">No streams currently live</p>
              <p className="text-sm text-gray-500 mt-2">
                Add M3U8 URLs to your history and we'll monitor them automatically
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {liveStreams.map((stream, index) => (
                <div
                  key={index}
                  className="group relative bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-400 hover:shadow-lg transition-all duration-300 overflow-hidden card-hover animate-pulse-glow"
                >
                  {/* Live indicator overlay */}
                  <div className="absolute top-3 right-3 z-10">
                    <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse flex items-center">
                      <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                      LIVE
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text truncate">
                            {stream.streamerName || 'Unknown Streamer'}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-dark-muted mb-3 break-all font-mono">
                          {stream.url.length > 70 ? `${stream.url.substring(0, 70)}...` : stream.url}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-400 dark:text-dark-muted mb-4">
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {stream.statusCode || 'OK'}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {formatTimeSince(stream.lastChecked)}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStreamSelect(stream, 'watch');
                            }}
                            className="flex-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 group btn-hover-lift"
                          >
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1m-6 4h8m-9-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Watch</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStreamSelect(stream, 'capture');
                            }}
                            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white py-2 px-4 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center space-x-2 group btn-hover-lift"
                          >
                            <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <span>Capture</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {liveStreams.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-200 text-center">
              <p className="text-sm text-gray-600 flex items-center justify-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Click "Watch" to view stream or "Capture" to record
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Live Stream Viewer Modal */}
      {viewingStream && (
        <LiveStreamViewer
          streamUrl={viewingStream.url}
          streamerName={viewingStream.streamerName}
          isOpen={!!viewingStream}
          onClose={handleCloseViewer}
        />
      )}
    </>
  );
};

export default LiveStreamsWidget;