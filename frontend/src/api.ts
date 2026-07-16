import axios from 'axios';

const getBaseURL = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const hostname = window.location.hostname;
  return `http://${hostname}:8000/api`;
};

const api = axios.create({
  baseURL: getBaseURL(),
});

export const getWsURL = (path: string) => {
  const token = localStorage.getItem('token');
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) {
    const urlObj = new URL(envUrl);
    const wsProto = urlObj.protocol === 'https:' ? 'wss:' : 'ws:';
    const cleanPath = urlObj.pathname.endsWith('/') ? urlObj.pathname.slice(0, -1) : urlObj.pathname;
    return `${wsProto}//${urlObj.host}${cleanPath}${path}?token=${token}`;
  }
  const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const hostname = window.location.hostname;
  return `${wsProto}//${hostname}:8000/api${path}?token=${token}`;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If we get a 401 Unauthorized and it's not the login/reauth endpoint, redirect to login
    if (
      error.response?.status === 401 &&
      !error.config.url.includes('/auth/login') &&
      !error.config.url.includes('/admin/verify-reauth')
    ) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
