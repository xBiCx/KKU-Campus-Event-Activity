import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Default LAN IP for development with real device on Wi-Fi
export const DEFAULT_API_BASE_URL = 'http://10.238.177.249:5000/api';

// Current active base URL cache in memory
let currentApiBaseUrl = DEFAULT_API_BASE_URL;

// Initialize base URL from AsyncStorage if available
AsyncStorage.getItem('custom_server_ip').then((customIp) => {
  if (customIp) {
    currentApiBaseUrl = `http://${customIp}:5000/api`;
    api.defaults.baseURL = currentApiBaseUrl;
  }
}).catch(() => {});

export const updateActiveBaseUrl = (newIp: string) => {
  currentApiBaseUrl = `http://${newIp}:5000/api`;
  api.defaults.baseURL = currentApiBaseUrl;
};

export const getActiveBaseUrl = (): string => {
  return currentApiBaseUrl;
};

const api = axios.create({
  baseURL: DEFAULT_API_BASE_URL,
  timeout: 10000,
});

// Interceptor to inject JWT token and current custom IP
api.interceptors.request.use(
  async (config) => {
    try {
      const customIp = await AsyncStorage.getItem('custom_server_ip');
      if (customIp) {
        config.baseURL = `http://${customIp}:5000/api`;
        currentApiBaseUrl = config.baseURL;
      }
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Error reading auth token or custom IP from storage', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export const resolveImageUrl = (url?: string | null): string | null => {
  if (!url) return null;
  const baseUrlHost = currentApiBaseUrl.replace(/\/api\/?$/, '');

  if (url.startsWith('http://') || url.startsWith('https://')) {
    // If the image URL points to /uploads/, replace whatever host/port it was with our current backend host
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.pathname.startsWith('/uploads')) {
        const parsedBase = new URL(baseUrlHost);
        return `${parsedBase.protocol}//${parsedBase.host}${parsedUrl.pathname}`;
      }
    } catch {
      // Fallback
    }
    return url;
  }

  // Relative path e.g. /uploads/...
  return `${baseUrlHost}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default api;
