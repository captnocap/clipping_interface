const express = require('express');
const cors = require('cors');
const path = require('path');

// Import routes
const scraperRoutes = require('./routes/scraper.routes');
const captureRoutes = require('./routes/capture.routes');
const transcriptionRoutes = require('./routes/transcription.routes');
const searchRoutes = require('./routes/search.routes');
const mediaRoutes = require('./routes/media.routes');
const configRoutes = require('./routes/config.routes');

// Import services
const streamStatusService = require('./services/stream-status.service');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/scrape', scraperRoutes);
app.use('/api/capture', captureRoutes);
app.use('/api/transcription', transcriptionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/config', configRoutes);

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('client/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Start stream status checking
  streamStatusService.startStatusChecking();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down gracefully...');
  streamStatusService.stopStatusChecking();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...');
  streamStatusService.stopStatusChecking();
  process.exit(0);
});