/**
 * Date & time helpers.
 *
 * The backend speaks ISO-8601 timestamps with timezone. We always render
 * them in the user's local timezone with Intl, and never manipulate the
 * underlying value.
 */

const dateFmt = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
const shortDateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" });
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export function toDate(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "Wed, Nov 4 2026" */
export function formatDate(value) {
  const d = toDate(value);
  return d ? dateFmt.format(d) : "—";
}

/** "Nov 4, 2026" */
export function formatDateShort(value) {
  const d = toDate(value);
  return d ? shortDateFmt.format(d) : "—";
}

/** "Wednesday, November 4" (group heading for showtimes) */
export function formatWeekdayLong(value) {
  const d = toDate(value);
  return d ? weekdayFmt.format(d) : "—";
}

/** "7:00 PM" in the user's local timezone. */
export function formatTime(value) {
  const d = toDate(value);
  return d ? timeFmt.format(d) : "—";
}

/** "Nov 4, 2026, 7:00 PM" */
export function formatDateTime(value) {
  const d = toDate(value);
  return d ? dateTimeFmt.format(d) : "—";
}

/**
 * Group items by their local calendar date.
 * @returns {Array<{key: string, label: string, dateLabel: string, items: any[]}>}
 *   ordered by date ascending.
 */
export function groupByDate(items, pick = (item) => item.startsAt) {
  const map = new Map();
  for (const item of items) {
    const d = toDate(pick(item));
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, { key, label: formatWeekdayLong(d), dateLabel: formatDate(d), items: [] });
    map.get(key).items.push(item);
  }
  return [...map.values()];
}

/** Is this timestamp in the past? */
export function isPast(value) {
  const d = toDate(value);
  return !!d && d.getTime() <= Date.now();
}

/**
 * Countdown seconds until the timestamp (never negative).
 * Used for the 10-minute seat-hold countdown on checkout — always computed
 * from the backend's actual `expiresAt`, never from "now + 10 minutes".
 */
export function secondsUntil(value) {
  const d = toDate(value);
  if (!d) return 0;
  return Math.max(0, Math.floor((d.getTime() - Date.now()) / 1000));
}

/** mm:ss for the hold countdown. */
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

/**
 * Combine <input type=date> + <input type=time> into an ISO string with
 * timezone offset (e.g. 2026-11-04T19:00:00+05:30 → stored as UTC by backend).
 * Returns null when either part is missing.
 */
export function isoFromDateTimeInputs(dateValue, timeValue) {
  if (!dateValue || !timeValue) return null;
  const d = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/** Today's date as YYYY-MM-DD (for input[type=date] min attributes). */
export function todayInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
