/**
 * Global authentication state — a tiny pub/sub module that replaces
 * React Context. The navbar (and any other UI) subscribes to changes.
 *
 *  - user       : the authenticated user object, or null (guest).
 *  - status     : 'loading' | 'authenticated' | 'guest'.
 *  - login()    : calls the backend; on success stores user + token.
 *  - register() : creates an account (does NOT auto-login).
 *  - logout()   : clears token + cookie, returns to guest.
 *
 * On first import we try to restore a session via the refresh cookie.
 * If there is no valid session we stay a guest silently.
 */
import { apiJSON, apiRequest, refreshAccessToken, clearAccessToken } from './api.js';

let state = {
  user: null,
  status: 'loading', // loading | authenticated | guest
};

const listeners = new Set();

function setState(next) {
  state = { ...state, ...next };
  listeners.forEach((fn) => fn(state));
}

export function getAuthState() {
  return state;
}

export function subscribe(fn) {
  listeners.add(fn);
  fn(state); // push current state immediately
  return () => listeners.delete(fn);
}

/* ----------------------------------------------------------------
   Auth actions
   ---------------------------------------------------------------- */

/** Login with email + password. Returns the user. Throws on failure. */
export async function login({ email, password }) {
  const data = await apiJSON('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  const { user, accessToken } = data || {};
  // api.js reads the token from the response? No — login returns accessToken
  // in the body, so we must set it here.
  if (accessToken) {
    // import setAccessToken lazily to avoid cycle
    const { setAccessToken } = await import('./api.js');
    setAccessToken(accessToken);
  }
  setState({ user, status: 'authenticated' });
  return user;
}

/** Register a new customer account. Does NOT auto-login. Returns the user. */
export async function register({ fullName, email, password }) {
  const data = await apiJSON('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ fullName, email, password }),
  });
  return data?.user || data;
}

/** Logout: clear cookie + in-memory token, return to guest. */
export async function logout() {
  try {
    await apiRequest('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    // Even if the network call fails, drop the local token so the UI logs out.
    console.warn('Logout request failed, clearing local session anyway.', err);
  } finally {
    clearAccessToken();
    setState({ user: null, status: 'guest' });
  }
}

/* ----------------------------------------------------------------
   Session restore on startup (silent)
   ---------------------------------------------------------------- */
export async function restoreSession() {
  try {
    const token = await refreshAccessToken();
    if (!token) {
      setState({ user: null, status: 'guest' });
      return null;
    }
    const data = await apiJSON('/api/auth/me');
    const user = data?.user || data || null;
    setState({ user, status: 'authenticated' });
    return user;
  } catch (err) {
    // Expected when there is no refresh cookie. Swallow silently.
    clearAccessToken();
    setState({ user: null, status: 'guest' });
    return null;
  }
}

// Kick off the silent restore as soon as this module loads.
restoreSession();
