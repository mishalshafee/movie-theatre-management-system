/**
 * Account page — profile details from GET /api/auth/me plus shortcuts.
 * The backend offers no profile-update endpoint, so none is presented.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { fetchMe, logout } from "../core/auth.js";
import { setButtonLoading, errorStateHTML } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { toast } from "../components/toast.js";
import { qs, escapeHtml } from "../utils/dom.js";
import { formatDateTime } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

async function main() {
  const { user, ok } = await initPage({ auth: "user" });
  if (!ok || !user) return;

  const host = qs("#account-body");
  try {
    // Always re-verify from the backend rather than trusting the restored copy.
    const me = await fetchMe();
    renderAccount(host, me);
  } catch (error) {
    host.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
  }

  qs("#logout-btn")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    setButtonLoading(button, true, "Signing out…");
    try {
      await logout();
      toast.success("Signed out. See you soon!");
      setTimeout(() => { window.location.href = resolveUrl(PAGES.home); }, 600);
    } catch {
      setButtonLoading(button, false);
      toast.error("Could not sign out right now.");
    }
  });
}

function renderAccount(host, user) {
  const initials = (user.fullName || user.email || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  host.innerHTML = `
    <div class="account-card" data-reveal>
      <div class="account-card__head">
        <span class="avatar avatar--lg" aria-hidden="true">${initials}</span>
        <div>
          <h1 class="account-card__name">${escapeHtml(user.fullName)}</h1>
          <span class="user-menu__role role-chip role-chip--${user.role}">${escapeHtml(user.role)}</span>
        </div>
      </div>
      <dl class="account-details">
        <div class="account-details__row">
          <dt>${icons.user({ size: 16 })} Full name</dt><dd>${escapeHtml(user.fullName)}</dd>
        </div>
        <div class="account-details__row">
          <dt>${icons.ticket({ size: 16 })} Email address</dt><dd>${escapeHtml(user.email)}</dd>
        </div>
        <div class="account-details__row">
          <dt>${icons.shield({ size: 16 })} Account role</dt><dd>${escapeHtml(user.role)}${user.role === "customer" ? " — browse and book tickets" : ""}</dd>
        </div>
        <div class="account-details__row">
          <dt>${icons.calendar({ size: 16 })} Member since</dt><dd>${formatDateTime(user.createdAt)}</dd>
        </div>
      </dl>
      <p class="account-note">${icons.info({ size: 14 })} Profile editing is not available in this version.</p>
    </div>
    <div class="account-actions" data-reveal data-reveal-delay="80">
      ${user.role === "customer" ? `
      <a class="account-action" href="${resolveUrl(PAGES.myBookings)}">
        ${icons.ticket({ size: 22 })}<span><strong>My Bookings</strong><em>View tickets and booking history</em></span>
      </a>` : ""}
      ${user.role === "admin" ? `
      <a class="account-action" href="${resolveUrl(PAGES.adminDashboard)}">
        ${icons.dashboard({ size: 22 })}<span><strong>Admin Dashboard</strong><em>Manage movies, screens and showtimes</em></span>
      </a>` : ""}
      ${user.role === "staff" ? `
      <a class="account-action" href="${resolveUrl(PAGES.staffLookup)}">
        ${icons.search({ size: 22 })}<span><strong>Booking Lookup</strong><em>Find a booking by its reference</em></span>
      </a>` : ""}
      <button type="button" class="account-action account-action--danger" id="logout-btn">
        ${icons.logout({ size: 22 })}<span><strong>Sign out</strong><em>End this session on this device</em></span>
      </button>
    </div>`;
}

main();
