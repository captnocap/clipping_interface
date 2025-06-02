Project: Stream Clipper & Transcription Tool (Enhanced with Scraper)

Goal: Create a web application that allows users to input a stream page URL to find the M3U8, capture HLS (m3u8) streams, transcode them using FFmpeg with configurable settings, store clips, transcribe audio using Whisper, search transcriptions, create smaller clips from captured segments, and utilize additional workflow enhancements.

I. Core Technologies:

    Frontend:

        React (with Hooks and Functional Components)

        State Management: React Context API or Zustand (for simplicity)

        Routing: React Router

        Styling: Tailwind CSS

        HTTP Client: Axios or Fetch API

        (Potentially) WebSockets for real-time log/progress updates

    Backend:

        Node.js

        Framework: Express.js

        Process Management: child_process module (for FFmpeg and potentially Whisper CLI)

        HTTP Client (for scraping): Axios (or Node-fetch)

        HTML Parsing (for scraping): Cheerio (for server-side jQuery-like DOM manipulation) or JSDOM (for more complex cases, heavier)

        System Information (Optional, for resource monitoring): Libraries like systeminformation

    Video/Audio Processing:

        FFmpeg (command-line tool)

        Whisper (OpenAI's ASR model)

    Data Storage (for history, metadata, transcriptions, settings):

        Simple local file-based DB: NeDB, LowDB, or JSON files.

        For more robust needs: SQLite.

    Directory Structure (Conceptual):

    /stream-clipper-app
    ├── client/          # React Frontend
    │   ├── public/
    │   └── src/
    │       ├── components/
    │       ├── pages/
    │       ├── services/
    │       ├── hooks/
    │       ├── contexts/
    │       ├── assets/
    │       ├── App.js
    │       └── index.js
    ├── server/          # Node.js Backend
    │   ├── controllers/
    │   ├── routes/
    │   ├── services/    # ffmpeg.service, whisper.service, file.service, scraper.service, etc.
    │   ├── middleware/
    │   ├── clips_library/
    │   │   └── [streamer_identifier_or_m3u8_hash]/
    │   │       └── [capture_session_timestamp]/
    │   │           ├── segments/
    │   │           ├── clips/
    │   │           ├── transcripts/
    │   │           └── compilations/
    │   ├── config/
    │   └── server.js
    ├── package.json
    └── (client package.json inside client/)

II. Backend Development (Node.js/Express.js):

    API Endpoints:

        Scraping:

            POST /api/scrape/find-m3u8:

                Request Body: { "streamPageUrl": "https://kick.com/streamer_name" }

                Action: Uses scraper.service.js to fetch the page content and parse it to find an M3U8 URL.

                Response: { "m3u8Url": "found_url.m3u8" } or { "error": "Could not find M3U8 URL." }

        Capture Management:

            POST /api/capture/start: (Request body remains the same, expects a direct M3U8 URL. Frontend will use the scraper first if needed.)

                Request Body: { "m3u8Url": "...", "streamerName": "optional_name", "ffmpegSettings": { ... }, "autoTranscribe": boolean, "namingConvention": "template_string (optional)" }

                Action & Response: (As previously defined)

            POST /api/capture/stop: (No change)

            GET /api/capture/status: (No change)

            GET /api/capture/:sessionId/logs: (No change)

        Transcription: (No change)

        Search & Clipping: (No change)

        Media & History Management: (No change, though m3u8Url in history will now be the direct one, even if initially found via scraping)

        Settings & Monitoring: (No change)

    Core Services (server/services/):

        scraper.service.js:

            async findM3U8(streamPageUrl):

                Fetches HTML content of streamPageUrl using axios.

                Uses cheerio to parse the HTML.

                Implements logic to search for M3U8 patterns (e.g., in <video src="...">, inline JavaScript, or known JSON data structures within script tags).

                May require platform-specific selectors or regex patterns.

                Returns the found M3U8 URL or throws an error.

        ffmpeg.service.js: (As previously defined)

        whisper.service.js: (As previously defined)

        file.service.js: (As previously defined)

        search.service.js: (As previously defined)

        scheduler.service.js: (As previously defined)

    Configuration (server/config/):

        scraper.config.js (Optional: could hold selectors or patterns for different known streaming sites if the logic becomes complex).

        (Other config files as previously defined)

III. Frontend Development (React):

    Main Views/Pages (client/src/pages/):

        Dashboard/Capture Page:

            Stream URL Input Area (Component):

                A single input field for either a direct M3U8 URL or a stream page URL (e.g., Kick, Twitch channel page).

                A "Find M3U8" button, enabled if the input looks like a page URL.

                Clicking "Find M3U8" calls the /api/scrape/find-m3u8 endpoint.

                Displays a loading indicator during the search.

                On success, it can either:

                    Automatically populate a (perhaps read-only or clearly marked) "Detected M3U8 URL" field.

                    Or, replace the page URL in the input with the found M3U8 URL.

                Displays errors if M3U8 is not found.

            M3U8 Input (for direct entry or auto-filled by scraper):

                This field will ultimately provide the M3U8 to the "Start Capture" logic.

                Dropdown for M3U8 history (populated with direct M3U8s).

            (Rest of the capture page as previously defined: streamer name, FFmpeg settings, auto-transcribe, start button, active captures, resource indicator)

    Reusable Components (client/src/components/):

        StreamURLInput.js (New or enhanced component for handling page URL input and M3U8 finding logic)

        M3U8HistoryList.js

        MediaListItem.js

        FfmpegProgressModal.js

        ClipCompilationBin.js

        NamingConventionEditor.js

        ResourceMonitorWidget.js

    API Service (client/src/services/api.js):

        Add function: scrapeM3U8(streamPageUrl) to call POST /api/scrape/find-m3u8.

        (Other API functions as previously defined)

    State Management (client/src/contexts/ or Zustand store):

        Manage state for:

            The URL entered by the user (page or M3U8).

            The detected M3U8 URL after scraping.

            Loading/error states for the scraping process.

            (Other states as previously defined)

IV. Key Features - Implementation Considerations (Updated):

    M3U8 URL Scraping:

        Reliability: This is the most significant challenge. Website structures change, making scrapers brittle.

        Targeted vs. Generic: It's easier to build reliable scrapers for specific known sites (e.g., a Kick scraper, a Twitch scraper) than a generic one.

        Dynamic Content: Many sites load M3U8 URLs via JavaScript after the initial HTML load. Cheerio parses static HTML. For dynamically loaded content, you might need a headless browser like Puppeteer on the backend, which adds significant complexity and resource overhead. Start with static HTML parsing and see how far it gets.

        User-Agent: Set a realistic User-Agent header when making requests to avoid being blocked.

        Error Handling: Provide clear feedback to the user if an M3U8 URL cannot be found or if the provided URL is not a supported stream page.

        Rotational URLs: The scraper helps find the current M3U8. If it's highly dynamic and changes mid-stream after FFmpeg has started, FFmpeg itself usually handles manifest reloads. The scraper's job is to get the initial valid M3U8.

    Thumbnail Generation: (As previously defined)

    Automated Transcription: (As previously defined)

    Detailed FFmpeg Progress/Logs: (As previously defined)

    Clip "Bin" or "Compilation" Feature: (As previously defined)

    Favorite/Pin M3U8 URLs: (As previously defined - will store direct M3U8s)

    Basic Resource Monitoring Indication: (As previously defined)

    Customizable Output Naming Conventions: (As previously defined)

This addition makes the tool significantly more user-friendly for those less technically inclined to find M3U8 URLs. The main challenge will be the robustness of the scraper.