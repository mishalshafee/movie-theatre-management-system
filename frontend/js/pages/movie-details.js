/**
 * Movie details page: full movie info + upcoming showtimes grouped by date.
 * Selecting a showtime continues to seat selection with the real showtime id.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl, navigate, queryParams } from "../core/router-helpers.js";
import { getMovie } from "../services/movies.service.js";
import { listShowtimes } from "../services/showtimes.service.js";
import { posterElement } from "../components/movie-card.js";
import { skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { qs, clear, escapeHtml } from "../utils/dom.js";
import { formatDuration, formatRating, formatMovieStatus } from "../utils/formatters.js";
import { formatTime, formatDateShort, groupByDate } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

async function loadMovie(id) {
  const detail = qs("#movie-detail");
  clear(detail);
  detail.innerHTML = `
    <div class="movie-detail-skeleton">
      <div class="skeleton skeleton--poster-lg"></div>
      <div class="movie-detail-skeleton__body">
        <div class="skeleton skeleton--line w-50"></div>
        <div class="skeleton skeleton--line w-30"></div>
        <div class="skeleton skeleton--block" style="height:90px"></div>
      </div>
    </div>`;

  let movie;
  try {
    movie = await getMovie(id);
  } catch (error) {
    clear(detail);
    detail.innerHTML = errorStateHTML({
      title: error.status === 404 ? "Movie not found" : "Could not load this movie",
      message: friendlyMessage(error),
    });
    detail.querySelector(".js-retry")?.addEventListener("click", () => loadMovie(id));
    return;
  }

  document.title = `${movie.title} · CineLux`;
  detail.innerHTML = `
    <div class="movie-detail">
      <div class="movie-detail__poster" data-reveal>${posterElement(movie.posterUrl, movie.title, "movie-detail__poster-frame").outerHTML}</div>
      <div class="movie-detail__info" data-reveal data-reveal-delay="80">
        <div class="movie-detail__badges">
          <span class="status-chip status-chip--${movie.status}">${formatMovieStatus(movie.status)}</span>
          ${movie.rating ? `<span class="cert-chip">${formatRating(movie.rating)}</span>` : ""}
        </div>
        <h1 class="movie-detail__title">${escapeHtml(movie.title)}</h1>
        <div class="movie-detail__meta">
          ${movie.genre ? `<span class="meta-chip">${escapeHtml(movie.genre)}</span>` : ""}
          <span class="meta-chip meta-chip--plain">${icons.clock({ size: 14 })} ${formatDuration(movie.durationMinutes)}</span>
          ${movie.releaseDate ? `<span class="meta-chip meta-chip--plain">${icons.calendar({ size: 14 })} ${formatDateShort(movie.releaseDate)}</span>` : ""}
        </div>
        <p class="movie-detail__desc">${escapeHtml(movie.description || "Synopsis coming soon.")}</p>
        <div class="movie-detail__actions">
          <a class="btn btn--secondary" href="${resolveUrl(PAGES.movies)}">${icons.chevronLeft({ size: 15 })} All movies</a>
          <a class="btn btn--primary" href="#showtimes">${icons.ticket({ size: 16 })} See showtimes</a>
        </div>
      </div>
    </div>`;
}

async function loadShowtimes(movieId) {
  const host = qs("#showtimes-body");
  clear(host);
  host.innerHTML = `<div class="skeleton-chips" aria-hidden="true">${'<div class="skeleton skeleton--chip"></div>'.repeat(12)}</div>`;

  try {
    const { data, total } = await listShowtimes({ movieId, page: 1, limit: 100 });
    clear(host);

    if (!data.length) {
      host.innerHTML = emptyStateHTML({
        icon: "calendar",
        title: total === 0 ? "No upcoming showtimes" : "No more upcoming showtimes",
        message: "This movie has no scheduled screenings ahead. Check back soon or browse other films.",
        actionLabel: "Browse other movies",
        actionHref: PAGES.movies,
      });
      return;
    }

    const groups = groupByDate(data);
    host.innerHTML = groups.map((group, gi) => `
      <section class="showtime-date-group" data-reveal data-reveal-delay="${Math.min(gi * 60, 300)}">
        <h3 class="showtime-date-group__label">
          ${icons.calendar({ size: 16 })}
          <span>${group.label}</span>
          <span class="showtime-date-group__count">${group.items.length} screening${group.items.length === 1 ? "" : "s"}</span>
        </h3>
        <div class="showtime-list">
          ${group.items.map((st) => `
            <button type="button" class="showtime-card" data-showtime="${st.id}">
              <span class="showtime-card__time">${formatTime(st.startsAt)}</span>
              <span class="showtime-card__screen">${icons.screen({ size: 14 })} ${escapeHtml(st.screen.name)}</span>
              <span class="showtime-card__prices">
                <span class="price-tag" title="Standard seat price">Std ${escapeHtml(String(st.priceStandard))}</span>
                <span class="price-tag price-tag--premium" title="Premium seat price">Prem ${escapeHtml(String(st.pricePremium))}</span>
              </span>
              <span class="showtime-card__cta">Select seats ${icons.chevronRight({ size: 14 })}</span>
            </button>`).join("")}
        </div>
      </section>`).join("");

    host.querySelectorAll(".showtime-card").forEach((card) => {
      card.addEventListener("click", () => {
        navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(card.dataset.showtime)}`);
      });
    });
  } catch (error) {
    clear(host);
    host.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    host.querySelector(".js-retry")?.addEventListener("click", () => loadShowtimes(movieId));
  }
}

async function main() {
  await initPage({ auth: "any" });
  const { id } = queryParams({ id: "string" });

  const shell = qs("#movie-page");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    qs("#movie-detail").innerHTML = errorStateHTML({
      title: "Movie not found",
      message: "The link is missing a valid movie reference.",
      retryLabel: "Back to all movies",
      retry: false,
    });
    qs("#showtimes-body").innerHTML = "";
    return;
  }

  await loadMovie(id);
  loadShowtimes(id);
}

main();
