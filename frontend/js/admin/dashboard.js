/**
 * Admin dashboard — statistics computed from real API data only.
 * Deliberately NO revenue / customers / sales metrics: the backend exposes
 * no aggregate analytics endpoints, and inventing them is forbidden.
 */

import { initPage } from "../core/session.js";
import { renderAdminShell } from "../components/admin-shell.js";
import { listMovies } from "../services/movies.service.js";
import { listScreens } from "../services/screens.service.js";
import { listShowtimes } from "../services/showtimes.service.js";
import { errorStateHTML } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { qs, escapeHtml } from "../utils/dom.js";
import { formatDateTime, formatTime } from "../utils/date-time.js";
import { icons } from "../components/icons.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";

async function main() {
  const { user, ok } = await initPage({ auth: "admin", chrome: false });
  if (!ok || !user) return;
  renderAdminShell(user, "dashboard");
  await loadStats();
}

async function loadStats() {
  const grid = qs("#stats-grid");
  try {
    const [nowShowing, comingSoon, screens, upcoming] = await Promise.all([
      listMovies({ status: "now_showing", page: 1, limit: 1 }),
      listMovies({ status: "coming_soon", page: 1, limit: 1 }),
      listScreens(),
      listShowtimes({ page: 1, limit: 5 }),
    ]);
    const archived = await listMovies({ status: "archived", page: 1, limit: 1 });
    const totalMovies = nowShowing.total + comingSoon.total + archived.total;

    grid.innerHTML = `
      <article class="stat-card" data-reveal>
        <span class="stat-card__icon stat-card__icon--accent">${icons.film({ size: 22 })}</span>
        <span class="stat-card__value">${totalMovies}</span>
        <span class="stat-card__label">Total movies</span>
        <a class="stat-card__link" href="${resolveUrl(PAGES.adminMovies)}">Manage movies</a>
      </article>
      <article class="stat-card" data-reveal data-reveal-delay="60">
        <span class="stat-card__icon stat-card__icon--green">${icons.play({ size: 22 })}</span>
        <span class="stat-card__value">${nowShowing.total}</span>
        <span class="stat-card__label">Now showing</span>
        <a class="stat-card__link" href="${resolveUrl(PAGES.adminMovies)}">View list</a>
      </article>
      <article class="stat-card" data-reveal data-reveal-delay="120">
        <span class="stat-card__icon stat-card__icon--amber">${icons.sparkles({ size: 22 })}</span>
        <span class="stat-card__value">${comingSoon.total}</span>
        <span class="stat-card__label">Coming soon</span>
        <a class="stat-card__link" href="${resolveUrl(PAGES.adminMovies)}">View list</a>
      </article>
      <article class="stat-card" data-reveal data-reveal-delay="180">
        <span class="stat-card__icon stat-card__icon--blue">${icons.screen({ size: 22 })}</span>
        <span class="stat-card__value">${screens.length}</span>
        <span class="stat-card__label">Cinema screens</span>
        <a class="stat-card__link" href="${resolveUrl(PAGES.adminScreens)}">Manage screens</a>
      </article>
      <article class="stat-card stat-card--wide" data-reveal data-reveal-delay="240">
        <span class="stat-card__icon stat-card__icon--red">${icons.calendar({ size: 22 })}</span>
        <span class="stat-card__value">${upcoming.total}</span>
        <span class="stat-card__label">Upcoming showtimes</span>
        <a class="stat-card__link" href="${resolveUrl(PAGES.adminShowtimes)}">Manage showtimes</a>
      </article>`;

    renderUpcoming(upcoming.data);
  } catch (error) {
    grid.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    grid.querySelector(".js-retry")?.addEventListener("click", loadStats);
    qs("#upcoming-panel").innerHTML = "";
  }
}

function renderUpcoming(showtimes) {
  const panel = qs("#upcoming-panel");
  if (!showtimes.length) {
    panel.innerHTML = `
      <div class="admin-empty">
        ${icons.calendar({ size: 36 })}
        <p>No upcoming showtimes scheduled yet.</p>
        <a class="btn btn--primary btn--sm" href="${resolveUrl(PAGES.adminShowtimes)}">Schedule a showtime</a>
      </div>`;
    return;
  }
  panel.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th scope="col">Movie</th><th scope="col">Screen</th><th scope="col">Starts</th><th scope="col">Local time</th>
      </tr></thead>
      <tbody>
        ${showtimes.map((st) => `
          <tr>
            <td class="admin-table__strong">${escapeHtml(st.movie.title)}</td>
            <td>${escapeHtml(st.screen.name)}</td>
            <td>${escapeHtml(formatDateTime(st.startsAt))}</td>
            <td>${escapeHtml(formatTime(st.startsAt))}</td>
          </tr>`).join("")}
      </tbody>
    </table>`;
}

main();
