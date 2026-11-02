/**
 * Pagination control built from the API's { page, limit, total } metadata.
 * Renders « Prev / numbered window / Next » with proper ARIA.
 */

import { icons } from "./icons.js";

function pageWindow(current, totalPages, span = 1) {
  const pages = [];
  const start = Math.max(1, current - span);
  const end = Math.min(totalPages, current + span);
  for (let p = start; p <= end; p++) pages.push(p);
  return pages;
}

/**
 * @param {HTMLElement} container
 * @param {{page:number, limit:number, total:number}} meta
 * @param {(page:number)=>void} onPage
 */
export function renderPagination(container, meta, onPage) {
  if (!container) return;
  const totalPages = Math.max(1, Math.ceil((meta.total || 0) / (meta.limit || 1)));
  if (totalPages <= 1) {
    container.innerHTML = "";
    container.hidden = true;
    return;
  }
  container.hidden = false;

  const btn = (label, page, { disabled = false, active = false, aria = "" } = {}) => `
    <button type="button" class="page-btn${active ? " is-active" : ""}" data-page="${page}"
      ${disabled ? "disabled" : ""} ${aria ? `aria-label="${aria}"` : ""}>${label}</button>`;

  const parts = [];
  parts.push(btn(icons.chevronLeft({ size: 16 }), meta.page - 1, { disabled: meta.page <= 1, aria: "Previous page" }));
  for (const p of pageWindow(meta.page, totalPages)) {
    parts.push(btn(String(p), p, { active: p === meta.page, aria: `Page ${p}` }));
  }
  parts.push(btn(icons.chevronRight({ size: 16 }), meta.page + 1, { disabled: meta.page >= totalPages, aria: "Next page" }));

  container.innerHTML = `
    <nav class="pagination" aria-label="Pagination">
      ${parts.join("")}
      <span class="pagination__info">Page ${meta.page} of ${totalPages} · ${meta.total} item${meta.total === 1 ? "" : "s"}</span>
    </nav>`;

  container.querySelectorAll(".page-btn:not([disabled])").forEach((button) => {
    button.addEventListener("click", () => onPage(Number(button.dataset.page)));
  });
}
