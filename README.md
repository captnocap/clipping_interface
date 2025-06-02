# 🎬 Stream Clipper & Transcription Tool

A modern, feature-rich web application for capturing, transcribing, and managing stream clips with advanced HLS stream monitoring and beautiful UI.

![License](https://img.shields.io/badge/license-ISC-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-v14+-green.svg)
![React](https://img.shields.io/badge/react-18.x-blue.svg)

## ✨ Features

### 🔴 **Live Stream Monitoring**
- **Real-time stream status**: Automatic monitoring of M3U8 URLs every minute
- **Live indicators**: Visual pulsing indicators for active streams
- **Stream discovery**: Find and track streams from your history
- **Live stream viewer**: Watch streams directly in the browser with HLS.js integration

### 📺 **Stream Capture & Management**
- **M3U8 URL scraping**: Extract M3U8 URLs from popular streaming platforms
- **Advanced stream capture**: Record HLS streams using FFmpeg with configurable settings
- **Session management**: Track and manage multiple capture sessions
- **Metadata editing**: Add custom names and descriptions to captures

### ✂️ **Clip Creation & Editing**
- **Precise clip creation**: Create clips from any part of captured streams
- **Timestamp-based clipping**: Create clips directly from transcript timestamps with 1-second buffers
- **Clip compilation**: Combine multiple clips into single videos
- **Download & streaming**: Stream or download clips instantly

### 🎤 **Advanced Transcription**
- **Whisper integration**: Automatic audio transcription using OpenAI Whisper
- **Multiple models**: Support for different Whisper model sizes (base, small, medium, large)
- **Searchable transcripts**: Full-text search across all transcriptions
- **Transcript viewing**: Beautiful transcript viewer with timestamps
- **Quick clip creation**: Create clips directly from transcript timestamps

### 🔍 **Smart Search & Discovery**
- **Full-text search**: Search across transcripts and media metadata
- **Advanced filtering**: Filter by date, streamer, and content type
- **Search highlighting**: Visual highlighting of search terms
- **Quick access**: Instant access to relevant clips and transcripts

### 📚 **History & Favorites**
- **M3U8 history**: Automatic tracking of all stream URLs
- **Favorites system**: Mark frequently used streams as favorites
- **Usage statistics**: Track how often streams are used
- **Smart sorting**: Favorites first, then by usage and recency

### 🎨 **Modern UI/UX**
- **Beautiful design**: Modern gradient-based design with smooth animations
- **Dark mode**: Complete dark theme with automatic system detection
- **Responsive layout**: Works perfectly on desktop, tablet, and mobile
- **Live indicators**: Pulsing animations and visual feedback for live streams
- **Floating actions**: Quick access floating action button
- **Card-based layout**: Clean, organized interface with hover effects

### ⚙️ **Configuration & Settings**
- **FFmpeg settings**: Configure video/audio codecs and quality
- **Whisper configuration**: Choose transcription models and settings
- **Path management**: Set custom paths for outputs and dependencies
- **Theme preferences**: Light/dark mode with persistence

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher)
- [FFmpeg](https://ffmpeg.org/) installed and accessible in PATH
- [Whisper](https://github.com/openai/whisper) (optional, for transcription)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/captnocap/clipping_interface
   cd clipping_interface
   ```

2. **Install all dependencies:**
   ```bash
   npm run install-all
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open your browser:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

## 🖥️ Usage Guide

### 📊 Dashboard
The main hub featuring:
- **Stream input**: Paste stream URLs to find M3U8 links
- **Live streams widget**: See which streams are currently live
- **Stream history**: Quick access to previously used streams
- **Active captures**: Monitor ongoing recordings

### 🔴 Live Stream Monitoring
1. Add M3U8 URLs to your history (automatically tracked)
2. The system monitors all URLs every minute
3. Live streams appear with pulsing red indicators
4. Click "Watch" to view streams in a beautiful modal player
5. Click "Capture" to start recording

### ✂️ Creating Clips
**From Captures:**
1. Go to Clips Library → View capture details
2. Set start and end times
3. Add a custom name
4. Click "Create Clip"

**From Transcripts:**
1. View any transcript in the Transcriptions page
2. Find the timestamp you want to clip
3. Click the green "Create Clip" button next to the timestamp
4. The clip form auto-fills with the timestamp ± 1 second buffer

### 🎤 Transcription Workflow
1. Capture a stream or upload audio
2. Go to Transcriptions page
3. Click "Start Transcription" for any capture/clip
4. Choose Whisper model (larger = more accurate, slower)
5. Wait for processing (runs in background)
6. Search, view, and create clips from transcripts

### 🔍 Search & Discovery
- **Global search**: Use the search bar to find content across all transcripts
- **Filter by type**: Filter results by transcripts, clips, or captures
- **Date filtering**: Find content from specific time periods
- **Instant results**: Real-time search with highlighting

### 🎨 Theme & Customization
- **Dark mode toggle**: Click the theme switch in the navbar
- **Auto-detection**: Follows your system dark/light preference
- **Persistent settings**: Your theme choice is saved
- **Smooth transitions**: Beautiful animations between themes

## 🏗️ Architecture

### Backend (Node.js/Express)
```
server/
├── controllers/     # Request handlers
├── routes/         # API route definitions
├── services/       # Business logic
│   ├── ffmpeg.service.js      # Video processing
│   ├── whisper.service.js     # Transcription
│   ├── scraper.service.js     # M3U8 extraction
│   ├── stream-status.service.js # Live monitoring
│   └── search.service.js      # Search functionality
├── data/           # Configuration and history
└── clips_library/  # Stored captures and clips
```

### Frontend (React)
```
client/src/
├── components/     # Reusable UI components
│   ├── LiveStreamsWidget.js   # Live stream monitoring
│   ├── LiveStreamViewer.js    # HLS video player
│   ├── ThemeToggle.js         # Dark mode switch
│   └── ...
├── pages/         # Main application pages
│   ├── Dashboard.js           # Main interface
│   ├── ClipsLibrary.js        # Clip management
│   ├── Transcriptions.js      # Transcript viewer
│   └── Settings.js            # Configuration
├── contexts/      # React contexts (theme, etc.)
└── services/      # API communication
```

## 🔧 API Reference

### Stream Monitoring
- `GET /api/media/stream-status` - Get all stream statuses
- `GET /api/media/stream-status/live` - Get only live streams
- `POST /api/media/stream-status/refresh` - Force refresh all statuses
- `GET /api/media/stream-status/check?m3u8Url=<url>` - Check specific stream

### Scraping & Discovery
- `POST /api/scrape/find-m3u8` - Extract M3U8 from stream page URL

### Capture Management
- `POST /api/capture/start` - Start recording a stream
- `POST /api/capture/stop` - Stop active capture
- `GET /api/capture/status` - Get all active captures
- `GET /api/capture/:sessionId/logs` - Get capture logs

### Clip Creation
- `POST /api/media/clips/create` - Create clip from capture
- `GET /api/media/clips` - List all clips
- `GET /api/media/clips/:clipId/download` - Download clip
- `GET /api/media/clips/stream/:clipId` - Stream clip

### Transcription
- `POST /api/transcription/start` - Start transcription job
- `GET /api/transcription/status/:sessionId` - Check transcription status
- `GET /api/transcription/:sessionId` - Get completed transcript
- `GET /api/transcription/all` - List all transcriptions

### Search & Discovery
- `POST /api/search/transcripts` - Search transcript content
- `POST /api/search/media` - Search media metadata

### History & Favorites
- `GET /api/media/m3u8-history` - Get stream URL history
- `POST /api/media/m3u8-history/favorite` - Toggle favorite status

### Configuration
- `GET /api/config` - Get application settings
- `POST /api/config` - Update settings
- `GET /api/config/whisper-status` - Check Whisper installation

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Custom ports
PORT=5000                    # Backend port (default: 5000)
REACT_APP_API_URL=...       # API URL for frontend (auto-detected)

# Optional: Custom paths
FFMPEG_PATH=/path/to/ffmpeg
WHISPER_PATH=/path/to/whisper
OUTPUT_PATH=/custom/output/path
```

### Application Settings
Configure through the Settings page:
- **FFmpeg settings**: Codecs, quality, format preferences
- **Whisper settings**: Model size, language, transcription options
- **Storage settings**: Output directories, naming conventions
- **Capture settings**: Concurrent captures, segment duration

## 🎯 Use Cases

### Content Creators
- Monitor multiple streams for interesting moments
- Create highlight clips from live streams
- Generate searchable transcripts for content review
- Build clip compilations for social media

### Researchers & Analysts
- Capture and analyze live stream content
- Search across hours of transcribed audio
- Create timestamped clips for evidence or reference
- Track patterns across multiple streams

### Archivists
- Preserve important live stream moments
- Build searchable archives of stream content
- Organize content with metadata and favorites
- Create accessible transcripts for audio content

## 🐛 Troubleshooting

### Common Issues

**FFmpeg not found:**
- Ensure FFmpeg is installed and in your system PATH
- On Windows: Add FFmpeg to environment variables
- On macOS: `brew install ffmpeg`
- On Linux: `apt install ffmpeg` or equivalent

**Whisper not working:**
- Install: `pip install openai-whisper`
- Check installation in Settings page
- Ensure Python is accessible
- For GPU acceleration: Install CUDA-enabled PyTorch

**Streams not detected as live:**
- Check your internet connection
- Verify M3U8 URLs are still valid
- Some streams block automated requests
- Try refreshing stream status manually

**Dark mode not working:**
- Clear browser cache and localStorage
- Ensure JavaScript is enabled
- Check browser console for errors

## 📝 Development

### Available Scripts

```bash
# Install all dependencies (client + server)
npm run install-all

# Development (runs both frontend and backend)
npm run dev

# Run only backend
npm run server

# Run only frontend  
npm run client

# Build frontend for production
cd client && npm run build

# Start production server
npm start
```

### Development Workflow

1. **Backend changes**: Server auto-restarts with nodemon
2. **Frontend changes**: React hot-reload updates instantly
3. **Database**: JSON files in `server/data/` (automatically created)
4. **Logs**: Check browser console and terminal output

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI Whisper** - For excellent speech-to-text capabilities
- **FFmpeg** - For powerful video processing
- **HLS.js** - For in-browser HLS stream playback
- **Tailwind CSS** - For beautiful, responsive styling
- **React** - For the modern frontend framework

---

⭐ **Star this repository if you find it helpful!**

For support, feature requests, or bug reports, please open an issue on GitHub.
