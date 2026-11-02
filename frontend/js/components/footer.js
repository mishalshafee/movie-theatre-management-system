/**
 * Shared site footer.
 */

import { PAGES, APP_NAME, APP_TAGLINE } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { logoMark } from "./icons.js";

export function renderFooter(container) {
  if (!container) return;
  const year = new Date().getFullYear();
  container.innerHTML = `
    <footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <a class="brand" href="${resolveUrl(PAGES.home)}">${logoMark(32)}<span class="brand__name">Cine<strong>Lux</strong></span></a>
          <p class="footer-tagline">${APP_TAGLINE} — pick your seat, hold it, and enjoy the show.</p>
        </div>
        <div class="footer-col">
          <h4 class="footer-heading">Browse</h4>
          <a href="${resolveUrl(PAGES.home)}">Home</a>
          <a href="${resolveUrl(PAGES.movies)}">All Movies</a>
          <a href="${resolveUrl(PAGES.movies)}?status=now_showing">Now Showing</a>
          <a href="${resolveUrl(PAGES.movies)}?status=coming_soon">Coming Soon</a>
        </div>
        <div class="footer-col">
          <h4 class="footer-heading">Account</h4>
          <a href="${resolveUrl(PAGES.login)}">Sign in</a>
          <a href="${resolveUrl(PAGES.register)}">Create account</a>
          <a href="${resolveUrl(PAGES.myBookings)}">My Bookings</a>
          <a href="${resolveUrl(PAGES.account)}">Account</a>
        </div>
        <div class="footer-col">
          <h4 class="footer-heading">Visit us</h4>
          <span>12 Premiere Avenue</span>
          <span>Colombo 03, Sri Lanka</span>
          <span>Box office opens 10:00 daily</span>
        </div>
      </div>
      <div class="footer-bottom container">
        <span>© ${year} ${APP_NAME} Cinemas. Demo project — all screenings are fictional.</span>
        <span class="footer-note">Demo payment only · No real money is charged</span>
      </div>
    </footer>`;
}
