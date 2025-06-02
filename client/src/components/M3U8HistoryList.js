import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDateOnly } from '../utils/dateUtils';

const M3U8HistoryList = ({ onSelect }) => {
  const [history, setHistory] = useState([]);
  const [streamStatuses, setStreamStatuses] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
    fetchStreamStatuses();
    
    // Refresh stream statuses every 2 minutes
    const interval = setInterval(fetchStreamStatuses, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await api.getM3U8History();
      setHistory(response);
    } catch (err) {
      setError('Failed to fetch M3U8 history');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStreamStatuses = async () => {
    try {
      const statuses = await api.getStreamStatuses();
      const statusMap = {};
      statuses.forEach(status => {
        statusMap[status.url] = status;
      });
      setStreamStatuses(statusMap);
    } catch (err) {
      console.error('Failed to fetch stream statuses:', err);
    }
  };

  const handleFavorite = async (m3u8Url, isFavorite) => {
    try {
      await api.favoriteM3U8(m3u8Url, !isFavorite);
      await fetchHistory(); // Refresh history
    } catch (err) {
      console.error('Error favoriting M3U8:', err);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading history...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  if (history.length === 0) {
    return <div className="text-center py-4 text-gray-500">No M3U8 history found</div>;
  }

  // Group by favorites first, then by streamer name
  const favoritesFirst = [...history].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1;
    if (!a.isFavorite && b.isFavorite) return 1;
    
    // Then by streamer name
    if (a.streamerName && b.streamerName) {
      return a.streamerName.localeCompare(b.streamerName);
    }
    
    // Then by last used date
    return new Date(b.lastUsed) - new Date(a.lastUsed);
  });

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-dark-surface dark:via-dark-card dark:to-dark-surface rounded-2xl shadow-xl border border-blue-100 dark:border-gray-700 overflow-hidden backdrop-blur-sm transition-colors duration-300">
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 px-6 py-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Stream History
          <span className="ml-3 bg-white bg-opacity-20 text-white px-3 py-1 rounded-full text-sm font-semibold">
            {history.length}
          </span>
        </h3>
      </div>

      <div className="max-h-80 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-3">
          {favoritesFirst.map((item) => (
            <div
              key={item.url}
              className={`group relative bg-white dark:bg-dark-card rounded-xl border transition-all duration-300 overflow-hidden cursor-pointer card-hover ${
                streamStatuses[item.url]?.isLive 
                  ? 'border-red-300 dark:border-red-400 hover:border-red-400 dark:hover:border-red-300 shadow-lg shadow-red-100 dark:shadow-red-900/20 animate-pulse-glow' 
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-400 hover:shadow-lg'
              }`}
              onClick={() => onSelect(item.url)}
            >
              {/* Live indicator overlay */}
              {streamStatuses[item.url]?.isLive && (
                <div className="absolute top-3 left-3 z-10">
                  <div className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold animate-pulse flex items-center">
                    <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                    LIVE
                  </div>
                </div>
              )}

              {/* Favorite indicator */}
              {item.isFavorite && (
                <div className="absolute top-3 right-3 z-10">
                  <svg className="w-5 h-5 text-yellow-500 drop-shadow-sm" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center space-x-2 mb-2">
                      {streamStatuses[item.url]?.isLive && (
                        <div className="w-3 h-3 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse"></div>
                      )}
                      {item.streamerName && (
                        <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-500 text-white px-3 py-1 text-sm rounded-full font-semibold">
                          {item.streamerName}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 dark:text-dark-muted mb-3 break-all font-mono leading-relaxed">
                      {item.url.length > 80 ? `${item.url.substring(0, 80)}...` : item.url}
                    </p>
                    
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-dark-muted">
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDateOnly(item.lastUsed)}
                      </span>
                      <span className="flex items-center">
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2M9 4h6m-7 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {item.useCount || 0} use{(item.useCount || 0) !== 1 ? 's' : ''}
                      </span>
                      {streamStatuses[item.url] && (
                        <span className={`flex items-center font-semibold ${
                          streamStatuses[item.url].isLive ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          <div className={`w-2 h-2 rounded-full mr-1 ${
                            streamStatuses[item.url].isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                          }`}></div>
                          {streamStatuses[item.url].isLive ? 'LIVE' : 'Offline'}
                        </span>
                      )}
                    </div>
                  </div>

                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleFavorite(item.url, item.isFavorite);
                    }}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 group"
                    title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {item.isFavorite ? (
                      <svg className="w-5 h-5 text-yellow-500 group-hover:scale-110 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 group-hover:scale-110 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Hover effect overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="px-6 pb-4">
          <div className="pt-4 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600 dark:text-dark-muted flex items-center justify-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Click any stream to start capturing
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default M3U8HistoryList;