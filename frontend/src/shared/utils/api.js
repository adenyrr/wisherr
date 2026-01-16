import axios from 'axios';

// Determine baseURL: prefer REACT_APP_API_URL but ensure it targets the API prefix '/api'.
// If not provided, fall back to relative '/api' so nginx can proxy to backend.
const _envUrl = process.env.REACT_APP_API_URL;
let baseURL = '/api';
if (_envUrl) {
  // strip trailing slashes
  const cleaned = _envUrl.replace(/\/+$/, '');
  baseURL = cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
}

const api = axios.create({
  baseURL,
  // Force cache busting with timestamp
  headers: {
    'Cache-Control': 'no-cache',
    'X-App-Version': Date.now().toString(),
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers = config.headers || {};
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default api;
