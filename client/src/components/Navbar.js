import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';

const Navbar = () => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard' },
    { path: '/clips', label: 'Clips Library' },
    { path: '/transcriptions', label: 'Transcriptions' },
    { path: '/settings', label: 'Settings' }
  ];

  return (
    <nav className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-dark-surface dark:via-dark-card dark:to-dark-surface text-white shadow-lg transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex justify-between">
          <div className="flex space-x-4">
            <div className="flex items-center py-4 px-2">
              <svg className="w-8 h-8 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="font-bold text-xl">Stream Clipper</span>
            </div>
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map(item => (
                <Link 
                  key={item.path} 
                  to={item.path}
                  className={`py-4 px-3 rounded-lg hover:bg-white hover:bg-opacity-20 transition duration-300 ${
                    location.pathname === item.path 
                      ? 'font-bold bg-white bg-opacity-20 backdrop-blur-sm' 
                      : ''
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium hidden sm:block">
                Theme
              </span>
              <ThemeToggle />
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button className="mobile-menu-button p-2 focus:outline-none">
                <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mobile-menu hidden md:hidden">
        {navItems.map(item => (
          <Link 
            key={item.path} 
            to={item.path}
            className={`block py-2 px-4 text-sm hover:bg-blue-700 ${location.pathname === item.path ? 'font-bold bg-blue-700' : ''}`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navbar;