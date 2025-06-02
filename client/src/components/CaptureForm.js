import React, { useState } from 'react';
import api from '../services/api';

const CaptureForm = ({ m3u8Url, onCaptureStarted }) => {
  const [formData, setFormData] = useState({
    streamerName: '',
    segmentDuration: 60,
    videoCodec: 'copy',
    audioCodec: 'copy',
    format: 'mp4',
    autoTranscribe: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!m3u8Url) {
      setError('M3U8 URL is required');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const captureData = {
        m3u8Url,
        streamerName: formData.streamerName,
        ffmpegSettings: {
          segmentDuration: parseInt(formData.segmentDuration),
          videoCodec: formData.videoCodec,
          audioCodec: formData.audioCodec,
          format: formData.format
        },
        autoTranscribe: formData.autoTranscribe
      };
      
      const response = await api.startCapture(captureData);
      
      if (onCaptureStarted) {
        onCaptureStarted(response.sessionId);
      }
      
      // Reset form
      setFormData({
        streamerName: '',
        segmentDuration: 60,
        videoCodec: 'copy',
        audioCodec: 'copy',
        format: 'mp4',
        autoTranscribe: false
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to start capture');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Capture Settings</h2>
      
      {error && (
        <div className="mb-4 bg-red-50 p-2 rounded border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="streamerName" className="block text-sm font-medium text-gray-700 mb-1">
            Streamer Name (optional)
          </label>
          <input
            type="text"
            id="streamerName"
            name="streamerName"
            value={formData.streamerName}
            onChange={handleChange}
            placeholder="Name for organization"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="segmentDuration" className="block text-sm font-medium text-gray-700 mb-1">
            Segment Duration (seconds)
          </label>
          <input
            type="number"
            id="segmentDuration"
            name="segmentDuration"
            value={formData.segmentDuration}
            onChange={handleChange}
            min="10"
            max="300"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Shorter segments allow for more precise clipping, but create more files.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="videoCodec" className="block text-sm font-medium text-gray-700 mb-1">
              Video Codec
            </label>
            <select
              id="videoCodec"
              name="videoCodec"
              value={formData.videoCodec}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="copy">copy (stream native)</option>
              <option value="libx264">libx264 (H.264)</option>
              <option value="libx265">libx265 (H.265)</option>
            </select>
          </div>

          <div>
            <label htmlFor="audioCodec" className="block text-sm font-medium text-gray-700 mb-1">
              Audio Codec
            </label>
            <select
              id="audioCodec"
              name="audioCodec"
              value={formData.audioCodec}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="copy">copy (stream native)</option>
              <option value="aac">aac</option>
              <option value="libmp3lame">mp3</option>
            </select>
          </div>

          <div>
            <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-1">
              Output Format
            </label>
            <select
              id="format"
              name="format"
              value={formData.format}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="mp4">mp4</option>
              <option value="mkv">mkv</option>
              <option value="webm">webm</option>
              <option value="mov">mov</option>
              <option value="mpegts">mpegts</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">MP4 is recommended for maximum compatibility.</p>
          </div>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoTranscribe"
            name="autoTranscribe"
            checked={formData.autoTranscribe}
            onChange={handleChange}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="autoTranscribe" className="ml-2 block text-sm text-gray-700">
            Auto-transcribe after capture (requires Whisper)
          </label>
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={isLoading || !m3u8Url}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Starting Capture
              </span>
            ) : "Start Capture"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CaptureForm;