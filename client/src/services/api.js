// Central Axios API Client with JWT Interceptors & 401 Auto-Handling
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT bearer token from localStorage if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('samanvitha_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized 401 Unauthorized handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;

    if (status === 401) {
      // Clear token and session
      localStorage.removeItem('samanvitha_token');
      localStorage.removeItem('samanvitha_user');

      // Check if current route is not an unauthenticated public route
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/'];
      const currentPath = window.location.pathname;
      const isPublic = publicPaths.some((p) => currentPath === p || currentPath.startsWith('/reset-password/'));

      if (!isPublic) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
