/**
 * Reusable movie poster card.
 * Handles the poster-fallback and hover zoom; used on home, listing and admin.
 */

import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { formatDuration, formatRating, formatMovieStatus, truncate } from "../utils/formatters.js";
import { escapeHtml } from "../utils/dom.js";
import { icons } from "./icons.js";

export const POSTER_FALLBACK = `
  <div class="poster-fallback" aria-hidden="true">
    ${icons.film({ size: 40, className: "poster-fallback__icon" })}
  </div>`;

/**
 * Build a poster element with graceful fallback when the URL is missing or broken.
 */
export function posterElement(posterUrl, title, className = "movie-card__poster") {
  const wrap = document.createElement("div");
  wrap.className = className;
  if (posterUrl) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = posterUrl;
    img.alt = `${title} poster`;
    img.addEventListener("error", () => {
      img.remove();
      wrap.insertAdjacentHTML("beforeend", POSTER_FALLBACK);
    });
    wrap.append(img);
  } else {
    wrap.insertAdjacentHTML("beforeend", POSTER_FALLBACK);
  }
  return wrap;
}

/**
 * @param {object} movie  a movie record from the API
 * @param {{showStatus?: boolean, delay?: number}} opts
 * @returns {HTMLElement}
 */
export function movieCard(movie, { showStatus = true, delay = 0 } = {}) {
  const card = document.createElement("article");
  card.className = "movie-card";
  card.dataset.reveal = "";
  if (delay) card.dataset.revealDelay = String(delay);

  const statusChip = showStatus
    ? `<span class="status-chip status-chip--${movie.status}">${formatMovieStatus(movie.status)}</span>`
    : "";

  card.innerHTML = `
    <a class="movie-card__link" href="${resolveUrl(`${PAGES.movieDetails}?id=${encodeURIComponent(movie.id)}`)}" aria-label="View details for ${escapeHtml(movie.title)}">
      <div class="movie-card__poster-wrap"></div>
      ${statusChip}
      <div class="movie-card__hover">
        <span class="btn btn--primary btn--sm">View Details</span>
      </div>
    </a>
    <div class="movie-card__body">
      <h3 class="movie-card__title" title="${escapeHtml(movie.title)}">${escapeHtml(movie.title)}</h3>
      <div class="movie-card__meta">
        ${movie.genre ? `<span class="meta-chip">${escapeHtml(movie.genre)}</span>` : ""}
        <span class="meta-chip meta-chip--plain">${icons.clock({ size: 13 })} ${formatDuration(movie.durationMinutes)}</span>
        ${movie.rating ? `<span class="meta-chip meta-chip--plain">${icons.star({ size: 13 })} ${formatRating(movie.rating)}</span>` : ""}
      </div>
      <p class="movie-card__desc">${truncate(movie.description, 96)}</p>
    </div>`;

  const posterWrap = card.querySelector(".movie-card__poster-wrap");
  posterWrap.append(posterElement(movie.posterUrl, movie.title));

  return card;
}

/** Compact row/poster used in admin tables. */
export function posterThumb(movie) {
  const wrap = document.createElement("span");
  wrap.className = "poster-thumb";
  if (movie.posterUrl) {
    const img = document.createElement("img");
    img.src = movie.posterUrl;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.remove();
      wrap.insertAdjacentHTML("beforeend", POSTER_FALLBACK);
    });
    wrap.append(img);
  } else {
    wrap.insertAdjacentHTML("beforeend", POSTER_FALLBACK);
  }
  return wrap;
}
