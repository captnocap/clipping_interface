import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import Dashboard from './pages/Dashboard';
import ClipsLibrary from './pages/ClipsLibrary';
import Transcriptions from './pages/Transcriptions';
import Settings from './pages/Settings';
import Navbar from './components/Navbar';

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-dark-bg dark:via-dark-surface dark:to-dark-card transition-colors duration-300">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/clips" element={<ClipsLibrary />} />
            <Route path="/transcriptions" element={<Transcriptions />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;