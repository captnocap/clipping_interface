import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatTimecode } from '../utils/dateUtils';

const ActiveCapturesList = () => {
  const [activeCaptures, setActiveCaptures] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stoppingSession, setStoppingSession] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    fetchActiveCaptures();
    
    // Set up polling interval
    const interval = setInterval(fetchActiveCaptures, 5000);
    
    // Clean up interval on unmount
    return () => clearInterval(interval);
  }, []);

  const fetchActiveCaptures = async () => {
    try {
      setIsLoading(false); // Only show loading on initial load
      const response = await api.getCaptureStatus();
      setActiveCaptures(response.activeCaptures || []);
      console.log("Active captures:", response.activeCaptures); // Debug log
    } catch (err) {
      setError('Failed to fetch active captures');
      console.error(err);
    }
  };

  // Using imported formatTimecode function from utils/dateUtils.js

  const confirmStopCapture = (sessionId) => {
    setStoppingSession(sessionId);
    setShowConfirmation(true);
  };

  const cancelStopCapture = () => {
    setStoppingSession(null);
    setShowConfirmation(false);
  };

  const handleStopCapture = async () => {
    try {
      if (!stoppingSession) return;
      
      const sessionId = stoppingSession;
      setShowConfirmation(false);
      
      await api.stopCapture(sessionId);
      console.log("Successfully stopped capture:", sessionId); // Debug log
      
      // Remove from list immediately for better UX
      setActiveCaptures(prev => prev.filter(capture => capture.sessionId !== sessionId));
      
      setStoppingSession(null);
    } catch (err) {
      console.error('Error stopping capture:', err);
      alert('Failed to stop capture. Please try again.');
      setStoppingSession(null);
    }
  };

  if (isLoading) {
    return <div className="text-center py-4">Loading active captures...</div>;
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">{error}</div>;
  }

  if (activeCaptures.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4 text-center text-gray-500">
        No active captures
      </div>
    );
  }

  return (
    <>
      {/* Highlight banner for active captures */}
      <div className="bg-red-100 border-l-4 border-red-500 p-4 mb-4 rounded shadow">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">
              <span className="font-medium">Active Recording!</span> You have {activeCaptures.length} active capture{activeCaptures.length > 1 ? 's' : ''} running.
            </p>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md">
        <h3 className="bg-gray-50 px-4 py-2 font-medium flex justify-between items-center">
          <span>Active Captures ({activeCaptures.length})</span>
          <span className="text-sm text-red-600 flex items-center">
            <span className="h-2 w-2 bg-red-600 rounded-full animate-pulse mr-1"></span>
            Recording
          </span>
        </h3>
        <div className="divide-y divide-gray-200">
          {activeCaptures.map((capture) => (
            <div key={capture.sessionId} className="p-4">
              {/* Change to flex-col instead of justify-between to fix overflow */}
              <div className="flex flex-col">
                <div className="mb-4">
                  <h4 className="font-medium">
                    {capture.streamerName || 'Unnamed Stream'}
                  </h4>
                  {/* Add max height and overflow to the URL */}
                  <div className="text-sm text-gray-500 max-h-16 overflow-y-auto">
                    <p className="break-all">{capture.m3u8Url}</p>
                  </div>
                  <div className="mt-2 flex items-center">
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                      <span className="mr-1 h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                      Recording
                    </span>
                    <span className="ml-2 text-sm text-gray-500">
                      Duration: {formatTimecode(capture.duration)}
                    </span>
                  </div>
                </div>
                
                {/* Place button in its own row */}
                <div className="w-full flex justify-center">
                  <button
                    onClick={() => confirmStopCapture(capture.sessionId)}
                    className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded text-base focus:outline-none flex items-center font-bold shadow border border-red-700"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    STOP CAPTURE
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Stop Capture</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to stop this capture? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelStopCapture}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={handleStopCapture}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none"
              >
                Stop Capture
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ActiveCapturesList;