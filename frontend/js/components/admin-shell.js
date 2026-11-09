/**
 * Admin shell: sidebar navigation + topbar + breadcrumbs for the four admin
 * pages. Guards are applied by the page modules themselves; this renders
 * chrome only. Includes the collapsible mobile sidebar with overlay.
 */

import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { icons, logoMark } from "./icons.js";
import { logout } from "../core/auth.js";
import { toast } from "./toast.js";

const NAV = [
  { href: PAGES.adminDashboard, icon: "dashboard", label: "Dashboard", key: "dashboard", crumb: "Dashboard" },
  { href: PAGES.adminMovies, icon: "film", label: "Movie Management", key: "movies", crumb: "Movies" },
  { href: PAGES.adminScreens, icon: "screen", label: "Screen Management", key: "screens", crumb: "Screens" },
  { href: PAGES.adminShowtimes, icon: "calendar", label: "Showtime Management", key: "showtimes", crumb: "Showtimes" },
];

const SUBTITLES = {
  dashboard: "Live overview of your cinema",
  movies: "Create, update and archive films",
  screens: "Auditoriums, rows and seat layouts",
  showtimes: "Schedule screenings and prices",
};

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
  const active = NAV.find((n) => n.key === activeKey);

  if (header) {
    const initials = (user.fullName || user.email || "?").split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
    header.innerHTML = `
      <div class="admin-topbar">
        <button type="button" class="admin-burger" aria-label="Toggle sidebar" aria-expanded="false" data-admin-burger>
          <span></span><span></span><span></span>
        </button>
        <div class="admin-topbar__title">
          <nav class="admin-crumbs" aria-label="Breadcrumb">
            <a href="${resolveUrl(PAGES.adminDashboard)}">Admin</a>
            <span class="admin-crumbs__sep" aria-hidden="true">/</span>
            <span aria-current="page">${active?.crumb ?? "Admin"}</span>
          </nav>
          <h1>${active?.label ?? "Admin"}</h1>
          <p class="admin-topbar__subtitle">${SUBTITLES[activeKey] ?? "Manage your cinema"}</p>
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
              <a class="user-menu__item" role="menuitem" href="${resolveUrl(PAGES.account)}">${icons.user({ size: 16 })}<span>My Account</span></a>
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
        <span class="admin-nav__label">Workspace</span>
        ${NAV.map((item) => `
          <a class="admin-nav__item${item.key === activeKey ? " is-active" : ""}" href="${resolveUrl(item.href)}" ${item.key === activeKey ? 'aria-current="page"' : ""}>
            ${iconFor(item.icon)}<span>${item.label}</span>
          </a>`).join("")}
        <div class="admin-nav__divider" role="separator"></div>
        <span class="admin-nav__label">Cinema</span>
        <a class="admin-nav__item" href="${resolveUrl(PAGES.home)}">${icons.home({ size: 18 })}<span>Back to Website</span></a>
        <a class="admin-nav__item" href="${resolveUrl(PAGES.staffLookup)}">${icons.search({ size: 18 })}<span>Booking Lookup</span></a>
      </nav>
      <div class="admin-sidebar__footer">
        <p>Signed in as<br><strong>${escapeHtml(user.email)}</strong></p>
        <button type="button" class="btn btn--ghost btn--sm btn--block" data-logout>${icons.logout({ size: 15 })} Sign out</button>
      </div>`;
  }

  /* ---- Interactions ---- */

  // Mobile burger + overlay
  const burger = document.querySelector("[data-admin-burger]");
  const sidebarEl = document.getElementById("admin-sidebar");
  let overlay = document.querySelector(".admin-overlay");

  const closeSidebar = () => {
    sidebarEl?.classList.remove("is-open");
    burger?.setAttribute("aria-expanded", "false");
    overlay?.classList.remove("is-visible");
  };

  if (burger && sidebarEl) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "admin-overlay";
      overlay.addEventListener("click", closeSidebar);
      document.body.append(overlay);
    }
    burger.addEventListener("click", () => {
      const open = sidebarEl.classList.toggle("is-open");
      burger.setAttribute("aria-expanded", String(open));
      overlay.classList.toggle("is-visible", open);
    });
    sidebarEl.querySelectorAll("a").forEach((a) => a.addEventListener("click", closeSidebar));
  }

  // User dropdown
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

  // Logout
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await logout();
        toast.success("Signed out. See you soon!");
        setTimeout(() => { window.location.href = resolveUrl(PAGES.login); }, 700);
      } catch {
        button.disabled = false;
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
