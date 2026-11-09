/**
 * CineLux site navbar — premium dark chrome.
 * Renders from the restored auth state, re-renders after login/logout.
 * Includes: scroll condensation, expanding search, animated mobile drawer.
 */

import { PAGES, APP_NAME } from "../config.js";
import { icons, logoMark } from "./icons.js";
import { resolveUrl } from "../core/router-helpers.js";
import { logout } from "../core/auth.js";
import { toast } from "./toast.js";

function linksFor(user) {
  const links = [
    { href: PAGES.home, label: "Home" },
    { href: PAGES.movies, label: "Movies" },
    { href: `${PAGES.movies}?status=now_showing`, label: "Now Showing" },
    { href: `${PAGES.movies}?status=coming_soon`, label: "Coming Soon" },
  ];
  if (user && user.role === "customer") {
    links.push({ href: PAGES.myBookings, label: "My Bookings" });
  }
  if (user && user.role === "admin") {
    links.push({ href: PAGES.adminDashboard, label: "Admin" });
  }
  if (user && user.role === "staff") {
    links.push({ href: PAGES.staffLookup, label: "Booking Lookup" });
  }
  return links;
}

function isActive(href) {
  const target = resolveUrl(href);
  const [targetPath, targetQuery] = target.split("?");
  if (!location.pathname.endsWith(targetPath.split("/").pop())) return false;
  if (targetQuery) {
    const wanted = new URLSearchParams(targetQuery);
    const actual = new URLSearchParams(location.search);
    for (const [key, value] of wanted) {
      if (actual.get(key) !== value) return false;
    }
  } else if (targetPath.endsWith("movies.html") && location.search) {
    const status = new URLSearchParams(location.search).get("status");
    if (status) return false;
  }
  return true;
}

function userMenuHTML(user) {
  const initials = (user.fullName || user.email || "?")
    .split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const items = [];
  if (user.role === "admin") {
    items.push({ href: PAGES.adminDashboard, label: "Admin Dashboard", icon: icons.dashboard({ size: 16 }) });
  }
  if (user.role === "customer") {
    items.push({ href: PAGES.myBookings, label: "My Bookings", icon: icons.ticket({ size: 16 }) });
  }
  if (user.role === "staff") {
    items.push({ href: PAGES.staffLookup, label: "Booking Lookup", icon: icons.search({ size: 16 }) });
  }
  items.push({ href: PAGES.account, label: "My Account", icon: icons.user({ size: 16 }) });

  return `
    <div class="user-menu" data-user-menu>
      <button type="button" class="user-menu__trigger" aria-haspopup="true" aria-expanded="false" data-user-trigger>
        <span class="avatar" aria-hidden="true">${initials}</span>
        <span class="user-menu__name">${escapeHtml(user.fullName || user.email)}</span>
        ${icons.chevronDown({ size: 14, className: "user-menu__caret" })}
      </button>
      <div class="user-menu__panel" role="menu" hidden>
        <div class="user-menu__meta">
          <span class="user-menu__role role-chip role-chip--${user.role}">${escapeHtml(user.role)}</span>
          <span class="user-menu__email">${escapeHtml(user.email)}</span>
        </div>
        ${items.map((item) => `
          <a class="user-menu__item" role="menuitem" href="${resolveUrl(item.href)}">
            ${item.icon}<span>${item.label}</span>
          </a>`).join("")}
        <button type="button" class="user-menu__item user-menu__item--danger" role="menuitem" data-logout>
          ${icons.logout({ size: 16 })}<span>Sign out</span>
        </button>
      </div>
    </div>`;
}

