/**
 * CineLux reusable movie poster card.
 * Poster fallback + hover zoom + direct "Book Tickets" / "View Details" action.
 * Used on home, listings, and admin thumbs.
 */

import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { formatDuration, formatRating, formatMovieStatus, truncate } from "../utils/formatters.js";
import { escapeHtml } from "../utils/dom.js";
import { icons } from "./icons.js";

export const POSTER_FALLBACK = `
  <div class="poster-fallback" aria-hidden="true">
    ${icons.filmReel({ size: 40, className: "poster-fallback__icon" })}
  </div>`;

/** Map legacy or missing URLs to our high-res posters */
export function resolvePosterUrl(posterUrl) {
  if (!posterUrl) return "images/movies/avatar.jpg";
  if (posterUrl.includes("movie-1")) return "images/movies/avatar.jpg";
  if (posterUrl.includes("movie-2")) return "images/movies/dune.jpg";
  if (posterUrl.includes("movie-3")) return "images/movies/redemption.jpg";
  if (posterUrl.includes("movie-4")) return "images/movies/frozen.jpg";
  if (posterUrl.includes("movie-5")) return "images/movies/avatar.jpg";
  if (posterUrl.includes("movie-6")) return "images/movies/dune.jpg";
  return posterUrl;
}

/**
 * Build a poster element with graceful fallback when the URL is missing or broken.
 */
export function posterElement(posterUrl, title, className = "movie-card__poster") {
  const resolved = resolvePosterUrl(posterUrl);
  const wrap = document.createElement("div");
  wrap.className = className;
  if (resolved) {
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.src = resolved;
    img.alt = `${title || "Movie"} poster`;
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
 * @param {{showStatus?: boolean, delay?: number, bookable?: boolean}} opts
 * @returns {HTMLElement}
 */
export function movieCard(movie, { showStatus = true, delay = 0, bookable = false } = {}) {
  const card = document.createElement("article");
  card.className = "movie-card";
  card.dataset.reveal = "";
  if (delay) card.dataset.revealDelay = String(delay);

  const statusChip = showStatus && movie.status
    ? `<span class="status-chip status-chip--${movie.status}">${formatMovieStatus(movie.status)}</span>`
    : "";

  const ratingBadge = movie.rating
    ? `<span class="movie-card__rating-badge" title="Rating: ${formatRating(movie.rating)}">${icons.star({ size: 12 })} ${formatRating(movie.rating)}</span>`
    : "";

  const isBookable = bookable && movie.status === "now_showing";
  const hoverCTA = isBookable
    ? `<span class="btn btn--primary btn--sm">${icons.ticket({ size: 14 })} Book Tickets</span>`
    : `<span class="btn btn--secondary btn--sm">View Details</span>`;

  const detailsUrl = resolveUrl(`${PAGES.movieDetails}?id=${encodeURIComponent(movie.id)}`);

  const footerBtn = movie.status === "now_showing"
    ? `<a href="${detailsUrl}" class="btn btn--primary btn--sm">${icons.ticket({ size: 14 })} Book Tickets</a>`
    : `<a href="${detailsUrl}" class="btn btn--secondary btn--sm">View Details</a>`;

  card.innerHTML = `
    <a class="movie-card__link" href="${detailsUrl}" aria-label="View details for ${escapeHtml(movie.title)}">
      <div class="movie-card__poster-wrap"></div>
      ${statusChip}
      ${ratingBadge}
      <div class="movie-card__hover">
        ${hoverCTA}
        <div class="movie-card__hover-meta">
          <span>${escapeHtml(movie.genre || "Cinema")}</span>
          <span>${formatDuration(movie.durationMinutes)}</span>
        </div>
      </div>
    </a>
    <div class="movie-card__body">
      <h3 class="movie-card__title" title="${escapeHtml(movie.title)}">
        <a href="${detailsUrl}">${escapeHtml(movie.title)}</a>
      </h3>
      <div class="movie-card__meta">
        ${movie.genre ? `<span class="meta-chip meta-chip--gold">${escapeHtml(movie.genre)}</span>` : ""}
        <span class="meta-chip meta-chip--plain">${icons.clock({ size: 13 })} ${formatDuration(movie.durationMinutes)}</span>
      </div>
      <p class="movie-card__desc">${truncate(movie.description, 96)}</p>
      <div class="movie-card__footer">
        ${footerBtn}
      </div>
    </div>`;

  const posterWrap = card.querySelector(".movie-card__poster-wrap");
  posterWrap.append(posterElement(movie.posterUrl, movie.title));

  return card;
}

/** Compact row/poster used in admin tables. */
export function posterThumb(movie) {
  const wrap = document.createElement("span");
  wrap.className = "poster-thumb";
  const resolved = resolvePosterUrl(movie.posterUrl);
  if (resolved) {
    const img = document.createElement("img");
    img.src = resolved;
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
