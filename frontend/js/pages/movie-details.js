/**
 * Movie details page.
 * Poster + facts from GET /api/movies/:id, then upcoming showtimes from
 * GET /api/showtimes?movieId=… — grouped by local calendar date.
 * "Select Showtime" carries the real backend showtime ID to the
 * seat-selection page.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl, navigate, queryParams } from "../core/router-helpers.js";
import { getMovie } from "../services/movies.service.js";
import { listShowtimes } from "../services/showtimes.service.js";
import { posterElement } from "../components/movie-card.js";
import { skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { refreshReveal, initRevealOnScroll } from "../components/reveal.js";
import { friendlyMessage } from "../core/api.js";
import { toast } from "../components/toast.js";
import { qs, clear, escapeHtml } from "../utils/dom.js";
import { formatDuration, formatRating, formatMovieStatus } from "../utils/formatters.js";
import { formatDate, formatTime, formatWeekdayLong, groupByDate } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const state = { movie: null };

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------ */

function movieHTML(movie) {
  const facts = [
    ["Genre", movie.genre || "—"],
    ["Duration", formatDuration(movie.durationMinutes)],
    ["Rating", movie.rating ? `${formatRating(movie.rating)} / audience score` : "Not yet rated"],
    ["Release date", movie.releaseDate ? formatDate(`${movie.releaseDate}T00:00:00`) : "To be announced"],
    ["Status", formatMovieStatus(movie.status)],
  ];

  return `
    <div class="movie-details__backdrop" aria-hidden="true"></div>
    <div class="container container--wide movie-details__inner">
      <div class="movie-details__poster" data-reveal>
        <div class="movie-details__poster-frame" id="details-poster"></div>
      </div>
      <div class="movie-details__main">
        <nav class="breadcrumbs" aria-label="Breadcrumb">
          <a href="${resolveUrl(PAGES.home)}">Home</a>
          <span class="breadcrumbs__sep" aria-hidden="true">/</span>
          <a href="${resolveUrl(PAGES.movies)}">Movies</a>
          <span class="breadcrumbs__sep" aria-hidden="true">/</span>
          <span aria-current="page">${escapeHtml(movie.title)}</span>
        </nav>
        <span class="status-chip status-chip--${movie.status}">${formatMovieStatus(movie.status)}</span>
        <h1 class="movie-details__title" data-reveal>${escapeHtml(movie.title)}</h1>
        <div class="movie-details__meta" data-reveal data-reveal-delay="80">
          ${movie.genre ? `<span class="meta-chip">${icons.film({ size: 13 })} ${escapeHtml(movie.genre)}</span>` : ""}
          <span class="meta-chip">${icons.clock({ size: 13 })} ${formatDuration(movie.durationMinutes)}</span>
          ${movie.rating ? `<span class="meta-chip meta-chip--gold">${icons.star({ size: 13 })} ${formatRating(movie.rating)}</span>` : ""}
          ${movie.releaseDate ? `<span class="meta-chip">${icons.calendar({ size: 13 })} ${formatDate(`${movie.releaseDate}T00:00:00`)}</span>` : ""}
        </div>
        <p class="movie-details__synopsis" data-reveal data-reveal-delay="140">${escapeHtml(movie.description || "Synopsis coming soon.")}</p>
        <dl class="movie-details__facts" data-reveal data-reveal-delay="200">
          ${facts.map(([label, value]) => `
            <div class="fact-card"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
        <div id="showtimes-section"></div>
      </div>
    </div>`;
}

function showtimesSectionHTML(groups) {
  return `
    <div class="rule-gold" data-reveal><span class="rule-gold__gem" aria-hidden="true"></span></div>
    <header class="section-head" data-reveal>
      <div>
        <p class="section-eyebrow">Live schedule</p>
        <h2 class="section-title">Showtimes</h2>
      </div>
      <span class="section-count">${groups.reduce((n, g) => n + g.items.length, 0)} screening${groups.reduce((n, g) => n + g.items.length, 0) === 1 ? "" : "s"}</span>
    </header>
    <div class="showtimes-legend" data-reveal>
      <span class="meta-chip">${icons.info({ size: 13 })} Times shown in your local timezone</span>
      <span class="meta-chip meta-chip--gold">${icons.sparkles({ size: 13 })} Seats held 10 minutes at checkout</span>
    </div>
    <div class="showtime-groups" id="showtime-groups"></div>`;
}

function showtimeCard(st) {
  return `
    <article class="showtime-card" data-reveal>
      <div class="showtime-card__time">${icons.clock({ size: 17 })} ${formatTime(st.startsAt)}</div>
      <div class="showtime-card__meta">
        <div class="showtime-card__meta-row">${icons.screen({ size: 14 })} ${escapeHtml(st.screen.name)}</div>
        <div class="showtime-card__meta-row">${icons.calendar({ size: 14 })} ${formatDate(st.startsAt)}</div>
      </div>
      <div class="showtime-card__prices">
        <span class="price-tag price-tag--standard"><em>Standard</em> $${Number(st.priceStandard).toFixed(2)}</span>
        <span class="price-tag price-tag--premium"><em>Premium</em> $${Number(st.pricePremium).toFixed(2)}</span>
      </div>
      <button type="button" class="btn btn--primary btn--sm" data-select-showtime="${st.id}">
        ${icons.ticket({ size: 15 })} Select Showtime
      </button>
    </article>`;
}

/* ------------------------------------------------------------------ */

async function loadShowtimes(movie) {
  const host = qs("#showtimes-section");
  if (!host) return;
  host.innerHTML = `<div class="section-head" style="margin-top:1rem"><p class="section-eyebrow">Live schedule</p><h2 class="section-title">Showtimes</h2></div>
    <div style="max-width:640px">${skeletonHTML("rows", 3)}</div>`;

  try {
    const { data, total } = await listShowtimes({ movieId: movie.id, page: 1, limit: 100 });
    const upcoming = data.filter((st) => new Date(st.startsAt).getTime() > Date.now());

    if (!upcoming.length) {
      host.innerHTML = emptyStateHTML({
        icon: "calendar",
        title: "No upcoming showtimes yet",
        message: movie.status === "now_showing"
          ? "This film is listed as now showing, but no future screenings are scheduled yet. Check back soon."
          : "This film has not been scheduled yet — it is still listed as coming soon.",
        actionLabel: "Browse other movies",
        actionHref: `${PAGES.movies}?status=now_showing`,
      });
      return;
    }

    const groups = groupByDate(upcoming);
    host.innerHTML = showtimesSectionHTML(groups);

    const groupsHost = qs("#showtime-groups");
    groups.forEach((group) => {
      const groupEl = document.createElement("div");
      groupEl.className = "showtime-group";
      groupEl.innerHTML = `
        <div class="showtime-group__head" data-reveal>
          <h3 class="showtime-group__date">${group.label}</h3>
          <span class="showtime-group__sub">${group.items.length} screening${group.items.length === 1 ? "" : "s"}</span>
        </div>
        <div class="showtime-cards">${group.items.map(showtimeCard).join("")}</div>`;
      groupsHost.append(groupEl);
    });

    groupsHost.querySelectorAll("[data-select-showtime]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(btn.dataset.selectShowtime)}`);
      });
    });

    refreshReveal(host);
  } catch (error) {
    host.innerHTML = errorStateHTML({
      title: "Could not load showtimes",
      message: friendlyMessage(error),
    });
    host.querySelector(".js-retry")?.addEventListener("click", () => loadShowtimes(movie));
  }
}

