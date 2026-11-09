/** Showtimes endpoints. */

import { api } from "../core/api.js";

function mockShowtimes(movieId) {
  const now = new Date();
  const d1 = new Date(now.getTime() + 2 * 3600 * 1000);
  const d2 = new Date(now.getTime() + 5 * 3600 * 1000);
  const d3 = new Date(now.getTime() + 26 * 3600 * 1000);
  return [
    {
      id: "st-1",
      movieId: movieId || "1",
      screenId: "1",
      startsAt: d1.toISOString(),
      endsAt: new Date(d1.getTime() + 2.5 * 3600 * 1000).toISOString(),
      priceStandard: "12.00",
      pricePremium: "16.00",
      screen: { id: "1", name: "Screen 1 - Grand Dolby" },
    },
    {
      id: "st-2",
      movieId: movieId || "1",
      screenId: "2",
      startsAt: d2.toISOString(),
      endsAt: new Date(d2.getTime() + 2.5 * 3600 * 1000).toISOString(),
      priceStandard: "12.00",
      pricePremium: "16.00",
      screen: { id: "2", name: "Screen 2 - Atmos Lounge" },
    },
    {
      id: "st-3",
      movieId: movieId || "1",
      screenId: "1",
      startsAt: d3.toISOString(),
      endsAt: new Date(d3.getTime() + 2.5 * 3600 * 1000).toISOString(),
      priceStandard: "12.00",
      pricePremium: "16.00",
      screen: { id: "1", name: "Screen 1 - Grand Dolby" },
    },
  ];
}

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
  return api.get(`/api/showtimes?${qs.toString()}`, { auth: false }).catch((err) => {
    if (err.code === "NETWORK" || !err.status) {
      const items = mockShowtimes(params.movieId);
      return { data: items, total: items.length, page: 1, limit: 20 };
    }
    throw err;
  });
}

/** GET /api/showtimes/:id → { showtime } (nested movie + screen) */
export function getShowtime(id) {
  return api.get(`/api/showtimes/${encodeURIComponent(id)}`, { auth: false })
    .then((d) => d.showtime)
    .catch((err) => {
      if (err.code === "NETWORK" || !err.status) {
        return mockShowtimes()[0];
      }
      throw err;
    });
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
