/** Movies endpoints. */

import { api } from "../core/api.js";

export const FALLBACK_MOVIES = [
  {
    id: "1",
    title: "Avatar: The Way of Water",
    description:
      "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Na'vi race to protect their home.",
    durationMinutes: 192,
    genre: "Sci-Fi / Adventure",
    rating: "8.8",
    posterUrl: "images/movies/avatar.jpg",
    releaseDate: "2026-03-15",
    status: "now_showing",
  },
  {
    id: "2",
    title: "Dune: Part Three",
    description:
      "The epic conclusion of Paul Atreides' mythic journey as he unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    durationMinutes: 165,
    genre: "Sci-Fi / Action",
    rating: "9.0",
    posterUrl: "images/movies/dune.jpg",
    releaseDate: "2026-04-10",
    status: "now_showing",
  },
  {
    id: "3",
    title: "Redemption",
    description:
      "Every ending has a beginning. When a seasoned operative is pulled back into the shadows of the city, truth becomes the only weapon capable of breaking the cycle of betrayal.",
    durationMinutes: 135,
    genre: "Action / Thriller",
    rating: "8.4",
    posterUrl: "images/movies/redemption.jpg",
    releaseDate: "2026-04-22",
    status: "now_showing",
  },
  {
    id: "4",
    title: "Frozen",
    description:
      "When the newly-crowned Queen Elsa accidentally uses her power to curse her home in infinite winter, her sister Anna teams up with a mountain man, his playful reindeer, and a snowman to change the weather condition.",
    durationMinutes: 102,
    genre: "Animation / Family",
    rating: "8.5",
    posterUrl: "images/movies/frozen.jpg",
    releaseDate: "2026-06-01",
    status: "coming_soon",
  },
];

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
  return api.get(`/api/movies?${qs.toString()}`, { auth: false }).catch((err) => {
    // If backend is unreachable, gracefully fall back to local demo catalog
    if (err.code === "NETWORK" || !err.status) {
      let filtered = FALLBACK_MOVIES;
      if (params.status) filtered = filtered.filter((m) => m.status === params.status);
      return {
        data: filtered,
        page: params.page ?? 1,
        limit: params.limit ?? 12,
        total: filtered.length,
      };
    }
    throw err;
  });
}

/** GET /api/movies/:id → { movie } */
export function getMovie(id) {
  return api.get(`/api/movies/${encodeURIComponent(id)}`, { auth: false })
    .then((d) => d.movie)
    .catch((err) => {
      if (err.code === "NETWORK" || !err.status) {
        const found = FALLBACK_MOVIES.find((m) => String(m.id) === String(id)) || FALLBACK_MOVIES[0];
        return found;
      }
      throw err;
    });
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
