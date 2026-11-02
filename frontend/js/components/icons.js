/**
 * Inline SVG icon set (no external icon library).
 * Usage: icons.ticket({ size: 20, className: "…" }) → SVG string.
 */

const svg = (paths, { size = 20, className = "", filled = false } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="icon ${className}" aria-hidden="true">${paths}</svg>`;

export const icons = {
  film: (o) => svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 3v18M17 3v18M3 8h4M3 16h4M17 8h4M17 16h4"/>', o),
  ticket: (o) => svg('<path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z"/><path d="M13 5v2M13 11v2M13 17v2"/>', o),
  home: (o) => svg('<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-8h6v8"/>', o),
  calendar: (o) => svg('<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>', o),
  clock: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', o),
  search: (o) => svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>', o),
  user: (o) => svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', o),
  users: (o) => svg('<circle cx="9" cy="8" r="4"/><path d="M2 21c1.2-3.5 4-5 7-5s5.8 1.5 7 5"/><path d="M16 3.5a4 4 0 0 1 0 9"/><path d="M18.5 15.5c2 .8 3.2 2.6 3.5 5.5"/>', o),
  logout: (o) => svg('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>', o),
  star: (o) => svg('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>', o),
  check: (o) => svg('<path d="m4 12.5 5 5L20 6.5"/>', o),
  x: (o) => svg('<path d="M6 6l12 12M18 6 6 18"/>', o),
  chevronLeft: (o) => svg('<path d="m14.5 6-6 6 6 6"/>', o),
  chevronRight: (o) => svg('<path d="m9.5 6 6 6-6 6"/>', o),
  chevronDown: (o) => svg('<path d="m6 9.5 6 6 6-6"/>', o),
  plus: (o) => svg('<path d="M12 5v14M5 12h14"/>', o),
  edit: (o) => svg('<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17z"/><path d="m13.5 6.5 3 3"/>', o),
  trash: (o) => svg('<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/><path d="M10 11v6M14 11v6"/>', o),
  eye: (o) => svg('<path d="M2 12s3.5-6.5 10-6.5S22 12 22 12s-3.5 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>', o),
  eyeOff: (o) => svg('<path d="M4 4l16 16"/><path d="M10.6 6.1A9.8 9.8 0 0 1 12 6c6.5 0 10 6 10 6a17.6 17.6 0 0 1-3.2 3.9M6.6 6.8A16.7 16.7 0 0 0 2 12s3.5 6 10 6a9.7 9.7 0 0 0 4.3-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>', o),
  info: (o) => svg('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/>', o),
  alert: (o) => svg('<path d="M12 3 2.5 20h19z"/><path d="M12 9v5M12 17h.01"/>', o),
  card: (o) => svg('<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M7 15h4"/>', o),
  screen: (o) => svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M12 16v4M8 20h8"/>', o),
  seat: (o) => svg('<path d="M6 19v-6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6"/><path d="M6 19h12"/><path d="M8 11V6a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5"/>', o),
  dashboard: (o) => svg('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="5" rx="2"/><rect x="13" y="10" width="8" height="11" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/>', o),
  grid: (o) => svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>', o),
  play: (o) => svg('<path d="M8 5.5v13a1 1 0 0 0 1.54.84l9.4-6.5a1 1 0 0 0 0-1.68l-9.4-6.5A1 1 0 0 0 8 5.5z"/>', o),
  shield: (o) => svg('<path d="M12 3 4.5 6v6c0 4.5 3 7.9 7.5 9 4.5-1.1 7.5-4.5 7.5-9V6z"/><path d="m9 12 2 2 4-4.5"/>', o),
  printer: (o) => svg('<path d="M7 8V4h10v4"/><rect x="4" y="8" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>', o),
  sparkles: (o) => svg('<path d="M12 4l1.5 4.5L18 10l-4.5 1.5L12 16l-1.5-4.5L6 10l4.5-1.5z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>', o),
  armchair: (o) => svg('<path d="M6 11V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v5"/><path d="M4 11a2 2 0 0 1 2 2v2h12v-2a2 2 0 1 1 4 0v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z"/><path d="M7 18v3M17 18v3"/>', o),
};

/** The CineLux logo mark as an inline SVG string. */
export function logoMark(size = 34) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="38" height="38" rx="11" fill="var(--accent)"/>
    <path d="M16.2 12.9c0-1.6 1.75-2.6 3.13-1.77l9.3 5.6c1.32.8 1.32 2.73 0 3.53l-9.3 5.6c-1.38.83-3.13-.17-3.13-1.77V12.9z" fill="#fff"/>
    <circle cx="9.5" cy="15" r="1.6" fill="#fff" opacity=".9"/>
    <circle cx="9.5" cy="25" r="1.6" fill="#fff" opacity=".9"/>
  </svg>`;
}
