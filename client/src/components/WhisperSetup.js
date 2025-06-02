import React, { useState, useEffect } from 'react';
import api from '../services/api';

const WhisperSetup = ({ onStatusChange }) => {
  const [status, setStatus] = useState({
    installed: false,
    autoSetup: false,
    currentModel: 'base',
    availableModels: [],
    modelInfo: {}
  });
  const [installing, setInstalling] = useState(false);
  const [installationOutput, setInstallationOutput] = useState('');
  const [installationResult, setInstallationResult] = useState(null);
  const [selectedModel, setSelectedModel] = useState('base');
  const [showOutput, setShowOutput] = useState(false);

  // Fetch whisper status on component mount
  useEffect(() => {
    // First check localStorage for cached status
    try {
      const cached = localStorage.getItem('whisperStatus');
      if (cached) {
        const parsedCache = JSON.parse(cached);
        setStatus(prev => ({
          ...prev,
          ...parsedCache
        }));
        setSelectedModel(parsedCache.currentModel || 'base');
      }
    } catch (e) {
      console.error('Error loading cached Whisper status:', e);
    }

    // Then fetch fresh status from API
    fetchWhisperStatus();
  }, []);

  // Update parent component when status changes
  useEffect(() => {
    if (onStatusChange) {
      onStatusChange(status);
    }
  }, [status, onStatusChange]);

  // Fetch whisper status
  const fetchWhisperStatus = async () => {
    try {
      const data = await api.getWhisperStatus();
      console.log("Whisper status:", data);
      setStatus(data);
      setSelectedModel(data.currentModel || 'base');

      // Save to localStorage for persistence between page loads
      localStorage.setItem('whisperStatus', JSON.stringify({
        installed: data.installed,
        autoSetup: data.autoSetup,
        currentModel: data.currentModel || 'base'
      }));
    } catch (error) {
      console.error('Error fetching Whisper status:', error);
    }
  };

  // Handle model change
  const handleModelChange = async (e) => {
    setSelectedModel(e.target.value);
    try {
      await api.saveConfig({ whisperModel: e.target.value });
      await fetchWhisperStatus();
    } catch (error) {
      console.error('Error updating Whisper model:', error);
    }
  };

  // Install Whisper
  const handleInstall = async () => {
    setInstalling(true);
    setInstallationOutput('Starting Whisper installation...\n');
    setInstallationResult(null);
    setShowOutput(true);

    try {
      const result = await api.installWhisper();
      setInstallationResult(result);
      setInstallationOutput(prev => prev + '\n' + (result.output || '') + '\n\n' + (result.success ? 'Installation successful!' : `Installation failed: ${result.message}`));
      
      if (result.success) {
        await fetchWhisperStatus();
      }
    } catch (error) {
      setInstallationResult({
        success: false,
        message: error.message || 'An unexpected error occurred'
      });
      setInstallationOutput(prev => prev + '\n\nInstallation failed: ' + (error.message || 'An unexpected error occurred'));
    } finally {
      setInstalling(false);
    }
  };

  // Render model info
  const renderModelInfo = () => {
    if (!status.modelInfo || !status.modelInfo.dims) return null;
    
    const { dims } = status.modelInfo;
    return (
      <div className="mt-4 bg-gray-50 p-3 rounded-md">
        <h4 className="text-sm font-medium text-gray-700">Model Information</h4>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div className="text-gray-600">Dimensions:</div>
          <div className="text-gray-900">{dims.n_text_state || 'N/A'}</div>
          <div className="text-gray-600">Multilingual:</div>
          <div className="text-gray-900">{status.modelInfo.is_multilingual ? 'Yes' : 'No'}</div>
          <div className="text-gray-600">Vocab Size:</div>
          <div className="text-gray-900">{dims.n_vocab || 'N/A'}</div>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
      <h2 className="text-lg font-medium text-gray-900 border-b pb-2">Whisper Transcription Setup</h2>
      
      <div className="mt-4">
        <div className="flex items-center">
          <div className={`h-4 w-4 rounded-full ${status.installed ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
          <span className="text-sm font-medium">
            {status.installed ? 'Whisper is installed' : 'Whisper is not installed'}
          </span>
        </div>
        
        {status.installed ? (
          <div className="mt-4 space-y-4">
            <div>
              <label htmlFor="whisperModel" className="block text-sm font-medium text-gray-700">
                Whisper Model
              </label>
              <select
                id="whisperModel"
                value={selectedModel}
                onChange={handleModelChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {status.availableModels.length > 0 ? (
                  status.availableModels.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))
                ) : (
                  <>
                    <option value="tiny">tiny</option>
                    <option value="base">base</option>
                    <option value="small">small</option>
                    <option value="medium">medium</option>
                    <option value="large">large</option>
                  </>
                )}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Larger models are more accurate but require more memory and processing power.
              </p>
            </div>
            
            {renderModelInfo()}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-4">
              Whisper is an AI speech recognition system that enables high-quality transcription of your clips.
              Click the button below to automatically install Whisper for non-technical users.
            </p>
            
            <button
              onClick={handleInstall}
              disabled={installing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {installing ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Installing...
                </span>
              ) : 'Install Whisper'}
            </button>
            
            {installationResult && (
              <div className={`mt-4 p-3 rounded-md ${installationResult.success ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">
                    {installationResult.success ? 'Installation Successful' : `Installation Failed: ${installationResult.message}`}
                  </p>
                  <button
                    onClick={() => setShowOutput(!showOutput)}
                    className="text-xs underline"
                  >
                    {showOutput ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
              </div>
            )}
            
            {showOutput && installationOutput && (
              <div className="mt-4 bg-gray-900 text-gray-200 p-3 rounded-md overflow-auto max-h-80">
                <pre className="text-xs whitespace-pre-wrap">{installationOutput}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhisperSetup;