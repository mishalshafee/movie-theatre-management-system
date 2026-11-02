/**
 * Tiny DOM helpers shared by every page module.
 * Keeps page code free of querySelector noise and inline handlers.
 */

/** querySelector shortcut. */
export const qs = (selector, root = document) => root.querySelector(selector);

/** querySelectorAll shortcut returning a real Array. */
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/**
 * Create an element.
 * @param {string} tag
 * @param {object} [attrs] className, text, html, type, id, dataset, aria, boolean props…
 * @param {Array<Node|string>|Node|string} [children]
 */
export function el(tag, attrs = {}, children = null) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key === "html") node.innerHTML = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (value === true) node.setAttribute(key, "");
    else node.setAttribute(key, value);
  }
  if (children !== null && children !== undefined) {
    (Array.isArray(children) ? children : [children]).forEach((child) => {
      if (child === null || child === undefined) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
  }
  return node;
}

/** Remove every child node. */
export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

/** Debounce helper for search inputs. */
export function debounce(fn, wait = 300) {
  let timer = null;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** Escape HTML for safe interpolation of API strings into innerHTML templates. */
export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}
