/** Movies endpoints. */

import { api } from "../core/api.js";

/**
 * GET /api/movies
 * @param {{status?: string, page?: number, limit?: number}} params
 * @returns {Promise<{data: any[], page: number, limit: number, total: number}>}
 */
export function listMovies(params = {}) {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 12));
  return api.get(`/api/movies?${qs.toString()}`, { auth: false });
}

/** GET /api/movies/:id → { movie } */
export function getMovie(id) {
  return api.get(`/api/movies/${encodeURIComponent(id)}`, { auth: false }).then((d) => d.movie);
}

/** POST /api/movies (admin) */
export function createMovie(payload) {
  return api.post("/api/movies", payload).then((d) => d.movie);
}

/** PATCH /api/movies/:id (admin) */
export function updateMovie(id, payload) {
  return api.patch(`/api/movies/${encodeURIComponent(id)}`, payload).then((d) => d.movie);
}

/** DELETE /api/movies/:id (admin) — 204 on success, 409 IN_USE when referenced. */
export function deleteMovie(id) {
  return api.delete(`/api/movies/${encodeURIComponent(id)}`);
}
