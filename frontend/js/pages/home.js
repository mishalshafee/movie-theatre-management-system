/**
 * Customer homepage: hero (featured movie), Now Showing + Coming Soon grids,
 * experience section, promo CTA. All data comes from the live API.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { listMovies } from "../services/movies.service.js";
import { listShowtimes } from "../services/showtimes.service.js";
import { movieCard, posterElement } from "../components/movie-card.js";
import { skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { refreshReveal, initRevealOnScroll } from "../components/reveal.js";
import { toast } from "../components/toast.js";
import { friendlyMessage } from "../core/api.js";
import { qs, clear } from "../utils/dom.js";
import { formatDuration, formatRating, formatMovieStatus, truncate } from "../utils/formatters.js";
import { escapeHtml } from "../utils/dom.js";
import { icons } from "../components/icons.js";

async function loadHero() {
  const host = qs("#hero");
  if (!host) return;
  host.classList.add("hero--loading");
  try {
    const { data } = await listMovies({ status: "now_showing", page: 1, limit: 12 });
    if (!data.length) {
      host.innerHTML = heroHTML(null);
      return;
    }
    // Feature the first movie that has a poster, otherwise the first movie.
    const featured = data.find((m) => m.posterUrl) || data[0];
    let hasShowtime = false;
    try {
      const st = await listShowtimes({ movieId: featured.id, limit: 1 });
      hasShowtime = st.total > 0;
    } catch { /* booking button simply stays hidden */ }
    host.innerHTML = heroHTML(featured, hasShowtime);
    const posterHost = qs("#hero-poster");
    if (posterHost) posterHost.append(posterElement(featured.posterUrl, featured.title, "hero__poster"));
    // Re-scan reveal targets: the hero markup was injected after the initial scan.
    initRevealOnScroll();
  } catch (error) {
    host.innerHTML = `<section class="hero"><div class="container hero__inner">
      ${errorStateHTML({ title: "The projector is warming up", message: friendlyMessage(error) })}
    </div></section>`;
  } finally {
    host.classList.remove("hero--loading");
  }
}

function heroHTML(movie, hasShowtime = false) {
  if (!movie) {
    return `<section class="hero"><div class="container hero__inner">
      ${emptyStateHTML({
        title: "No movies are showing yet",
        message: "The cinema catalogue is empty right now. Sign in as an administrator to add movies.",
        actionLabel: "Explore movies anyway",
        actionHref: PAGES.movies,
      })}
    </div></section>`;
  }

  const meta = [
    movie.genre ? `<span class="hero__chip">${escapeHtml(movie.genre)}</span>` : "",
    `<span class="hero__chip">${icons.clock({ size: 13 })} ${formatDuration(movie.durationMinutes)}</span>`,
    movie.rating ? `<span class="hero__chip">${icons.star({ size: 13 })} ${formatRating(movie.rating)}</span>` : "",
    `<span class="hero__chip hero__chip--status">${formatMovieStatus(movie.status)}</span>`,
  ].join("");

  return `
    <section class="hero">
      <div class="hero__glow" aria-hidden="true"></div>
      <div class="container hero__inner">
        <div class="hero__content">
          <span class="hero__eyebrow" data-reveal>${icons.sparkles({ size: 15 })} Featured today</span>
          <h1 class="hero__title" data-reveal data-reveal-delay="60">${escapeHtml(movie.title)}</h1>
          <div class="hero__meta" data-reveal data-reveal-delay="120">${meta}</div>
          <p class="hero__desc" data-reveal data-reveal-delay="180">${truncate(movie.description || "An unforgettable story awaits on the big screen.", 220)}</p>
          <div class="hero__actions" data-reveal data-reveal-delay="240">
            <a class="btn btn--primary btn--lg" href="${resolveUrl(`${PAGES.movieDetails}?id=${encodeURIComponent(movie.id)}`)}">
              ${hasShowtime ? "Book Tickets" : "View Details"}
            </a>
            <a class="btn btn--outline btn--lg" href="${resolveUrl(PAGES.movies)}">Explore Movies</a>
          </div>
        </div>
        <div class="hero__media" data-reveal data-reveal-delay="140">
          <div class="hero__poster-frame">
            <div id="hero-poster" class="hero__poster"></div>
            <div class="hero__poster-shine" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    </section>`;
}

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
    data.forEach((movie, index) => grid.append(movieCard(movie, { delay: Math.min(index * 60, 480) })));
    const countEl = section.querySelector("[data-section-count]");
    if (countEl) countEl.textContent = total > 12 ? `12 of ${total} films` : `${total} film${total === 1 ? "" : "s"}`;
    refreshReveal(grid);
  } catch (error) {
    clear(grid);
    grid.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    grid.querySelector(".js-retry")?.addEventListener("click", () => loadMovieSection({ hostId, status, title }));
  }
}

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
