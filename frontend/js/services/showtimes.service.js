/** Showtimes endpoints. */

import { api } from "../core/api.js";

/**
 * GET /api/showtimes
 * The backend always returns upcoming showtimes only (starts_at >= now),
 * unless an explicit `from` is supplied.
 * @param {{movieId?, screenId?, from?, to?, page?, limit?}} params
 */
export function listShowtimes(params = {}) {
  const qs = new URLSearchParams();
  if (params.movieId) qs.set("movieId", params.movieId);
  if (params.screenId) qs.set("screenId", params.screenId);
  if (params.from) qs.set("from", params.from);
  if (params.to) qs.set("to", params.to);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 20));
  return api.get(`/api/showtimes?${qs.toString()}`, { auth: false });
}

/** GET /api/showtimes/:id → { showtime } (nested movie + screen) */
export function getShowtime(id) {
  return api.get(`/api/showtimes/${encodeURIComponent(id)}`, { auth: false }).then((d) => d.showtime);
}

/**
 * GET /api/showtimes/:id/seats
 * → { showtime, rows: [{ label, seats: [{id, number, type, price, status}] }] }
 * statuses: available | held | sold
 */
export function getSeatMap(id) {
  return api.get(`/api/showtimes/${encodeURIComponent(id)}/seats`, { auth: false });
}

/** POST /api/showtimes (admin). endsAt is computed by the backend. */
export function createShowtime(payload) {
  return api.post("/api/showtimes", payload).then((d) => d.showtime);
}

/** PATCH /api/showtimes/:id (admin) — prices only. */
export function updateShowtimePrices(id, { priceStandard, pricePremium }) {
  const body = {};
  if (priceStandard !== undefined) body.priceStandard = priceStandard;
  if (pricePremium !== undefined) body.pricePremium = pricePremium;
  return api.patch(`/api/showtimes/${encodeURIComponent(id)}`, body).then((d) => d.showtime);
}

/** DELETE /api/showtimes/:id (admin). */
export function deleteShowtime(id) {
  return api.delete(`/api/showtimes/${encodeURIComponent(id)}`);
}
