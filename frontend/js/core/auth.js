/**
 * Authentication state.
 *
 * Security & session model:
 *  - access token & user stored in memory + tab-sessionStorage for reliable multi-page navigation
 *  - backend refresh cookie rotates on refresh
 *  - automatic session restoration on page loads with /api/auth/me verification
 */

import { api, refreshSession, setToken, clearToken, getToken } from "./api.js";

let currentUser = null;
try {
  const saved = sessionStorage.getItem("cinelux_user");
  if (saved) currentUser = JSON.parse(saved);
} catch {}

/** Currently signed-in user object or null (guest). */
export function getUser() {
  if (!currentUser) {
    try {
      const saved = sessionStorage.getItem("cinelux_user");
      if (saved) currentUser = JSON.parse(saved);
    } catch {}
  }
  return currentUser;
}

export function setUser(user) {
  currentUser = user || null;
  try {
    if (user) sessionStorage.setItem("cinelux_user", JSON.stringify(user));
    else sessionStorage.removeItem("cinelux_user");
  } catch {}
}

export function isAuthed() {
  return !!getUser();
}

export function hasRole(...roles) {
  const u = getUser();
  return !!u && roles.includes(u.role);
}

/**
 * Restore a session. Safe to call on every page load.
 * Tries refresh cookie first, and falls back to tab token verification with /api/auth/me.
 * @returns {Promise<object|null>} the user, or null for guests
 */
export async function restoreSession() {
  // 1. Try refresh cookie
  try {
    const data = await refreshSession(); // { user, accessToken }
    setUser(data.user);
    setToken(data.accessToken);
    return data.user;
  } catch {
    // 2. If cookie refresh was unavailable (e.g. localhost cross-port restriction), verify existing tab session
    const token = getToken();
    const existing = getUser();
    if (token && existing) {
      try {
        const meData = await api.get("/api/auth/me");
        if (meData?.user) {
          setUser(meData.user);
          return meData.user;
        }
      } catch {
        clearToken();
        setUser(null);
        return null;
      }
    }

    setUser(null);
    return null;
  }
}

/**
 * Sign in. Stores the access token + user in memory and sessionStorage.
 * The refresh cookie is set by the backend.
 */
export async function login(email, password) {
  const data = await api.post("/api/auth/login", { email, password }, { auth: false });
  setToken(data.accessToken);
  setUser(data.user);
  return data.user;
}

/** Create an account. The backend does NOT auto-login: returns the new user. */
export function register(payload) {
  return api.post("/api/auth/register", payload, { auth: false });
}

/** Sign out and drop state. */
export async function logout() {
  try {
    await api.post("/api/auth/logout", undefined, { auth: false });
  } finally {
    clearToken();
    setUser(null);
  }
}

/** Fetch the signed-in user's profile from the backend. */
export function fetchMe() {
  return api.get("/api/auth/me").then((data) => {
    if (data?.user) setUser(data.user);
    return data?.user;
  });
}
