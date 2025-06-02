import React, { useState } from 'react';

const FloatingActionButton = ({ onQuickCapture }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handleQuickCapture = () => {
    setIsExpanded(false);
    if (onQuickCapture) {
      onQuickCapture();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Quick Actions Menu */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 mb-2 space-y-2 animate-slideIn">
          <button
            onClick={handleQuickCapture}
            className="flex items-center space-x-3 bg-white rounded-full shadow-lg px-4 py-3 text-gray-700 hover:text-red-600 hover:shadow-xl transition-all duration-300 group btn-hover-lift"
            title="Quick Capture"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">Quick Capture</span>
          </button>
          
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center space-x-3 bg-white rounded-full shadow-lg px-4 py-3 text-gray-700 hover:text-blue-600 hover:shadow-xl transition-all duration-300 group btn-hover-lift"
            title="Scroll to Top"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
            <span className="font-medium">Scroll to Top</span>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={toggleExpanded}
        className={`w-14 h-14 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center group btn-hover-lift ${
          isExpanded ? 'rotate-45' : 'rotate-0'
        }`}
        title="Quick Actions"
      >
        <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </button>

      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 -z-10"
          onClick={toggleExpanded}
        />
      )}
    </div>
  );
};

export default FloatingActionButton;