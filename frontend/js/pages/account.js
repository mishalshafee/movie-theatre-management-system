/**
 * Account page — read-only profile from the live session.
 * GET /api/auth/me is the only data source (the backend exposes no
 * profile-update endpoint). Shows session/security facts and quick links.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { fetchMe, logout } from "../core/auth.js";
import { toast } from "../components/toast.js";
import { qs, escapeHtml } from "../utils/dom.js";
import { formatDateShort } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

function quickCards(user) {
  const cards = [
    { icon: icons.ticket({ size: 20 }), title: "My Bookings", text: "Every reservation, hold and confirmed ticket in one place.", href: PAGES.myBookings },
    { icon: icons.film({ size: 20 }), title: "Browse Movies", text: "Now showing and coming soon, live from the cinema backend.", href: PAGES.movies },
  ];
  if (user.role === "admin") {
    cards.push({ icon: icons.dashboard({ size: 20 }), title: "Admin Dashboard", text: "Manage movies, screens and showtimes.", href: PAGES.adminDashboard });
  }
  if (user.role === "staff") {
    cards.push({ icon: icons.search({ size: 20 }), title: "Booking Lookup", text: "Find any booking by its ID.", href: PAGES.staffLookup });
  }
  return cards.map((c) => `
    <a class="quick-card" href="${resolveUrl(c.href)}">
      <span class="quick-card__icon">${c.icon}</span>
      <span class="quick-card__title">${c.title}</span>
      <span class="quick-card__text">${c.text}</span>
    </a>`).join("");
}

function securityItems(user) {
  return `
    <div class="security-item">
      ${icons.shield({ size: 18 })}
      <div><strong>Rotating refresh tokens</strong><span>Your session uses single-use refresh tokens with reuse detection, managed by the backend.</span></div>
    </div>
    <div class="security-item">
      ${icons.lock({ size: 18 })}
      <div><strong>Argon2 password hashing</strong><span>Passwords are hashed with Argon2id on the server — they are never stored or displayed.</span></div>
    </div>
    <div class="security-item">
      ${icons.card({ size: 18 })}
      <div><strong>Demo payments only</strong><span>No card numbers, wallet tokens or payment credentials are ever stored by this website.</span></div>
    </div>
    <div class="security-item">
      ${icons.info({ size: 18 })}
      <div><strong>Profile editing</strong><span>The backend does not expose a profile-update endpoint, so account fields are read-only.</span></div>
    </div>`;
}

function renderAccount(user) {
  const host = qs("#account-host");
  const initials = (user.fullName || user.email || "?")
    .split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  host.innerHTML = `
    <aside class="card profile-card card--pad" data-reveal>
      <span class="avatar avatar--lg" aria-hidden="true">${initials}</span>
      <h2 class="profile-card__name">${escapeHtml(user.fullName || "Member")}</h2>
      <span class="role-chip role-chip--${user.role}">${escapeHtml(user.role)}</span>
      <div class="profile-card__rows">
        <div class="profile-row">
          ${icons.mail({ size: 15 })}
          <span class="profile-row__label">Email</span>
          <span class="profile-row__value" title="${escapeHtml(user.email)}">${escapeHtml(user.email)}</span>
        </div>
        <div class="profile-row">
          ${icons.calendar({ size: 15 })}
          <span class="profile-row__label">Member since</span>
          <span class="profile-row__value">${formatDateShort(user.createdAt)}</span>
        </div>
        <div class="profile-row">
          ${icons.user({ size: 15 })}
          <span class="profile-row__label">Account ID</span>
          <span class="profile-row__value mono" title="${escapeHtml(user.id)}">${escapeHtml(String(user.id).slice(0, 13))}…</span>
        </div>
      </div>
      <button type="button" class="btn btn--danger btn--block" id="account-logout">
        ${icons.logout({ size: 15 })} Sign out
      </button>
    </aside>

    <div style="display:grid;gap:1.5rem">
      <section class="card card--pad" data-reveal>
        <div class="card__head" style="padding:0 0 0.9rem;border-bottom:1px solid var(--line);margin-bottom:1.1rem">
          <h2 class="card__title">Quick actions</h2>
        </div>
        <div class="account-quick">${quickCards(user)}</div>
      </section>

      <section class="card card--pad" data-reveal data-reveal-delay="90">
        <div class="card__head" style="padding:0 0 0.9rem;border-bottom:1px solid var(--line);margin-bottom:1.1rem">
          <h2 class="card__title">Session &amp; security</h2>
        </div>
        <div class="security-list">${securityItems(user)}</div>
      </section>
    </div>`;

  qs("#account-logout").addEventListener("click", async () => {
    try {
      await logout();
      toast.success("You have been signed out. See you soon!");
      setTimeout(() => { window.location.href = resolveUrl(PAGES.home); }, 700);
    } catch {
      toast.error("Could not sign out right now. Please try again.");
    }
  });
}

async function main() {
  const { user, ok } = await initPage({ auth: "user" });
  if (!ok || !user) return;

  try {
    // Re-verify against the backend's source of truth.
    const fresh = await fetchMe();
    if (fresh) renderAccount(fresh);
    else renderAccount(user);
  } catch {
    renderAccount(user);
  }
}

main();
