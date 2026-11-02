/**
 * Toast notifications.
 * Animated, stacked, aria-live region. Pure DOM — no libraries.
 *
 * toast.success("Booking confirmed!")
 * toast.error("Something went wrong")
 * toast.info / toast.warning
 */

import { icons } from "./icons.js";

let container = null;

function ensureContainer() {
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    container.setAttribute("role", "status");
    container.setAttribute("aria-live", "polite");
    document.body.append(container);
  }
  return container;
}

const ICONS = {
  success: icons.check({ size: 18 }),
  error: icons.alert({ size: 18 }),
  warning: icons.alert({ size: 18 }),
  info: icons.info({ size: 18 }),
};

const DURATION = { success: 4200, error: 6000, warning: 5200, info: 4200 };

function show(message, type = "info", { title = "", actionLabel = "", onAction = null } = {}) {
  const host = ensureContainer();

  const node = document.createElement("div");
  node.className = `toast toast--${type}`;
  node.innerHTML = `
    <span class="toast__icon">${ICONS[type] || ICONS.info}</span>
    <div class="toast__body">
      ${title ? `<p class="toast__title">${escape(title)}</p>` : ""}
      <p class="toast__message">${escape(message)}</p>
      ${actionLabel ? `<button type="button" class="toast__action link-button">${escape(actionLabel)}</button>` : ""}
    </div>
    <button type="button" class="toast__close" aria-label="Dismiss notification">${icons.x({ size: 15 })}</button>
  `;

  const dismiss = () => {
    if (node.classList.contains("toast--leaving")) return;
    node.classList.add("toast--leaving");
    node.addEventListener("animationend", () => node.remove(), { once: true });
    setTimeout(() => node.remove(), 400); // safety net if animations are disabled
  };

  node.querySelector(".toast__close").addEventListener("click", dismiss);
  const action = node.querySelector(".toast__action");
  if (action) action.addEventListener("click", () => { onAction?.(); dismiss(); });

  host.append(node);
  // Auto-dismiss timer (paused never — keep simple & predictable).
  setTimeout(dismiss, DURATION[type] || 4200);
  return dismiss;
}

function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

export const toast = {
  success: (message, opts) => show(message, "success", opts),
  error: (message, opts) => show(message, "error", opts),
  warning: (message, opts) => show(message, "warning", opts),
  info: (message, opts) => show(message, "info", opts),
};
