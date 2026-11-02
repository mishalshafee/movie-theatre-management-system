/**
 * Loading states: shimmer skeletons, inline spinners, button busy state.
 */

/** Wrap a section while it loads: skeleton blocks matching the final layout. */
export function skeletonHTML(kind = "cards", count = 4) {
  if (kind === "cards") {
    return `<div class="skeleton-grid">${Array.from({ length: count }, () => `
      <div class="skeleton-card" aria-hidden="true">
        <div class="skeleton skeleton--poster"></div>
        <div class="skeleton skeleton--line w-70"></div>
        <div class="skeleton skeleton--line w-45"></div>
      </div>`).join("")}</div>`;
  }
  if (kind === "rows") {
    return `<div class="skeleton-rows">${Array.from({ length: count }, () => `
      <div class="skeleton-row" aria-hidden="true">
        <div class="skeleton skeleton--thumb"></div>
        <div class="skeleton skeleton--line w-40"></div>
        <div class="skeleton skeleton--line w-25"></div>
        <div class="skeleton skeleton--line w-15"></div>
      </div>`).join("")}</div>`;
  }
  if (kind === "seatmap") {
    return `<div class="skeleton-seatmap" aria-hidden="true">
      ${Array.from({ length: 6 }, () => `<div class="skeleton-seat-row">${Array.from({ length: 12 }, () => '<div class="skeleton skeleton--seat"></div>').join("")}</div>`).join("")}
    </div>`;
  }
  return `<div class="skeleton skeleton--block" aria-hidden="true" style="height:180px"></div>`;
}

/** Inline spinner (decorative). */
export function spinnerHTML(label = "") {
  return `<span class="spinner" aria-hidden="true"></span>${label ? `<span class="spinner-label">${label}</span>` : ""}`;
}

/** Set a button to its loading state and back. */
export function setButtonLoading(button, loading, busyLabel = "Working…") {
  if (!button) return;
  if (loading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.classList.add("is-loading");
    button.innerHTML = `${spinnerHTML(busyLabel)}`;
  } else {
    button.disabled = false;
    button.classList.remove("is-loading");
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

/** Full-area error state with optional retry. */
export function errorStateHTML({ title = "Something went wrong", message = "", retryLabel = "Try again", retry = true } = {}) {
  return `
    <div class="empty-state empty-state--error">
      <div class="empty-state__icon" aria-hidden="true">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/></svg>
      </div>
      <h3 class="empty-state__title">${title}</h3>
      ${message ? `<p class="empty-state__text">${message}</p>` : ""}
      ${retry ? `<button type="button" class="btn btn--secondary js-retry">${retryLabel}</button>` : ""}
    </div>`;
}

/** Empty-state block (no data / no results). */
export function emptyStateHTML({ icon = "film", title = "Nothing here yet", message = "", actionLabel = "", actionHref = "" } = {}) {
  return `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">${iconSvg(icon)}</div>
      <h3 class="empty-state__title">${title}</h3>
      ${message ? `<p class="empty-state__text">${message}</p>` : ""}
      ${actionLabel && actionHref ? `<a class="btn btn--primary" href="${actionHref}">${actionLabel}</a>` : ""}
    </div>`;
}

function iconSvg(name) {
  const paths = {
    film: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>',
    ticket: '<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z"/><path d="M13 5v2M13 11v2M13 17v2"/>',
    seat: '<path d="M6 19v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6"/><path d="M6 19h12"/><path d="M8 11V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  };
  return `<svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.film}</svg>`;
}
