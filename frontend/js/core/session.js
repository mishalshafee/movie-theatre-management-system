/**
 * Page boot orchestration.
 *
 * Every HTML page runs a tiny module that calls initPage() first:
 *   1. restore the session (POST /api/auth/refresh, cookie-based)
 *   2. render shared navbar/footer
 *   3. apply route guards
 *   4. start scroll-reveal + ripple observers
 * then hands control to the page-specific module.
 */

import { restoreSession } from "./auth.js";
import { guardPage } from "./guards.js";
import { renderNavbar } from "../components/navbar.js";
import { renderFooter } from "../components/footer.js";
import { initRevealOnScroll } from "../components/reveal.js";

/**
 * @param {object} opts
 *   auth:  "any" (default) | "guest" (login/register) | "user" | "admin" | "staff"
 *   chrome: render navbar + footer (default true; admin pages use their own shell)
 * @returns {Promise<{user: object|null}>} resolves only when the page may render
 */
export async function initPage(opts = {}) {
  const { auth = "any", chrome = true } = opts;

  // 1. Session restoration — a normal guest state when no refresh cookie exists.
  const user = await restoreSession();

  // 2. Shared chrome.
  if (chrome) {
    const header = document.getElementById("site-header");
    if (header) renderNavbar(header, user);
    const footer = document.getElementById("site-footer");
    if (footer) renderFooter(footer);
  }

  // 3. Guards (may navigate away — the returned promise keeps running but
  //    page modules stop when ok === false).
  const guard = guardPage(user, { auth, guestOnly: auth === "guest" });

  // 4. Scroll reveal for static sections.
  initRevealOnScroll();

  return { user: guard.ok ? user : null, ok: guard.ok };
}
