import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Scraper service
const scrapeM3U8 = async (streamPageUrl) => {
  const response = await api.post('/scrape/find-m3u8', { streamPageUrl });
  return response.data;
};

// Capture service
const startCapture = async (captureData) => {
  const response = await api.post('/capture/start', captureData);
  return response.data;
};

const stopCapture = async (sessionId) => {
  const response = await api.post('/capture/stop', { sessionId });
  return response.data;
};

const getCaptureStatus = async () => {
  const response = await api.get('/capture/status');
  return response.data;
};

const getSessionLogs = async (sessionId) => {
  const response = await api.get(`/capture/${sessionId}/logs`);
  return response.data;
};

// Transcription service
const startTranscription = async (sessionId, clipId) => {
  const response = await api.post('/transcription/start', { sessionId, clipId });
  return response.data;
};

const getTranscriptionStatus = async (sessionId) => {
  const response = await api.get(`/transcription/status/${sessionId}`);
  return response.data;
};

const getTranscript = async (sessionId) => {
  const response = await api.get(`/transcription/${sessionId}`);
  return response.data;
};

const getClipTranscript = async (clipId) => {
  const response = await api.get(`/transcription/clip/${clipId}`);
  return response.data;
};

const getAllTranscriptions = async () => {
  const response = await api.get('/transcription/all');
  return response.data;
};

// Search service
const searchTranscripts = async (query, filters) => {
  const response = await api.post('/search/transcripts', { query, filters });
  return response.data;
};

const searchMedia = async (query, filters) => {
  const response = await api.post('/search/media', { query, filters });
  return response.data;
};

// Media service
const getAllCaptures = async () => {
  const response = await api.get('/media/captures');
  return response.data;
};

const deleteSession = async (sessionId) => {
  const response = await api.delete(`/media/captures/${sessionId}`);
  return response.data;
};

const updateCaptureMetadata = async (sessionId, updates) => {
  const response = await api.patch(`/media/captures/${sessionId}`, updates);
  return response.data;
};

const createSessionMp4 = async (sessionId, name) => {
  const response = await api.post(`/media/captures/${sessionId}/export`, { name });
  return response.data;
};

const getAllClips = async () => {
  const response = await api.get('/media/clips');
  return response.data;
};

const createClip = async (clipData) => {
  const response = await api.post('/media/clips/create', clipData);
  return response.data;
};

const getClipDownloadUrl = (clipId) => {
  return `/api/media/clips/${clipId}/download`;
};

const createCompilation = async (compilationData) => {
  const response = await api.post('/media/compilations/create', compilationData);
  return response.data;
};

const getM3U8History = async () => {
  const response = await api.get('/media/m3u8-history');
  return response.data;
};

const favoriteM3U8 = async (m3u8Url, isFavorite) => {
  const response = await api.post('/media/m3u8-history/favorite', { m3u8Url, isFavorite });
  return response.data;
};

// Stream status service
const getStreamStatuses = async () => {
  const response = await api.get('/media/stream-status');
  return response.data;
};

const getLiveStreams = async () => {
  const response = await api.get('/media/stream-status/live');
  return response.data;
};

const refreshStreamStatuses = async () => {
  const response = await api.post('/media/stream-status/refresh');
  return response.data;
};

const getStreamStatus = async (m3u8Url) => {
  const response = await api.get('/media/stream-status/check', {
    params: { m3u8Url }
  });
  return response.data;
};

// Config service
const getConfig = async () => {
  const response = await api.get('/config');
  return response.data;
};

const saveConfig = async (configData) => {
  const response = await api.post('/config', configData);
  return response.data;
};

const getWhisperStatus = async () => {
  const response = await api.get('/config/whisper/status');
  return response.data;
};

const installWhisper = async () => {
  const response = await api.post('/config/whisper/install');
  return response.data;
};

export default {
  scrapeM3U8,
  startCapture,
  stopCapture,
  getCaptureStatus,
  getSessionLogs,
  startTranscription,
  getTranscriptionStatus,
  getTranscript,
  getClipTranscript,
  getAllTranscriptions,
  searchTranscripts,
  searchMedia,
  getAllCaptures,
  deleteSession,
  updateCaptureMetadata,
  createSessionMp4,
  getAllClips,
  createClip,
  getClipDownloadUrl,
  createCompilation,
  getM3U8History,
  favoriteM3U8,
  getConfig,
  saveConfig,
  getWhisperStatus,
  installWhisper,
  getStreamStatuses,
  getLiveStreams,
  refreshStreamStatuses,
  getStreamStatus
};