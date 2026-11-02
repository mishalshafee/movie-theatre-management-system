/** Screens endpoints. */

import { api } from "../core/api.js";

/** GET /api/screens → { data: [{id, name, seatCount, …}] } */
export function listScreens() {
  return api.get("/api/screens", { auth: false }).then((d) => d.data);
}

/**
 * GET /api/screens/:id
 * → { screen } with rows: [{ label, seats: [{id, number, type}] }]
 */
export function getScreen(id) {
  return api.get(`/api/screens/${encodeURIComponent(id)}`, { auth: false }).then((d) => d.screen);
}

/** POST /api/screens (admin) */
export function createScreen(payload) {
  return api.post("/api/screens", payload).then((d) => d.screen);
}

/** PATCH /api/screens/:id (admin) — rename only. */
export function renameScreen(id, name) {
  return api.patch(`/api/screens/${encodeURIComponent(id)}`, { name }).then((d) => d.screen);
}

/** DELETE /api/screens/:id (admin) — 409 IN_USE when showtimes reference it. */
export function deleteScreen(id) {
  return api.delete(`/api/screens/${encodeURIComponent(id)}`);
}
