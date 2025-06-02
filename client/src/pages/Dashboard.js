import React, { useState } from 'react';
import StreamURLInput from '../components/StreamURLInput';
import M3U8HistoryList from '../components/M3U8HistoryList';
import CaptureForm from '../components/CaptureForm';
import ActiveCapturesList from '../components/ActiveCapturesList';
import LiveStreamsWidget from '../components/LiveStreamsWidget';
import FloatingActionButton from '../components/FloatingActionButton';

const Dashboard = () => {
  const [selectedM3U8Url, setSelectedM3U8Url] = useState('');

  const handleM3U8Found = (url) => {
    setSelectedM3U8Url(url);
  };

  const handleCaptureStarted = () => {
    // Clear the selected M3U8 URL after capture is started
    setSelectedM3U8Url('');
  };

  const handleQuickCapture = () => {
    // Scroll to the stream input section
    const streamInputSection = document.querySelector('#stream-input-section');
    if (streamInputSection) {
      streamInputSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-dark-surface dark:via-dark-card dark:to-dark-surface text-white mb-8 transition-colors duration-300">
        <div className="px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <svg className="w-10 h-10 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Stream Clipper Dashboard
              </h1>
              <p className="text-blue-100 text-lg">Capture, clip, and transcribe your favorite streams</p>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 rounded-lg px-4 py-2 backdrop-blur-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">System Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stream Input Section */}
            <div id="stream-input-section" className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden card-hover transition-colors duration-300">
              <div className="bg-gradient-to-r from-green-500 to-teal-500 dark:from-green-600 dark:to-teal-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Stream Capture
                </h2>
              </div>
              <div className="p-6">
                <StreamURLInput onM3U8Found={handleM3U8Found} />
              </div>
            </div>

            {/* Capture Form */}
            {selectedM3U8Url && (
              <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-fadeIn transition-colors duration-300">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 dark:from-orange-600 dark:to-red-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Start Recording
                  </h2>
                </div>
                <div className="p-6">
                  <CaptureForm 
                    m3u8Url={selectedM3U8Url} 
                    onCaptureStarted={handleCaptureStarted} 
                  />
                </div>
              </div>
            )}
            
            {/* Active Captures */}
            <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden card-hover transition-colors duration-300">
              <div className="bg-gradient-to-r from-violet-500 to-purple-500 dark:from-violet-600 dark:to-purple-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 14V6a2 2 0 012-2h6a2 2 0 012 2v12a2 2 0 01-2 2H8a2 2 0 01-2-2z" />
                  </svg>
                  Active Captures
                </h2>
              </div>
              <div className="p-6">
                <ActiveCapturesList />
              </div>
            </div>
          </div>
          
          {/* Sidebar */}
          <div className="space-y-8">
            <LiveStreamsWidget onSelect={handleM3U8Found} />
            <M3U8HistoryList onSelect={handleM3U8Found} />
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <FloatingActionButton onQuickCapture={handleQuickCapture} />
    </div>
  );
};

export default Dashboard;