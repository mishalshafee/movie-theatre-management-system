/**
 * Shared form validation + API error helpers (pure JS).
 *
 * Validation rules mirror the backend contract:
 *  - fullName: 1–100 characters
 *  - email:    valid email format
 *  - password: 8–128 characters
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required.';
  if (!EMAIL_RE.test(email.trim())) return 'Please enter a valid email address.';
  return '';
}

export function validatePassword(password) {
  if (!password) return 'Password is required.';
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (password.length > 128) return 'Password must be no more than 128 characters.';
  return '';
}

export function validateFullName(fullName) {
  const v = (fullName || '').trim();
  if (!v) return 'Full name is required.';
  if (v.length > 100) return 'Full name must be 100 characters or fewer.';
  return '';
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return 'Please confirm your password.';
  if (password !== confirm) return 'Passwords do not match.';
  return '';
}

/** Rough password strength estimate (0–4) — UX hint only. */
export function passwordStrength(password) {
  if (!password) return { score: 0, label: '' };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score, label: labels[score] };
}

/**
 * Convert a fetch/API error into a human-readable message.
 * Handles network errors, validation arrays, and plain message fields.
 *
 * `err` is either a native Error (with optional .status and .data from api.js)
 * or a plain object.
 */
export function extractApiError(err, fallback = 'Something went wrong. Please try again.') {
  // Network / no response (server down, CORS, timeout)
  if (!err || (err instanceof Error && !err.status && !err.data)) {
    if (err?.name === 'AbortError') return 'The request took too long. Please try again.';
    return 'Unable to reach the server. Please check your connection and try again.';
  }

  const status = err.status;
  const payload = err.data || {};

  if (Array.isArray(payload.errors) && payload.errors.length) {
    const msgs = payload.errors.map((e) => e?.msg || e?.message).filter(Boolean);
    if (msgs.length) return msgs.join(' ');
  }
  if (payload.errors && typeof payload.errors === 'object') {
    const msgs = Object.values(payload.errors).filter(Boolean);
    if (msgs.length) return msgs.join(' ');
  }
  if (typeof payload.message === 'string' && payload.message) return payload.message;
  if (typeof payload.error === 'string' && payload.error) return payload.error;

  if (status === 401) return 'Invalid email or password.';
  if (status === 403) return 'You do not have permission to do that.';
  if (status === 404) return 'The requested resource was not found.';
  if (status === 409) return 'An account with this email already exists.';
  if (status >= 500) return 'The server had a problem. Please try again shortly.';

  return fallback;
}
