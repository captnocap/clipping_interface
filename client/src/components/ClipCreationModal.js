import React, { useState } from 'react';
import api from '../services/api';
import { formatTimecode } from '../utils/dateUtils';

const ClipCreationModal = ({ capture, onClose, onClipCreated, initialData }) => {
  // Use a more reliable way to generate the default clip name
  const currentDate = new Date();
  const formattedDate = currentDate.getFullYear() +
                       '-' + String(currentDate.getMonth() + 1).padStart(2, '0') +
                       '-' + String(currentDate.getDate()).padStart(2, '0') +
                       '_' + String(currentDate.getHours()).padStart(2, '0') +
                       '-' + String(currentDate.getMinutes()).padStart(2, '0');

  const [formData, setFormData] = useState({
    name: initialData?.name || `Clip_${capture?.streamerName || 'Stream'}_${formattedDate}`,
    startTime: initialData?.startTime || 0,
    endTime: initialData?.endTime || 60
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'name' ? value : parseInt(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.startTime >= formData.endTime) {
      setError('End time must be greater than start time');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const clipData = {
        sessionId: capture.sessionId,
        startTime: formData.startTime,
        endTime: formData.endTime,
        name: formData.name
      };
      
      const response = await api.createClip(clipData);
      
      if (onClipCreated) {
        onClipCreated(response.clipId);
      }
      
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create clip');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="border-b px-4 py-3 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Create Clip</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-500">Creating clip from: <span className="font-medium">{capture.streamerName || 'Unnamed Stream'}</span></p>
            <p className="text-sm text-gray-500">Session ID: {capture.sessionId}</p>
          </div>
          
          {error && (
            <div className="mb-4 bg-red-50 p-2 rounded border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Clip Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
                Start Time (seconds from beginning)
              </label>
              <input
                type="number"
                id="startTime"
                name="startTime"
                value={formData.startTime}
                onChange={handleChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
                End Time (seconds from beginning)
              </label>
              <input
                type="number"
                id="endTime"
                name="endTime"
                value={formData.endTime}
                onChange={handleChange}
                min={formData.startTime + 1}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div className="flex justify-end pt-2 space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating...' : 'Create Clip'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ClipCreationModal;