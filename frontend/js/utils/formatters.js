/**
 * Formatting helpers: money, durations, statuses, text.
 */

import { CURRENCY } from "../config.js";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: CURRENCY });

/** 12.5 → "$12.50" */
export function formatMoney(value) {
  const n = Number(value);
  return Number.isFinite(n) ? money.format(n) : "—";
}

/** 128 → "2h 8m" */
export function formatDuration(minutes) {
  const m = Number(minutes);
  if (!Number.isFinite(m) || m <= 0) return "—";
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}m`;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

export const MOVIE_STATUS_LABELS = {
  now_showing: "Now Showing",
  coming_soon: "Coming Soon",
  archived: "Archived",
};

export function formatMovieStatus(status) {
  return MOVIE_STATUS_LABELS[status] || status || "—";
}

export const BOOKING_STATUS_LABELS = {
  held: "Held",
  confirmed: "Confirmed",
  used: "Used",
  cancelled: "Cancelled",
  expired: "Expired",
};

export function formatBookingStatus(status) {
  return BOOKING_STATUS_LABELS[status] || status || "—";
}

/** "A1, A2, B5" from seat objects. */
export function formatSeats(seats = []) {
  if (!seats.length) return "—";
  return seats.map((s) => `${s.row}${s.number}`).join(", ");
}

/** Seat summary like "A1, A2 +3 more". */
export function formatSeatsShort(seats = [], max = 4) {
  if (!seats.length) return "—";
  const labels = seats.slice(0, max).map((s) => `${s.row}${s.number}`);
  const rest = seats.length - labels.length;
  return rest > 0 ? `${labels.join(", ")} +${rest} more` : labels.join(", ");
}

/** Truncate long text with an ellipsis. */
export function truncate(text, max = 160) {
  const v = String(text ?? "");
  return v.length > max ? `${v.slice(0, max).trimEnd()}…` : v;
}

/** "PG-13" or "—" */
export function formatRating(rating) {
  const v = String(rating ?? "").trim();
  return v || "—";
}
