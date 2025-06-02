import React, { useState } from 'react';
import { formatDate, formatDuration } from '../utils/dateUtils';

const ClipPlayerModal = ({ clip, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleVideoLoaded = () => {
    setIsLoading(false);
  };

  // In a real application, we would use a proper URL to the clip file
  // For this example, we'll just demonstrate the UI for the modal
  const videoSrc = clip.path ? `/api/media/clips/stream/${clip.clipId}` : '';

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        <div className="border-b px-6 py-3 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">{clip.name}</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-grow p-6 overflow-auto">
          <div className="bg-black rounded relative" style={{ paddingTop: '56.25%' }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            )}
            <video
              className="absolute inset-0 w-full h-full"
              controls
              autoPlay
              src={videoSrc}
              onLoadedData={handleVideoLoaded}
              onError={() => setIsLoading(false)}
            >
              Your browser does not support the video tag.
            </video>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500">Created</h4>
              <p className="mt-1">{formatDate(clip.createdAt)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Duration</h4>
              <p className="mt-1">{formatDuration(clip.duration)}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Clip ID</h4>
              <p className="mt-1 font-mono text-sm">{clip.clipId}</p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-500">Session ID</h4>
              <p className="mt-1 font-mono text-sm">{clip.sessionId}</p>
            </div>
            <div className="md:col-span-2">
              <h4 className="text-sm font-medium text-gray-500">Time Range</h4>
              <p className="mt-1">{formatDuration(clip.startTime)} - {formatDuration(clip.endTime)}</p>
            </div>
          </div>
        </div>
        
        <div className="border-t px-6 py-3 flex justify-between">
          <div>
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none mr-3"
              onClick={() => {
                // In a real app, this would initiate a transcription
                alert('Transcription functionality would be triggered here');
              }}
            >
              Transcribe
            </button>
            <button
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md focus:outline-none"
              onClick={() => {
                // In a real app, this would trigger a download
                alert('Download functionality would be triggered here');
              }}
            >
              Download
            </button>
          </div>
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

export default ClipPlayerModal;