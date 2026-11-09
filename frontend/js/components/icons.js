/**
 * CineLux — Inline SVG icon set (no external icon library).
 * Usage: icons.ticket({ size: 20, className: "…" }) → SVG string.
 *
 * Includes payment brand marks (simplified, trademark-respectful
 * representations used for DEMO payment selection only):
 *   icons.pay.visa / mastercard / amex / paypal / googlePay / applePay / cash
 */

const svg = (paths, { size = 20, className = "", filled = false, viewBox = "0 0 24 24" } = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${viewBox}" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" class="icon ${className}" aria-hidden="true">${paths}</svg>`;

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
  chevronUp: (o) => svg('<path d="m6 14.5 6-6 6 6"/>', o),
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
  sound: (o) => svg('<path d="M4 10v4h3l5 4V6l-5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>', o),
  projector: (o) => svg('<rect x="2.5" y="6" width="19" height="12" rx="3"/><circle cx="8" cy="12" r="2.6"/><path d="M14 10h4M14 14h5.5"/>', o),
  smartphone: (o) => svg('<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>', o),
  wallet: (o) => svg('<path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M16 12h2"/><path d="M3 9h16"/>', o),
  banknote: (o) => svg('<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v0M18 14.5v0"/>', o),
  lock: (o) => svg('<rect x="5" y="10.5" width="14" height="9.5" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><path d="M12 14.5v2"/>', o),
  tag: (o) => svg('<path d="M3 11V4h7l11 11-7 7z"/><circle cx="7.5" cy="8.5" r="1.4"/>', o),
  bookmark: (o) => svg('<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4.5L5 21V4a1 1 0 0 1 1-1z"/>', o),
  mail: (o) => svg('<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7.5 8 5.5 8-5.5"/>', o),
  external: (o) => svg('<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>', o),
  refresh: (o) => svg('<path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3"/><path d="M20 4v4h-4M4 20v-4h4"/>', o),
  download: (o) => svg('<path d="M12 3v12"/><path d="m7 11 5 5 5-5"/><path d="M4 20h16"/>', o),
  trendUp: (o) => svg('<path d="m3 17 6-6 4 4 7-7"/><path d="M14 8h6v6"/>', o),
  pin: (o) => svg('<path d="M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>', o),
  bolt: (o) => svg('<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>', o),
  filmReel: (o) => svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="7" r="1.6"/><circle cx="12" cy="17" r="1.6"/><circle cx="7" cy="12" r="1.6"/><circle cx="17" cy="12" r="1.6"/><path d="M12 12h.01"/>', o),
  subtract: (o) => svg('<path d="M5 12h14"/>', o),
};

/* ------------------------------------------------------------------ *
 * Payment brand marks — simplified SVG representations for the DEMO
 * payment selector. Decorative only; no official logo files are used.
 * ------------------------------------------------------------------ */

const paySvg = (inner, { width = 54, height = 24 } = {}, vb = "0 0 64 28") =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${vb}" class="icon pay-logo" aria-hidden="true" role="img">${inner}</svg>`;

/* Visa wordmark */
const visaMark = (o = {}) => paySvg(
  `<text x="32" y="20" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="700" font-style="italic" fill="#3B6FD4" letter-spacing="1">VISA</text>`,
  { width: 46, height: 18 }, "0 0 64 28",
);

/* Mastercard — two overlapping circles */
const mastercardMark = (o = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${(o.width ?? 42)}" height="${(o.height ?? 26)}" viewBox="0 0 64 40" class="icon pay-logo" aria-hidden="true" role="img">
    <circle cx="26" cy="20" r="14" fill="#EB001B"/>
    <circle cx="38" cy="20" r="14" fill="#F79E1B" fill-opacity="0.92"/>
    <path d="M32 8.6a14 14 0 0 0 0 22.8 14 14 0 0 0 0-22.8z" fill="#FF5F00"/>
  </svg>`;

/* American Express */
const amexMark = (o = {}) => paySvg(
  `<rect x="2" y="4" width="60" height="20" rx="3" fill="#2E77BC"/>
   <text x="32" y="17.5" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9.5" font-weight="800" fill="#fff" letter-spacing="0.5">AMEX</text>`,
  { width: 44, height: 18 }, "0 0 64 28",
);

/* PayPal — double-P monogram */
const paypalMark = (o = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${(o.width ?? 44)}" height="${(o.height ?? 26)}" viewBox="0 0 64 40" class="icon pay-logo" aria-hidden="true" role="img">
    <path d="M25.5 6h11.8c6.6 0 9.4 3.3 8.5 8.9-.9 5.9-5 9.1-11.4 9.1h-3.9l-1.5 9.4a1.4 1.4 0 0 1-1.4 1.2h-4.3a.9.9 0 0 1-.9-1.05l4.4-26.6A1.4 1.4 0 0 1 25.5 6z" fill="#2790C3"/>
    <path d="M23.2 12h11.8c4.4 0 6 2.2 5.4 6-.7 4-3.4 6.1-7.7 6.1h-2.6l-1 6.3a.95.95 0 0 1-.95.8h-2.9a.6.6 0 0 1-.6-.7l3-18a.95.95 0 0 1 .95-.8z" fill="#27346A" transform="translate(3.5 6.5) scale(0.72)" opacity="0"/>
    <text x="30" y="26" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="800" fill="#2790C3" letter-spacing="0.5">Pay</text>
    <text x="46" y="26" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="12.5" font-weight="800" fill="#27346A" letter-spacing="0.5">Pal</text>
  </svg>`;

/* Google Pay — 4-color G + "Pay" */
const googleG = (x = 8, y = 8, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.2-2.2H12v4.2h6.6c-.1 1.1-.9 2.8-2.5 3.9l-.02.15 3.6 2.8.25.03c2.3-2.1 3.6-5.2 3.6-8.9z"/>
    <path fill="#34A853" d="M12 24c2.9 0 5.4-1 7.2-2.6l-3.4-2.7c-.9.6-2.2 1.1-3.8 1.1-2.9 0-5.4-1.9-6.3-4.6l-.13.01-3.5 2.7-.05.13C3.8 21.3 7.6 24 12 24z"/>
    <path fill="#FBBC05" d="M5.7 15.2c-.2-.7-.4-1.5-.4-2.2s.1-1.5.4-2.2l-.01-.15-3.5-2.7-.11.05C1.3 9.3.8 10.6.8 13s.5 3.7 1.3 5.2l3.6-2.9z"/>
    <path fill="#EA4335" d="M12 5.4c2 0 3.4.9 4.2 1.6l3.1-3C17.4 2.2 14.9 1 12 1 7.6 1 3.8 3.7 2.1 7.8l3.6 2.8c.9-2.7 3.4-5.2 6.3-5.2z"/>
  </g>`;

const googlePayMark = (o = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${(o.width ?? 62)}" height="${(o.height ?? 26)}" viewBox="0 0 96 32" class="icon pay-logo" aria-hidden="true" role="img">
    ${googleG(4, 4, 1)}
    <text x="36" y="22.5" font-family="Inter, Arial, sans-serif" font-size="16" font-weight="600" fill="#E8EAED">Pay</text>
  </svg>`;

/* Apple Pay — apple silhouette + "Pay" (simplified glyph) */
const appleGlyph = (x = 6, y = 6, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})" fill="#FFFFFF">
    <path d="M14.4 8.6c-.8.6-1.9 1-3 1-.4-1.5.3-3 1-3.9.8-.9 2-1.5 3-1.6.1 1.4-.4 2.8-1 3.9-.4.6-.7.9-1 .6zM17.6 17.7c-.6 1.3-1.6 2.9-2.9 2.9-1.1 0-1.5-.7-2.8-.7-1.3 0-1.7.7-2.8.7-1.3 0-2.2-1.5-2.8-2.8-1.6-2.9-1.4-6.9 1.4-8.1 1.3-.6 2.6-.1 3.4.6.8-.7 2.1-1.2 3.4-.6 1.5.7 2.1 2.3 2.1 4-.9.5-1.5 1.4-1.5 2.4 0 1.1.7 2 1.6 2.5-.3.7-.7 1.4-1.1 1.9z"/>
  </g>`;

const applePayMark = (o = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${(o.width ?? 64)}" height="${(o.height ?? 26)}" viewBox="0 0 100 32" class="icon pay-logo" aria-hidden="true" role="img">
    ${appleGlyph(4, 5, 0.9)}
    <text x="30" y="23" font-family="Inter, Arial, sans-serif" font-size="17" font-weight="600" fill="#FFFFFF">Pay</text>
  </svg>`;

/* Cash at counter */
const cashMark = (o = {}) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${(o.width ?? 40)}" height="${(o.height ?? 26)}" viewBox="0 0 40 26" class="icon pay-logo" aria-hidden="true" role="img">
    <rect x="1" y="3" width="38" height="20" rx="3.5" fill="none" stroke="#D6B36A" stroke-width="2"/>
    <circle cx="20" cy="13" r="5.5" fill="none" stroke="#D6B36A" stroke-width="2"/>
    <circle cx="20" cy="13" r="2" fill="#D6B36A"/>
    <path d="M6 8v0M34 18v0" stroke="#D6B36A" stroke-width="2.4" stroke-linecap="round"/>
  </svg>`;

/** Payment brand marks (DEMO only). */
icons.pay = {
  visa: visaMark,
  mastercard: mastercardMark,
  amex: amexMark,
  paypal: paypalMark,
  googlePay: googlePayMark,
  applePay: applePayMark,
  cash: cashMark,
};

/** Card chip + contactless icons for the demo card visual. */
export const cardChip = () =>
  `<svg width="44" height="32" viewBox="0 0 44 32" aria-hidden="true"><rect width="44" height="32" rx="7" fill="#D6B36A"/><path d="M15 0v10M29 0v10M15 22v10M29 22v10M0 16h13M31 16h13" stroke="#A8873F" stroke-width="1.6"/><rect x="13" y="10" width="18" height="12" rx="3" fill="none" stroke="#A8873F" stroke-width="1.4"/></svg>`;

export const contactlessIcon = ({ size = 22 } = {}) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true" class="icon">
    <path d="M7 8a7.5 7.5 0 0 1 0 8"/><path d="M10.5 6a11 11 0 0 1 0 12"/><path d="M14 4a14.5 14.5 0 0 1 0 16"/>
  </svg>`;

/** The CineLux logo mark as an inline SVG string. */
export function logoMark(size = 34) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect x="1" y="1" width="38" height="38" rx="11" fill="url(#clx-gold)"/>
    <defs>
      <linearGradient id="clx-gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#E7C983"/><stop offset="0.55" stop-color="#D6B36A"/><stop offset="1" stop-color="#B89450"/>
      </linearGradient>
    </defs>
    <path d="M16.2 12.9c0-1.6 1.75-2.6 3.13-1.77l9.3 5.6c1.32.8 1.32 2.73 0 3.53l-9.3 5.6c-1.38.83-3.13-.17-3.13-1.77V12.9z" fill="#221A07"/>
    <circle cx="9.5" cy="15" r="1.6" fill="#221A07" opacity="0.85"/>
    <circle cx="9.5" cy="25" r="1.6" fill="#221A07" opacity="0.85"/>
  </svg>`;
}

/** App logo lockup (mark + wordmark) used in headers/footers. */
export function logoLockup(size = 34) {
  return `${logoMark(size)}<span class="brand__name">Cine<strong>Lux</strong></span>`;
}