function navHTML(user) {
  const links = linksFor(user)
    .map((link) => `<a class="nav-link${isActive(link.href) ? " is-active" : ""}" href="${resolveUrl(link.href)}">${link.label}</a>`)
    .join("");

  const authArea = user
    ? userMenuHTML(user)
    : `
      <div class="nav-auth">
        <a class="btn btn--ghost btn--sm" href="${resolveUrl(PAGES.login)}">Sign in</a>
        <a class="btn btn--primary btn--sm" href="${resolveUrl(PAGES.register)}">Get Started</a>
      </div>`;

  return `
    <div class="navbar container container--wide">
      <a class="brand" href="${resolveUrl(PAGES.home)}" aria-label="${APP_NAME} home">
        ${logoMark(36)}<span class="brand__name">Cine<strong>Lux</strong></span>
      </a>
      <nav class="nav-links" aria-label="Main navigation">${links}</nav>
      <div class="nav-actions">
        <div class="nav-search" data-nav-search>
          <form class="nav-search__form" role="search" action="${resolveUrl(PAGES.movies)}" method="get">
            <input class="nav-search__input" type="search" name="q" placeholder="Search movies…" aria-label="Search movies" autocomplete="off">
            <button class="nav-search__submit" type="submit" aria-label="Search">${icons.search({ size: 15 })}</button>
          </form>
          <button type="button" class="nav-search__toggle" aria-label="Open search" aria-expanded="false" data-search-toggle>
            ${icons.search({ size: 19 })}
          </button>
        </div>
        ${authArea}
        <button type="button" class="hamburger" aria-label="Open menu" aria-expanded="false" data-nav-toggle>
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
    <div class="mobile-drawer" data-mobile-drawer hidden>
      <nav class="mobile-drawer__links" aria-label="Mobile navigation">
        ${linksFor(user).map((link) => `
          <a class="mobile-drawer__link${isActive(link.href) ? " is-active" : ""}" href="${resolveUrl(link.href)}">
            ${link.label}${icons.chevronRight({ size: 16 })}
          </a>`).join("")}
        ${user
          ? `<a class="mobile-drawer__link" href="${resolveUrl(PAGES.account)}">My Account${icons.chevronRight({ size: 16 })}</a>
             <button type="button" class="mobile-drawer__link mobile-drawer__link--danger" data-logout>Sign out</button>`
          : `<a class="mobile-drawer__link" href="${resolveUrl(PAGES.login)}">Sign in</a>
             <a class="mobile-drawer__link mobile-drawer__link--accent" href="${resolveUrl(PAGES.register)}">Create free account</a>`}
      </nav>
    </div>`;
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

/**
 * Render the navbar into a container.
 * @param {HTMLElement} container
 * @param {object|null} user
 */
export function renderNavbar(container, user) {
  container.innerHTML = `<header class="site-header" data-site-header>${navHTML(user)}</header>`;
  wireNavbar(container, user);
}

function wireNavbar(container, user) {
  const header = container.querySelector("[data-site-header]");

  // Condensed header on scroll
  const onScroll = () => header?.classList.toggle("is-scrolled", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Expanding search
  const searchWrap = container.querySelector("[data-nav-search]");
  const searchToggle = container.querySelector("[data-search-toggle]");
  const searchInput = container.querySelector(".nav-search__input");
  searchToggle?.addEventListener("click", () => {
    const open = searchWrap.classList.toggle("is-open");
    searchToggle.setAttribute("aria-expanded", String(open));
    searchToggle.setAttribute("aria-label", open ? "Close search" : "Open search");
    if (open) setTimeout(() => searchInput?.focus(), 180);
    else if (searchInput) searchInput.value = "";
  });
  document.addEventListener("click", (event) => {
    if (!searchWrap?.classList.contains("is-open")) return;
    if (!event.target.closest("[data-nav-search]")) {
      searchWrap.classList.remove("is-open");
      searchToggle?.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && searchWrap?.classList.contains("is-open")) {
      searchWrap.classList.remove("is-open");
      searchToggle?.focus?.();
    }
  });

  // Mobile drawer
  const toggle = container.querySelector("[data-nav-toggle]");
  const drawer = container.querySelector("[data-mobile-drawer]");
  toggle?.addEventListener("click", () => {
    const open = drawer.hidden;
    drawer.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.classList.toggle("is-open", open);
    if (open) drawer.animate?.(
      [{ opacity: 0, transform: "translateY(-8px)" }, { opacity: 1, transform: "none" }],
      { duration: 220, easing: "cubic-bezier(0.16,1,0.3,1)" },
    );
  });
  drawer?.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => {
      drawer.hidden = true;
      toggle?.classList.remove("is-open");
    })
  );

  // User dropdown
  const trigger = container.querySelector("[data-user-trigger]");
  const panel = container.querySelector(".user-menu__panel");
  trigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    const open = panel.hidden;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (!panel || panel.hidden) return;
    if (!event.target.closest("[data-user-menu]")) {
      panel.hidden = true;
      trigger?.setAttribute("aria-expanded", "false");
    }
  });

  // Logout (desktop menu + mobile drawer)
  container.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.disabled = true;
      try {
        await logout();
        toast.success("You have been signed out. See you soon!");
        setTimeout(() => { window.location.href = resolveUrl(PAGES.home); }, 700);
      } catch {
        button.disabled = false;
        toast.error("Could not sign out right now. Please try again.");
      }
    });
  });
}

/** Re-render in place (used after login state changes without navigation). */
export function updateNavbar(container, user) {
  renderNavbar(container, user);
}
