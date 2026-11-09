/**
 * CineLux shared site footer — premium dark footer with gold accents.
 */

import { PAGES, APP_NAME, APP_TAGLINE } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { logoMark } from "./icons.js";
import { icons } from "./icons.js";

export function renderFooter(container) {
  if (!container) return;
  const year = new Date().getFullYear();
  container.innerHTML = `
    <footer class="site-footer">
      <div class="container container--wide footer-grid">
        <div class="footer-brand">
          <a class="brand" href="${resolveUrl(PAGES.home)}">${logoMark(34)}<span class="brand__name">Cine<strong>Lux</strong></span></a>
          <p class="footer-tagline">${APP_TAGLINE} — pick your seat, hold it for ten minutes, and enjoy the show.</p>
          <span class="meta-chip meta-chip--gold">${icons.shield({ size: 13 })} Demo payment only · No real charges</span>
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
          <a href="${resolveUrl(PAGES.account)}">My Account</a>
        </div>
        <div class="footer-col">
          <h4 class="footer-heading">Visit us</h4>
          <span>12 Premiere Avenue</span>
          <span>Colombo 03, Sri Lanka</span>
          <span>Box office opens 10:00 daily</span>
          <span class="footer-col__hours">${icons.clock({ size: 13 })} Screenings until late</span>
        </div>
      </div>
      <div class="footer-bottom container container--wide">
        <span>© ${year} ${APP_NAME} Cinemas · University demo project — all screenings are fictional.</span>
        <span class="footer-note">DEMO PAYMENT MODE · No real money is charged or collected</span>
      </div>
    </footer>`;
}