/* ------------------------------------------------------------------ */

async function loadMovie() {
  const host = qs("#movie-host");
  try {
    const movie = await getMovie(state.movieId);
    state.movie = movie;
    document.title = `${movie.title} · CineLux`;
    host.innerHTML = movieHTML(movie);

    // Backdrop uses the poster, blurred under a scrim.
    const backdrop = host.querySelector(".movie-details__backdrop");
    if (movie.posterUrl) {
      const img = document.createElement("img");
      img.src = movie.posterUrl;
      img.alt = "";
      backdrop.append(img);
    }
    const posterHost = qs("#details-poster");
    if (posterHost) posterHost.append(posterElement(movie.posterUrl, movie.title, "movie-details__poster-frame"));

    initRevealOnScroll();
    await loadShowtimes(movie);
  } catch (error) {
    host.innerHTML = `
      <section class="section"><div class="container container--wide">
        ${error.status === 404
          ? emptyStateHTML({ icon: "film", title: "Movie not found", message: "This movie may have been removed from the catalogue." , actionLabel: "Browse movies", actionHref: PAGES.movies })
          : errorStateHTML({ message: friendlyMessage(error) })}
      </div></section>`;
  }
}

async function main() {
  await initPage({ auth: "any" });
  const { id } = queryParams({ id: "string" });
  if (!id || !uuidRe.test(id)) {
    qs("#movie-host").innerHTML = `<section class="section"><div class="container container--wide">
      ${errorStateHTML({ title: "Movie not specified", message: "Open this page from the movie catalogue.", retry: false })}</div></section>`;
    return;
  }
  state.movieId = id;
  await loadMovie();
}

main();
