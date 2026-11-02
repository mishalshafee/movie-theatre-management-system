/**
 * Client-side route guards.
 *
 * IMPORTANT: these checks only improve UX. The backend remains the
 * authority for authorization — every admin API call is independently
 * protected server-side with role middleware.
 */

import { navigate, safeNext, currentPath } from "./router-helpers.js";
import { PAGES } from "../config.js";

/** Send the visitor to the login page, remembering where they were heading. */
export function redirectToLogin() {
  const next = encodeURIComponent(currentPath());
  navigate(`${PAGES.login}?next=${next}`);
}

/**
 * Guard the current page.
 * @param {object|null} user       restored session user
 * @param {object} opts            { auth: "guest"|"any"|"customer"|"staff"|"admin",
 *                                   guestOnly: boolean }
 * @returns {{ ok: boolean, user: object|null }} false when navigation happened
 */
export function guardPage(user, opts = {}) {
  const { auth = "any", guestOnly = false } = opts;

  // Pages meant only for guests (login/register): bounce signed-in users home.
  if (guestOnly && user) {
    navigate(homeForRole(user));
    return { ok: false, user };
  }

  if (auth === "guest" || auth === "any") return { ok: true, user };

  if (!user) {
    redirectToLogin();
    return { ok: false, user: null };
  }

  const required = auth === "user"
    ? ["customer", "staff", "admin"]           // "user" = any authenticated role
    : Array.isArray(auth)
      ? auth
      : [auth];
  const roleOk = required.includes(user.role) ||
    (required.includes("staff") && user.role === "admin") || // admins may use staff pages
    (required.includes("customer") && ["customer", "staff", "admin"].includes(user.role));

  if (!roleOk) {
    navigate(forbiddenFor(user));
    return { ok: false, user };
  }

  return { ok: true, user };
}

/** Where a role lands after login / when hitting the site root. */
export function homeForRole(user) {
  if (!user) return PAGES.home;
  if (user.role === "admin") return PAGES.adminDashboard;
  if (user.role === "staff") return PAGES.staffLookup;
  return safeNext(null, PAGES.home);
}

/**
 * Where to send a user who lacks access.
 * Customers opening admin pages land on an explanatory screen.
 */
export function forbiddenFor(user) {
  if (!user) return `${PAGES.login}`;
  return `${PAGES.home}?denied=1`;
}
