/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0f172a',       // slate-900
          surface: '#1e293b',  // slate-800  
          card: '#334155',     // slate-700
          text: '#f1f5f9',     // slate-100
          muted: '#94a3b8',    // slate-400
          border: '#475569',   // slate-600
        }
      }
    },
  },
  plugins: [],
}