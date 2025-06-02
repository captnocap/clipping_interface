import React, { useState } from 'react';
import api from '../services/api';

const StreamURLInput = ({ onM3U8Found }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFindM3U8 = async () => {
    if (!url) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.scrapeM3U8(url);
      setUrl(response.m3u8Url);
      onM3U8Found(response.m3u8Url);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to find M3U8 URL');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (url.includes('.m3u8')) {
      // Direct M3U8 URL
      onM3U8Found(url);
    } else {
      // Stream page URL that needs scraping
      handleFindM3U8();
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mb-6">
      <h2 className="text-xl font-semibold mb-4">Stream URL</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
            Enter stream page URL or direct M3U8 URL
          </label>
          <div className="flex">
            <input
              type="text"
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://kick.com/streamer or direct .m3u8 URL"
              className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={handleFindM3U8}
              disabled={isLoading || !url || url.includes('.m3u8')}
              className={`px-4 py-2 ${url.includes('.m3u8') ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-r-md focus:outline-none`}
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Finding
                </span>
              ) : "Find M3U8"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !url}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start Capture
          </button>
        </div>
      </form>
    </div>
  );
};

export default StreamURLInput;