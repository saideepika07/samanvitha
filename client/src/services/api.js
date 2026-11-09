// Central Axios API Client with JWT Interceptors, 401 Auto-Handling & Cold-Start Resilience
import axios from 'axios';

export const SERVER_WAKING_EVENT = 'samanvitha:server-waking';
export const WAKING_MESSAGE =
  'The server is waking up (free hosting). This can take up to a minute, please wait.';

let activeSlowRequestsCount = 0;

function notifyServerWaking(show) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(SERVER_WAKING_EVENT, {
        detail: {
          show,
          message: WAKING_MESSAGE,
        },
      })
    );
  }
}

function clearWakingTimer(config) {
  if (!config) return;
  if (config._wakingTimer) {
    clearTimeout(config._wakingTimer);
    config._wakingTimer = null;
  }
  if (config._isSlow) {
    config._isSlow = false;
    activeSlowRequestsCount = Math.max(0, activeSlowRequestsCount - 1);
    if (activeSlowRequestsCount === 0) {
      notifyServerWaking(false);
    }
  }
}

// 1. Wake-up ping: silently send one GET /api/health request once per page load.
let healthPingSent = false;
export function pingServerHealth() {
  if (healthPingSent) return;
  healthPingSent = true;

  try {
    const rawUrl = import.meta.env.VITE_API_URL || '/api';
    const cleanBase = rawUrl.replace(/\/$/, '');
    const healthUrl = cleanBase.endsWith('/api')
      ? `${cleanBase}/health`
      : `${cleanBase}/api/health`;

    // Silently send one GET /api/health request (once per page load, no repeated polling, no keep-alive timer)
    // Ignore its result
    fetch(healthUrl, { method: 'GET' }).catch(() => {});
  } catch {
    // Silently ignore any initialization error
  }
}

// Helper to determine friendly error messages on timeouts and cold-start failures
export function getFriendlyTimeoutMessage(config) {
  const url = (config?.url || '').toLowerCase();
  const method = (config?.method || 'get').toLowerCase();

  if (url.includes('/auth/register')) {
    // Requirement 5: exact friendly guidance on register timeout
    return 'The request took too long. Your account may have been created. Try logging in with the same email, or register again after a minute.';
  }
  if (url.includes('/auth/login')) {
    return 'The request took too long. The server is waking up. Please try logging in again in a moment.';
  }
  if (url.includes('/auth/forgot-password')) {
    return 'The request took too long. The server is waking up. Please try again in a moment.';
  }
  if (url.includes('/needs') && method === 'post') {
    return 'The request took too long. The need may have been saved. Please check your needs list before trying again.';
  }
  if (url.includes('/donations') && method === 'post' && !url.includes('/cancel')) {
    return 'The request took too long. The donation may have been created. Please check your donations list before trying again.';
  }
  if (url.includes('/reserve') || url.includes('/matches/reserve')) {
    return 'The request took too long. The reservation may have been processed. Please check your reserved matches before trying again.';
  }
  if (url.includes('/status') || url.includes('/cancel')) {
    return 'The request took too long. The update may have been processed. Please refresh to verify.';
  }

  return 'The request took too long. The server is taking longer than expected to respond. Please try again in a moment.';
}

// 2. Axios timeout: 70000 ms for all API calls (free instance takes up to ~1 minute to wake)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 70000,
});

// Request Interceptor: Attach JWT bearer token & initiate 5-second waiting message timer
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('samanvitha_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 3. If request takes longer than 5 seconds, show calm waiting notice
    // Skip timer for silent /health ping
    if (!config.url?.includes('/health')) {
      config._wakingTimer = setTimeout(() => {
        config._isSlow = true;
        activeSlowRequestsCount++;
        notifyServerWaking(true);
      }, 5000);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: GET retry, timeout message formatting & 401 handling
api.interceptors.response.use(
  (response) => {
    clearWakingTimer(response.config);
    return response;
  },
  async (error) => {
    const config = error.config;
    clearWakingTimer(config);

    const isTimeout =
      error.code === 'ECONNABORTED' ||
      Boolean(error.message && error.message.toLowerCase().includes('timeout'));
    const isNetworkError =
      error.code === 'ERR_NETWORK' ||
      error.message === 'Network Error' ||
      (!error.response && Boolean(error.request));
    const isTimeoutOrNetwork = isTimeout || isNetworkError;

    // 4. Retry safely: for GET requests, retry once after a timeout or network error.
    // Do NOT automatically retry POST requests (register, reserve, acknowledge, cancel, etc.)
    if (config && config.method?.toLowerCase() === 'get' && isTimeoutOrNetwork && !config._retry) {
      config._retry = true;
      return api(config);
    }

    // Centralized 401 Unauthorized handling
    const status = error.response ? error.response.status : null;
    if (status === 401) {
      localStorage.removeItem('samanvitha_token');
      localStorage.removeItem('samanvitha_user');
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/'];
      const currentPath = window.location.pathname;
      const isPublic = publicPaths.some(
        (p) => currentPath === p || currentPath.startsWith('/reset-password/')
      );
      if (!isPublic) {
        window.location.href = '/login';
      }
    }

    // 5 & 6. Friendly error message transformation for timeouts & cold starts
    // Never show raw text "timeout of 15000ms exceeded" (or any variation) to users
    if (isTimeoutOrNetwork || (error.message && /timeout of \d+ms exceeded/i.test(error.message))) {
      const friendlyMessage = getFriendlyTimeoutMessage(config);
      error.message = friendlyMessage;

      if (!error.response) {
        error.response = {
          status: 408,
          data: {
            success: false,
            error: friendlyMessage,
            message: friendlyMessage,
          },
        };
      } else {
        if (!error.response.data) {
          error.response.data = {};
        }
        error.response.data.error = friendlyMessage;
        error.response.data.message = friendlyMessage;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
