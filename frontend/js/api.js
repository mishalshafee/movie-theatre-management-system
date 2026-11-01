/**
 * Centralized API client built on the native fetch API.
 *
 * Auth strategy (matches the existing backend):
 *  - Short-lived access token  -> kept in memory only (module variable).
 *  - Long-lived refresh token  -> stored in an HTTP-only cookie by the backend.
 *  - credentials: 'include'    -> so the browser sends/receives the cookie.
 *
 * On a 401 we try to refresh once and replay the original request.
 * We guard against concurrent refresh requests and against infinite loops.
 *
 * No external libraries — pure fetch.
 */
import { API_BASE_URL } from './config.js';

/* ----------------------------------------------------------------
   In-memory access token (never persisted to localStorage)
   ---------------------------------------------------------------- */
let accessToken = null;

export function setAccessToken(token) {
  accessToken = token || null;
}

export function getAccessToken() {
  return accessToken;
}

export function clearAccessToken() {
  accessToken = null;
}

/* ----------------------------------------------------------------
   Refresh-token deduplication
   ---------------------------------------------------------------- */
let refreshPromise = null;

/**
 * Ask the backend for a new access token. The refresh token travels in the
 * HTTP-only cookie automatically thanks to `credentials: 'include'`.
 * Returns the new access token or throws on failure.
 */
export function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = new Error('Refresh failed');
          err.status = res.status;
          throw err;
        }
        const data = await res.json();
        const next = data?.accessToken || null;
        setAccessToken(next);
        return next;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/* ----------------------------------------------------------------
   Core request function
   ---------------------------------------------------------------- */
/**
 * Perform an authenticated API request.
 * @param {string} path     - path beginning with / (e.g. '/api/auth/login')
 * @param {object} options  - fetch options (method, body, etc.)
 * @param {boolean} isRetry - internal flag to prevent infinite refresh loops
 * @returns {Promise<Response>} the fetch Response (caller reads .json() etc.)
 */
export async function apiRequest(path, options = {}, isRetry = false) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  };

  let res = await fetch(`${API_BASE_URL}${path}`, config);

  // Only attempt a refresh on a 401, and only once per request,
  // and never refresh the refresh endpoint itself (prevents loops).
  const isRefreshCall = path.includes('/api/auth/refresh');
  const isAuthCall =
    path.includes('/api/auth/login') || path.includes('/api/auth/register');

  if (
    res.status === 401 &&
    !isRetry &&
    !isRefreshCall &&
    !isAuthCall
  ) {
    try {
      const newToken = await refreshAccessToken();
      if (newToken) {
        headers.Authorization = `Bearer ${newToken}`;
        return apiRequest(path, options, true);
      }
    } catch (refreshError) {
      clearAccessToken();
      throw refreshError;
    }
  }

  return res;
}

/**
 * Convenience JSON helper: request + parse + throw on non-2xx with backend msg.
 */
export async function apiJSON(path, options = {}) {
  const res = await apiRequest(path, options);
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* no body */
  }
  if (!res.ok) {
    const err = new Error('API error');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
