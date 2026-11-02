/**
 * Centralized Fetch API client.
 *
 * Responsibilities:
 *  - single place that knows the API base URL
 *  - JSON request/response handling (including empty 204 bodies)
 *  - Authorization header from the in-memory access token (with tab-sessionStorage fallback)
 *  - credentials: "include" so the backend-managed refresh cookie travels along
 *  - structured error normalization ({ status, code, message, details })
 *  - request timeout via AbortController
 *  - automatic TOKEN_EXPIRED handling: refresh once, then retry the original request
 *  - single-flight refresh so concurrent 401s never trigger parallel refresh calls
 */

import { API_BASE_URL } from "../config.js";

/* ------------------------------------------------------------------ *
 * Access-token state — in memory with tab-sessionStorage fallback.
 * ------------------------------------------------------------------ */

let accessToken = null;
try {
  accessToken = sessionStorage.getItem("cinelux_token") || null;
} catch {}

let refreshPromise = null;
let onUnauthorizedHandler = null;

export function getToken() {
  if (!accessToken) {
    try {
      accessToken = sessionStorage.getItem("cinelux_token") || null;
    } catch {}
  }
  return accessToken;
}

export function setToken(token) {
  accessToken = token || null;
  try {
    if (token) sessionStorage.setItem("cinelux_token", token);
    else sessionStorage.removeItem("cinelux_token");
  } catch {}
}

export function clearToken() {
  accessToken = null;
  try {
    sessionStorage.removeItem("cinelux_token");
  } catch {}
}

/** Register a callback invoked when the session becomes unrecoverable. */
export function onUnauthorized(fn) {
  onUnauthorizedHandler = typeof fn === "function" ? fn : null;
}

/* ------------------------------------------------------------------ *
 * Error normalization
 * ------------------------------------------------------------------ */

const FRIENDLY_MESSAGES = {
  VALIDATION_ERROR: "Some details are missing or invalid. Please check the highlighted fields.",
  TOKEN_EXPIRED: "Your session expired. Refreshing…",
  UNAUTHORIZED: "Please sign in to continue.",
  REFRESH_REUSED: "Your session is no longer valid. Please sign in again.",
  INVALID_CREDENTIALS: "Incorrect email or password. Please try again.",
  FORBIDDEN: "You do not have permission to perform this action.",
  NOT_FOUND: "We could not find what you were looking for.",
  EMAIL_TAKEN: "An account with this email already exists.",
  SCREEN_NAME_TAKEN: "A screen with this name already exists.",
  SEAT_UNAVAILABLE: "Sorry — one or more of those seats were just taken by another customer.",
  INVALID_SEATS: "Those seats do not belong to this screen.",
  HOLD_EXPIRED: "Your seat hold has expired. Please choose your seats again.",
  SHOWTIME_STARTED: "This showtime has already started and can no longer be booked.",
  SHOWTIME_OVERLAP: "This screen already has a showtime overlapping that period.",
  IN_USE: "This item is still referenced by other records and cannot be deleted.",
  BOOKING_NOT_PAYABLE: "This booking can no longer be paid.",
  BOOKING_NOT_CANCELLABLE: "This booking can no longer be cancelled.",
  INTERNAL: "Something went wrong on our side. Please try again.",
  TIMEOUT: "The server took too long to respond. Please try again.",
  NETWORK: "Cannot reach the cinema server. Check that the backend is running on port 4000.",
};

/** Build a normalized error object from an HTTP status + parsed body. */
export function normalizeError(status, data) {
  const apiError = data && data.error ? data.error : {};
  const code = apiError.code || (status === 404 ? "NOT_FOUND" : "INTERNAL");
  return {
    status,
    code,
    message: apiError.message || FRIENDLY_MESSAGES[code] || "Unexpected error.",
    friendly: FRIENDLY_MESSAGES[code] || apiError.message || "Unexpected error.",
    details: Array.isArray(apiError.details) ? apiError.details : null,
  };
}

export function friendlyMessage(error) {
  if (!error) return "Unexpected error.";
  if (error.friendly) return error.friendly;
  return FRIENDLY_MESSAGES[error.code] || error.message || "Unexpected error.";
}

/* ------------------------------------------------------------------ *
 * Session refresh (single-flight)
 * ------------------------------------------------------------------ */

/**
 * POST /api/auth/refresh using the HTTP-only cookie.
 * Concurrent callers share the same in-flight promise (prevents
 * refresh-token rotation reuse errors).
 */
export function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (res.status === 204) return null;
        let data = null;
        try {
          data = await res.json();
        } catch {
          /* ignore */
        }
        if (!res.ok) {
          const error = normalizeError(res.status, data);
          if (error.code === "UNAUTHORIZED" || error.code === "REFRESH_REUSED") {
            clearToken();
          }
          throw error;
        }
        setToken(data.accessToken);
        return data; // { user, accessToken }
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

/* ------------------------------------------------------------------ *
 * Core request
 * ------------------------------------------------------------------ */

async function rawRequest(path, { method = "GET", body, auth = true, timeoutMs = 15000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    const headers = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const currentToken = getToken();
    if (auth && currentToken) headers.Authorization = `Bearer ${currentToken}`;

    const res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      credentials: "include",
      signal: controller.signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (res.status === 204) return { status: 204, ok: true, data: null };

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    return { status: res.status, ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Perform an API request.
 * @param {string} path  e.g. "/api/movies?page=1"
 * @param {object} opts  { method, body, auth, timeoutMs, signal, _retried }
 * @returns {Promise<any>} parsed JSON (null for 204)
 * @throws {object} normalized error { status, code, message, friendly, details }
 */
export async function apiRequest(path, opts = {}) {
  const { method = "GET", body, auth = true, timeoutMs = 15000, signal, _retried = false } = opts;

  let res;
  try {
    res = await rawRequest(path, { method, body, auth, timeoutMs, signal });
  } catch (err) {
    if (err && err.name === "AbortError") {
      if (signal && signal.aborted)
        throw { status: 0, code: "ABORTED", message: "Request cancelled.", friendly: "Request cancelled." };
      throw { status: 0, code: "TIMEOUT", message: "Request timed out.", friendly: FRIENDLY_MESSAGES.TIMEOUT };
    }
    if (err instanceof TypeError) {
      throw { status: 0, code: "NETWORK", message: "Network failure.", friendly: FRIENDLY_MESSAGES.NETWORK };
    }
    throw err;
  }

  if (res.ok) return res.data;

  const error = normalizeError(res.status, res.data);

  // Expired access token → refresh once and retry the original request.
  if (error.code === "TOKEN_EXPIRED" && auth && !_retried) {
    try {
      await refreshSession();
      return apiRequest(path, { ...opts, _retried: true });
    } catch {
      clearToken();
      if (onUnauthorizedHandler) onUnauthorizedHandler(error);
      throw error;
    }
  }

  // Unrecoverable auth state → clear memory token and notify listeners.
  if ((error.code === "UNAUTHORIZED" || error.code === "REFRESH_REUSED") && auth) {
    clearToken();
    if (onUnauthorizedHandler) onUnauthorizedHandler(error);
  }

  throw error;
}

/* Convenience verbs — all page services must go through these. */
export const api = {
  get: (path, opts) => apiRequest(path, { ...opts, method: "GET" }),
  post: (path, body, opts) => apiRequest(path, { ...opts, method: "POST", body }),
  patch: (path, body, opts) => apiRequest(path, { ...opts, method: "PATCH", body }),
  delete: (path, opts) => apiRequest(path, { ...opts, method: "DELETE" }),
};
