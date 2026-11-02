/**
 * Admin shell: sidebar navigation + topbar for the four admin pages.
 * Guards are applied by the page modules themselves; this only renders chrome.
 */

import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { icons, logoMark } from "../components/icons.js";
import { logout } from "../core/auth.js";
import { toast } from "../components/toast.js";

const NAV = [
  { href: PAGES.adminDashboard, icon: "dashboard", label: "Dashboard", key: "dashboard" },
  { href: PAGES.adminMovies, icon: "film", label: "Movies", key: "movies" },
  { href: PAGES.adminScreens, icon: "screen", label: "Screens", key: "screens" },
  { href: PAGES.adminShowtimes, icon: "calendar", label: "Showtimes", key: "showtimes" },
];

function iconFor(name, size = 18) {
  return icons[name] ? icons[name]({ size }) : icons.dashboard({ size });
}

/**
 * @param {object} user       signed-in admin
 * @param {string} activeKey  which nav item is active
 */
export function renderAdminShell(user, activeKey) {
  const header = document.getElementById("admin-header");
  const sidebar = document.getElementById("admin-sidebar");

  if (header) {
    const initials = (user.fullName || user.email || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    header.innerHTML = `
      <div class="admin-topbar">
        <button type="button" class="admin-burger" aria-label="Toggle sidebar" aria-expanded="false" data-admin-burger>
          <span></span><span></span><span></span>
        </button>
        <div class="admin-topbar__title">
          <h1>${NAV.find((n) => n.key === activeKey)?.label ?? "Admin"}</h1>
          <p class="admin-topbar__subtitle">Manage your cinema catalog and schedule</p>
        </div>
        <div class="admin-topbar__right">
          <a class="btn btn--ghost btn--sm" href="${resolveUrl(PAGES.home)}">${icons.home({ size: 15 })} View site</a>
          <div class="user-menu" data-user-menu>
            <button type="button" class="user-menu__trigger" aria-haspopup="true" aria-expanded="false" data-user-trigger>
              <span class="avatar avatar--sm" aria-hidden="true">${initials}</span>
              <span class="user-menu__name">${escapeHtml(user.fullName || user.email)}</span>
              ${icons.chevronDown({ size: 14 })}
            </button>
            <div class="user-menu__panel user-menu__panel--right" role="menu" hidden>
              <div class="user-menu__meta">
                <span class="user-menu__role role-chip role-chip--admin">admin</span>
                <span class="user-menu__email">${escapeHtml(user.email)}</span>
              </div>
              <a class="user-menu__item" role="menuitem" href="${resolveUrl(PAGES.account)}">${icons.user({ size: 16 })}<span>Account</span></a>
              <button type="button" class="user-menu__item user-menu__item--danger" role="menuitem" data-logout>
                ${icons.logout({ size: 16 })}<span>Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </div>`;
  }

  if (sidebar) {
    sidebar.innerHTML = `
      <div class="admin-brand">
        ${logoMark(32)}<span class="brand__name">Cine<strong>Lux</strong></span>
        <span class="admin-brand__chip">Admin</span>
      </div>
      <nav class="admin-nav" aria-label="Admin navigation">
        ${NAV.map((item) => `
          <a class="admin-nav__item${item.key === activeKey ? " is-active" : ""}" href="${resolveUrl(item.href)}">
            ${iconFor(item.icon)}<span>${item.label}</span>
          </a>`).join("")}
        <div class="admin-nav__divider" role="separator"></div>
        <a class="admin-nav__item" href="${resolveUrl(PAGES.home)}">${icons.home({ size: 18 })}<span>Back to site</span></a>
        <a class="admin-nav__item" href="${resolveUrl(PAGES.staffLookup)}">${icons.search({ size: 18 })}<span>Booking lookup</span></a>
      </nav>
      <div class="admin-sidebar__footer">
        <p>Signed in as<br><strong>${escapeHtml(user.email)}</strong></p>
        <button type="button" class="btn btn--ghost btn--sm btn--block" data-logout>${icons.logout({ size: 15 })} Sign out</button>
      </div>`;
  }

  // Wire interactions
  const burger = document.querySelector("[data-admin-burger]");
  const sidebarEl = document.getElementById("admin-sidebar");
  burger?.addEventListener("click", () => {
    const open = sidebarEl.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", String(open));
  });

  const trigger = document.querySelector("[data-user-trigger]");
  const panel = document.querySelector(".user-menu__panel");
  trigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (!panel || panel.hidden) return;
    if (!event.target.closest("[data-user-menu]")) panel.hidden = true;
  });

  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        await logout();
        toast.success("Signed out. See you soon!");
        setTimeout(() => { window.location.href = resolveUrl(PAGES.login); }, 700);
      } catch {
        toast.error("Could not sign out right now.");
      }
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}
