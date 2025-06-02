import React, { useState, useEffect } from 'react';
import api from '../services/api';
import WhisperSetup from '../components/WhisperSetup';

const Settings = () => {
  const [ffmpegPath, setFfmpegPath] = useState('');
  const [whisperPath, setWhisperPath] = useState('');
  const [outputPath, setOutputPath] = useState('');
  const [maxConcurrentCaptures, setMaxConcurrentCaptures] = useState(3);
  const [defaultVideoCodec, setDefaultVideoCodec] = useState('copy');
  const [defaultAudioCodec, setDefaultAudioCodec] = useState('copy');
  const [defaultFormat, setDefaultFormat] = useState('mp4');
  const [namingTemplate, setNamingTemplate] = useState('{streamer}_{date}_{time}');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [whisperStatus, setWhisperStatus] = useState(null);

  // Load configuration on component mount
  useEffect(() => {
    fetchConfig();
  }, []);

  // Fetch config from backend
  const fetchConfig = async () => {
    try {
      setLoading(true);
      const config = await api.getConfig();

      setFfmpegPath(config.ffmpegPath || '');
      setWhisperPath(config.whisperPath || '');
      setOutputPath(config.outputPath || '');
      setMaxConcurrentCaptures(config.maxConcurrentCaptures || 3);
      setDefaultVideoCodec(config.defaultVideoCodec || 'copy');
      setDefaultAudioCodec(config.defaultAudioCodec || 'copy');
      setDefaultFormat(config.defaultFormat || 'mp4');
      setNamingTemplate(config.namingTemplate || '{streamer}_{date}_{time}');
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await api.saveConfig({
        ffmpegPath,
        whisperPath,
        outputPath,
        maxConcurrentCaptures,
        defaultVideoCodec,
        defaultAudioCodec,
        defaultFormat,
        namingTemplate
      });

      setSuccess(true);

      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Error saving config:', error);
    }
  };

  return (
    <div className="text-gray-900 dark:text-dark-text">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      {success && (
        <div className="mb-6 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-200 px-4 py-3 rounded transition-colors duration-300">
          Settings saved successfully.
        </div>
      )}
      
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-md overflow-hidden transition-colors duration-300">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-dark-border pb-2 transition-colors duration-300">Path Settings</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="ffmpegPath" className="block text-sm font-medium text-gray-700 dark:text-dark-text transition-colors duration-300">
                      FFmpeg Path
                    </label>
                    <input
                      type="text"
                      id="ffmpegPath"
                      value={ffmpegPath}
                      onChange={(e) => setFfmpegPath(e.target.value)}
                      placeholder="/usr/bin/ffmpeg"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-dark-muted transition-colors duration-300">Leave blank to use system PATH</p>
                  </div>
                  
                  <div>
                    <label htmlFor="whisperPath" className="block text-sm font-medium text-gray-700 dark:text-dark-text transition-colors duration-300">
                      Whisper Path
                    </label>
                    <input
                      type="text"
                      id="whisperPath"
                      value={whisperPath}
                      onChange={(e) => setWhisperPath(e.target.value)}
                      placeholder="/usr/bin/whisper"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-dark-muted transition-colors duration-300">Leave blank to use system PATH</p>
                  </div>
                  
                  <div>
                    <label htmlFor="outputPath" className="block text-sm font-medium text-gray-700 dark:text-dark-text transition-colors duration-300">
                      Clips Library Path
                    </label>
                    <input
                      type="text"
                      id="outputPath"
                      value={outputPath}
                      onChange={(e) => setOutputPath(e.target.value)}
                      placeholder="/home/user/clips_library"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-dark-muted transition-colors duration-300">Default location for captures and clips</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-dark-border pb-2 transition-colors duration-300">Capture Settings</h2>
                <div className="mt-4 space-y-4">
                  <div>
                    <label htmlFor="maxConcurrentCaptures" className="block text-sm font-medium text-gray-700 dark:text-dark-text transition-colors duration-300">
                      Max Concurrent Captures
                    </label>
                    <input
                      type="number"
                      id="maxConcurrentCaptures"
                      value={maxConcurrentCaptures}
                      onChange={(e) => setMaxConcurrentCaptures(parseInt(e.target.value))}
                      min="1"
                      max="10"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
                    />
                    <p className="mt-1 text-sm text-gray-500 dark:text-dark-muted transition-colors duration-300">Limit based on your system resources</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="defaultVideoCodec" className="block text-sm font-medium text-gray-700 dark:text-dark-text transition-colors duration-300">
                        Default Video Codec
                      </label>
                      <select
                        id="defaultVideoCodec"
                        value={defaultVideoCodec}
                        onChange={(e) => setDefaultVideoCodec(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
                      >
                        <option value="copy">copy (stream native)</option>
                        <option value="libx264">libx264 (H.264)</option>
                        <option value="libx265">libx265 (H.265)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="defaultAudioCodec" className="block text-sm font-medium text-gray-700 dark:text-dark-text transition-colors duration-300">
                        Default Audio Codec
                      </label>
                      <select
                        id="defaultAudioCodec"
                        value={defaultAudioCodec}
                        onChange={(e) => setDefaultAudioCodec(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
                      >
                        <option value="copy">copy (stream native)</option>
                        <option value="aac">aac</option>
                        <option value="libmp3lame">mp3</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="defaultFormat" className="block text-sm font-medium text-gray-700 dark:text-dark-text transition-colors duration-300">
                        Default Output Format
                      </label>
                      <select
                        id="defaultFormat"
                        value={defaultFormat}
                        onChange={(e) => setDefaultFormat(e.target.value)}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
                      >
                        <option value="mp4">mp4</option>
                        <option value="mkv">mkv</option>
                        <option value="webm">webm</option>
                        <option value="mov">mov</option>
                        <option value="mpegts">mpegts</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500 dark:text-dark-muted transition-colors duration-300">MP4 is recommended for maximum compatibility.</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <h2 className="text-lg font-medium text-gray-900 dark:text-dark-text border-b border-gray-200 dark:border-dark-border pb-2 transition-colors duration-300">Naming Settings</h2>
                <div className="mt-4">
                  <label htmlFor="namingTemplate" className="block text-sm font-medium text-gray-700 dark:text-dark-text transition-colors duration-300">
                    Naming Template
                  </label>
                  <input
                    type="text"
                    id="namingTemplate"
                    value={namingTemplate}
                    onChange={(e) => setNamingTemplate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-dark-border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text transition-colors duration-300"
                  />
                  <p className="mt-1 text-sm text-gray-500 dark:text-dark-muted transition-colors duration-300">
                    Available variables: {'{streamer}'}, {'{date}'}, {'{time}'}, {'{session_id}'}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-md focus:outline-none transition-colors duration-200"
              >
                Save Settings
              </button>
            </div>
          </form>

          {/* Whisper Setup Component */}
          <WhisperSetup onStatusChange={setWhisperStatus} />
        </div>
      </div>
    </div>
  );
};

export default Settings;