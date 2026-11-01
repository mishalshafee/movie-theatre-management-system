/**
 * Toast notification system (vanilla JS).
 *
 * Usage:
 *   import { toast } from './toast.js';
 *   toast.success('Signed in');
 *   toast.error('Invalid credentials');
 *   toast.info('Welcome');
 */
const ICONS = {
  success:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  error:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
  info:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
};

const CLOSE_ICON =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

let idCounter = 0;
const nextId = () => ++idCounter;

function ensureViewport() {
  let vp = document.querySelector('.toast-container');
  if (!vp) {
    vp = document.createElement('div');
    vp.className = 'toast-container';
    vp.setAttribute('role', 'region');
    vp.setAttribute('aria-live', 'polite');
    document.body.appendChild(vp);
  }
  return vp;
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function push({ type = 'info', title, message, duration = 4200 }) {
  const vp = ensureViewport();
  const id = nextId();
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.setAttribute('role', 'status');
  el.dataset.id = id;

  const icon = ICONS[type] || ICONS.info;
  const labels = {
    success: 'Success',
    error: 'Something went wrong',
    info: 'Notice',
  };

  el.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <div class="toast-body">
      ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
      ${
        message
          ? `<div class="toast-msg">${escapeHtml(message)}</div>`
          : ''
      }
    </div>
    <button type="button" class="toast-close" aria-label="Dismiss notification">${CLOSE_ICON}</button>
  `;

  // entrance animation
  const reduced = prefersReducedMotion();
  el.style.opacity = '0';
  el.style.transform = reduced ? 'translateY(0)' : 'translateX(40px)';
  el.style.transition =
    'opacity 0.28s cubic-bezier(0.22,1,0.36,1), transform 0.28s cubic-bezier(0.22,1,0.36,1)';
  vp.appendChild(el);

  requestAnimationFrame(() => {
    el.style.opacity = '1';
    el.style.transform = 'translateX(0)';
  });

  const remove = () => {
    el.style.opacity = '0';
    el.style.transform = reduced ? 'translateY(0)' : 'translateX(40px)';
    setTimeout(() => el.remove(), 280);
  };

  el.querySelector('.toast-close').addEventListener('click', remove);
  if (duration > 0) {
    setTimeout(remove, duration);
  }
  return id;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const toast = {
  success: (message, title) => push({ type: 'success', title: title || 'Success', message }),
  error: (message, title) => push({ type: 'error', title: title || 'Something went wrong', message }),
  info: (message, title) => push({ type: 'info', title: title || 'Notice', message }),
};

export default toast;
