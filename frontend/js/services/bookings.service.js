/** Bookings endpoints — all require authentication. */

import { api } from "../core/api.js";

/**
 * POST /api/bookings — create a 10-minute hold.
 * @param {{showtimeId: string, seatIds: string[]}} payload (1–8 seats)
 * @returns {Promise<object>} booking (id, code, status, total, expiresAt, seats…)
 */
export function createBooking(payload) {
  return api.post("/api/bookings", payload).then((d) => d.booking);
}

/**
 * GET /api/bookings — the signed-in customer's bookings.
 * @returns {Promise<{data: any[], page: number, limit: number, total: number}>}
 */
export function listMyBookings(params = {}) {
  const qs = new URLSearchParams();
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 10));
  return api.get(`/api/bookings?${qs.toString()}`);
}

/**
 * GET /api/bookings/:id — owner only; staff/admin may read any booking.
 */
export function getBooking(id) {
  return api.get(`/api/bookings/${encodeURIComponent(id)}`).then((d) => d.booking);
}

/** POST /api/bookings/:id/pay — mock payment that confirms the hold. */
export function payBooking(id) {
  return api.post(`/api/bookings/${encodeURIComponent(id)}/pay`).then((d) => d.booking);
}

/** POST /api/bookings/:id/cancel — releases the seats. */
export function cancelBooking(id) {
  return api.post(`/api/bookings/${encodeURIComponent(id)}/cancel`).then((d) => d.booking);
}
