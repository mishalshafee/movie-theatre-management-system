/**
 * Customer homepage.
 * Cinematic hero (featured now-showing movie with artwork), Now Showing +
 * Coming Soon grids, experience band, promo CTA — all live from the API.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { listMovies } from "../services/movies.service.js";
import { listShowtimes } from "../services/showtimes.service.js";
import { movieCard, posterElement } from "../components/movie-card.js";
import { skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { initRevealOnScroll, refreshReveal } from "../components/reveal.js";
import { toast } from "../components/toast.js";
import { friendlyMessage } from "../core/api.js";
import { qs, clear } from "../utils/dom.js";
import { formatDuration, formatRating, formatMovieStatus, truncate } from "../utils/formatters.js";
import { escapeHtml } from "../utils/dom.js";
import { icons } from "../components/icons.js";

/* ------------------------------------------------------------------ *
 * Hero
 * ------------------------------------------------------------------ */

async function loadHero() {
  const host = qs("#hero");
  if (!host) return;
  try {
    const { data } = await listMovies({ status: "now_showing", page: 1, limit: 12 });
    if (!data.length) {
      host.innerHTML = heroEmptyHTML();
      return;
    }
    // Feature the first movie with artwork; otherwise the first movie.
    const featured = data.find((m) => m.posterUrl) || data[0];
    let hasShowtime = false;
    try {
      const st = await listShowtimes({ movieId: featured.id, limit: 1 });
      hasShowtime = st.total > 0;
    } catch { /* booking CTA simply stays hidden */ }
    host.innerHTML = heroHTML(featured, hasShowtime);

    // Full-bleed artwork layer + poster frame
    const artHost = qs("#hero-art");
    if (artHost) {
      const img = document.createElement("img");
      img.src = "images/hero/hero-collage.jpg";
      img.alt = "Featured Cinema Artwork";
      artHost.append(img);
    }
    const posterHost = qs("#hero-poster");
    if (posterHost) posterHost.append(posterElement(featured.posterUrl, featured.title, "hero__poster"));
    initRevealOnScroll();
  } catch (error) {
    host.innerHTML = `<section class="hero hero--bare">
      <div class="hero__art" aria-hidden="true">
        <img src="images/hero/hero-collage.jpg" alt="Featured Cinema Artwork">
      </div>
      <div class="hero__scrim" aria-hidden="true"></div>
      <div class="container container--wide hero__inner">
        ${errorStateHTML({ title: "The projector is warming up", message: friendlyMessage(error) })}
      </div>
    </section>`;
  }
}

function heroEmptyHTML() {
  return `<section class="hero hero--bare">
    <div class="hero__art" aria-hidden="true">
      <img src="images/hero/hero-collage.jpg" alt="Featured Cinema Artwork">
    </div>
    <div class="hero__scrim" aria-hidden="true"></div>
    <div class="container container--wide">
    ${emptyStateHTML({
      icon: "film",
      title: "No movies are showing yet",
      message: "The cinema catalogue is empty right now. Sign in as an administrator to add movies and schedule showtimes.",
      actionLabel: "Explore movies anyway",
      actionHref: PAGES.movies,
    })}
  </div></section>`;
}

function heroHTML(movie, hasShowtime = false) {
  const meta = [
    movie.genre ? `<span class="hero__chip">${escapeHtml(movie.genre)}</span>` : "",
    `<span class="hero__chip">${icons.clock({ size: 13 })} ${formatDuration(movie.durationMinutes)}</span>`,
    `<span class="hero__chip hero__chip--status">${formatMovieStatus(movie.status)}</span>`,
  ].join("");

  return `
    <section class="hero" aria-label="Featured movie: ${escapeHtml(movie.title)}">
      <div class="hero__art" id="hero-art" aria-hidden="true"></div>
      <div class="hero__scrim" aria-hidden="true"></div>
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="container container--wide hero__inner">
        <div class="hero__content">
          <span class="hero__eyebrow" data-reveal>${icons.sparkles({ size: 14 })} Featured today</span>
          <h1 class="hero__title" data-reveal data-reveal-delay="70">${escapeHtml(movie.title)}</h1>
          <div class="hero__meta" data-reveal data-reveal-delay="140">${meta}</div>
          <p class="hero__desc" data-reveal data-reveal-delay="210">${escapeHtml(truncate(movie.description || "An unforgettable story awaits on the big screen.", 230))}</p>
          <div class="hero__actions" data-reveal data-reveal-delay="280">
            <a class="btn btn--primary btn--lg" href="${resolveUrl(`${PAGES.movieDetails}?id=${encodeURIComponent(movie.id)}`)}">
              ${hasShowtime ? `${icons.ticket({ size: 17 })} Book Tickets` : "View Details"}
            </a>
            <a class="btn btn--outline-light btn--lg" href="${resolveUrl(PAGES.movies)}">Explore Movies</a>
          </div>
        </div>
        <div class="hero__media" data-reveal data-reveal-delay="180">
          <div class="hero__poster-frame">
            <div id="hero-poster" class="hero__poster"></div>
            <div class="hero__poster-shine" aria-hidden="true"></div>
          </div>
          ${movie.rating ? `
          <div class="hero__medal" aria-hidden="true">
            <strong>${formatRating(movie.rating)}</strong>
            <span>${icons.star({ size: 11 })} Rating</span>
          </div>` : ""}
        </div>
      </div>
      <div class="hero__scroll" aria-hidden="true">
        <span>Scroll</span>
        <span class="hero__scroll-line"></span>
      </div>
    </section>`;
}

/* ------------------------------------------------------------------ *
 * Movie sections
 * ------------------------------------------------------------------ */

async function loadMovieSection({ hostId, status, title }) {
  const section = qs(hostId);
  if (!section) return;
  const grid = section.querySelector(".movie-grid");
  clear(grid);
  grid.innerHTML = skeletonHTML("cards", 4);

  try {
    const { data, total } = await listMovies({ status, page: 1, limit: 12 });
    clear(grid);
    if (!data.length) {
      grid.innerHTML = emptyStateHTML({
        icon: "film",
        title: `No ${title.toLowerCase()} movies yet`,
        message: "Check back soon — the schedule updates regularly.",
        actionLabel: "Browse all movies",
        actionHref: PAGES.movies,
      });
      return;
    }
    data.forEach((movie, index) => grid.append(movieCard(movie, {
      delay: Math.min(index * 60, 420),
      showStatus: false, // the section heading already communicates status
      bookable: status === "now_showing",
    })));
    const countEl = section.querySelector("[data-section-count]");
    if (countEl) countEl.textContent = total > 12 ? `12 of ${total} films` : `${total} film${total === 1 ? "" : "s"}`;
    refreshReveal(grid);
  } catch (error) {
    clear(grid);
    grid.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    grid.querySelector(".js-retry")?.addEventListener("click", () => loadMovieSection({ hostId, status, title }));
  }
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

function initDeniedBanner(user) {
  const params = new URLSearchParams(location.search);
  if (params.get("denied") === "1") {
    toast.warning(
      user
        ? "That area is restricted to other roles. You have been redirected home."
        : "Please sign in with an account that has access to that area."
    );
    history.replaceState(null, "", location.pathname);
  }
}

async function main() {
  const { user } = await initPage({ auth: "any" });
  initDeniedBanner(user);
  loadHero();
  loadMovieSection({ hostId: "#now-showing", status: "now_showing", title: "Now Showing" });
  loadMovieSection({ hostId: "#coming-soon", status: "coming_soon", title: "Coming Soon" });
}

main();
