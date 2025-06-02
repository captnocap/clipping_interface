import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/dateUtils';

const CaptureDetailsModal = ({ capture, onClose }) => {
  const [logs, setLogs] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      const response = await api.getSessionLogs(capture.sessionId);
      setLogs(response.logs || 'No logs available');
    } catch (err) {
      setError('Failed to fetch session logs');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="border-b px-6 py-3 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Capture Details</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 flex-grow overflow-auto">
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Streamer</h4>
              <p className="mt-1">{capture.streamerName || 'Unnamed'}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Session ID</h4>
              <p className="mt-1 font-mono text-sm">{capture.sessionId}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Start Time</h4>
              <p className="mt-1">{formatDate(capture.timestamp)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Status</h4>
              <p className="mt-1">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${capture.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {capture.status}
                </span>
              </p>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-500">M3U8 URL</h4>
              <p className="mt-1 break-all text-sm">{capture.m3u8Url}</p>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-2">Capture Logs</h4>
            {isLoading ? (
              <div className="text-center py-4">Loading logs...</div>
            ) : error ? (
              <div className="text-red-500">{error}</div>
            ) : (
              <pre className="bg-gray-50 p-3 rounded border text-sm font-mono h-64 overflow-auto whitespace-pre-wrap">
                {logs}
              </pre>
            )}
          </div>
        </div>
        
        <div className="border-t px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CaptureDetailsModal;