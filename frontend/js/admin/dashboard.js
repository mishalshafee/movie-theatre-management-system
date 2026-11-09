/**
 * Admin · Dashboard overview.
 * Statistics are computed ONLY from data the backend actually exposes:
 *   - movies list (status counts, total)
 *   - screens list (screen + seat counts)
 *   - showtimes list (upcoming total + next screenings)
 * No revenue, transaction or customer metrics are fabricated.
 */

import { initPage } from "../core/session.js";
import { renderAdminShell } from "../components/admin-shell.js";
import { listMovies } from "../services/movies.service.js";
import { listScreens } from "../services/screens.service.js";
import { listShowtimes } from "../services/showtimes.service.js";
import { skeletonHTML, errorStateHTML } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { refreshReveal } from "../components/reveal.js";
import { qs, escapeHtml } from "../utils/dom.js";
import { formatMoney } from "../utils/formatters.js";
import { formatDate, formatTime } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

async function loadStats() {
  const statsHost = qs("#stats-grid");
  const distHost = qs("#dist-bars");
  const nextHost = qs("#next-list");

  statsHost.innerHTML = skeletonHTML("stats", 4);

  try {
    const [moviesRes, screens, showtimesRes, showtimesPage] = await Promise.all([
      listMovies({ page: 1, limit: 50 }),
      listScreens(),
      listShowtimes({ page: 1, limit: 1 }),           // total count only
      listShowtimes({ page: 1, limit: 6 }),           // first upcoming screenings
    ]);

    const movies = moviesRes.data;
    const totalMovies = moviesRes.total;
    const nowShowing = movies.filter((m) => m.status === "now_showing").length;
    const comingSoon = movies.filter((m) => m.status === "coming_soon").length;
    const archived = movies.filter((m) => m.status === "archived").length;
    const totalSeats = screens.reduce((sum, s) => sum + Number(s.seatCount || 0), 0);
    const upcomingShowtimes = showtimesRes.total;

    statsHost.innerHTML = `
      <div class="stat-card" data-reveal>
        <span class="stat-card__icon">${icons.film({ size: 20 })}</span>
        <span class="stat-card__label">Movies in catalogue</span>
        <span class="stat-card__value">${totalMovies}</span>
        <span class="stat-card__hint">${nowShowing} now showing · ${comingSoon} coming soon</span>
      </div>
      <div class="stat-card stat-card--blue" data-reveal data-reveal-delay="60">
        <span class="stat-card__icon">${icons.screen({ size: 20 })}</span>
        <span class="stat-card__label">Screens</span>
        <span class="stat-card__value">${screens.length}</span>
        <span class="stat-card__hint">${totalSeats} seats across all auditoriums</span>
      </div>
      <div class="stat-card stat-card--green" data-reveal data-reveal-delay="120">
        <span class="stat-card__icon">${icons.calendar({ size: 20 })}</span>
        <span class="stat-card__label">Upcoming showtimes</span>
        <span class="stat-card__value">${upcomingShowtimes}</span>
        <span class="stat-card__hint">Scheduled screenings, live count</span>
      </div>
      <div class="stat-card" data-reveal data-reveal-delay="180">
        <span class="stat-card__icon">${icons.seat({ size: 20 })}</span>
        <span class="stat-card__label">Archived films</span>
        <span class="stat-card__value">${archived}</span>
        <span class="stat-card__hint">Hidden from the customer catalogue</span>
      </div>`;

    // Catalogue status distribution
    const distRows = [
      { label: "Now Showing", count: nowShowing, fill: "", key: "green" },
      { label: "Coming Soon", count: comingSoon, fill: "--blue", key: "blue" },
      { label: "Archived", count: archived, fill: "--grey", key: "grey" },
    ];
    const maxCount = Math.max(1, ...distRows.map((r) => r.count));
    distHost.innerHTML = distRows.map((row) => `
      <div class="dist-row">
        <span class="dist-row__label">${row.label}</span>
        <span class="dist-row__track"><span class="dist-row__fill dist-row__fill${row.fill}" style="width:${Math.round((row.count / maxCount) * 100)}%"></span></span>
        <span class="dist-row__count">${row.count} film${row.count === 1 ? "" : "s"}</span>
      </div>`).join("") + `
      <div class="dist-row">
        <span class="dist-row__label">Screens</span>
        <span class="dist-row__track"><span class="dist-row__fill" style="width:100%"></span></span>
        <span class="dist-row__count">${screens.length} · ${totalSeats} seats</span>
      </div>`;

    // Next screenings
    if (!showtimesPage.data.length) {
      nextHost.innerHTML = `
        <div class="empty-state" style="padding:1.6rem">
          <div class="empty-state__icon">${icons.calendar({ size: 26 })}</div>
          <h3 class="empty-state__title" style="font-size:var(--fs-lg)">No upcoming showtimes</h3>
          <p class="empty-state__text">Schedule screenings so customers can start booking.</p>
          <a class="btn btn--primary btn--sm" href="showtimes.html">Create showtime</a>
        </div>`;
    } else {
      nextHost.innerHTML = showtimesPage.data.map((st) => `
        <div class="next-item">
          <div class="next-item__time">
            <strong>${formatTime(st.startsAt)}</strong>
            <span>${formatDate(st.startsAt).split(",")[0]}</span>
          </div>
          <div class="next-item__main">
            <span class="next-item__title">${escapeHtml(st.movie.title)}</span>
            <span class="next-item__sub">${escapeHtml(st.screen.name)} · ${st.movie.durationMinutes} min</span>
          </div>
          <div class="next-item__prices">
            <span>Std ${formatMoney(st.priceStandard)}</span>
            <span>Prm ${formatMoney(st.pricePremium)}</span>
          </div>
        </div>`).join("");
    }

    refreshReveal();
  } catch (error) {
    statsHost.innerHTML = "";
    statsHost.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    statsHost.querySelector(".js-retry")?.addEventListener("click", loadStats);
    distHost.innerHTML = "";
    nextHost.innerHTML = "";
  }
}

async function main() {
  const { user, ok } = await initPage({ auth: "admin", chrome: false });
  if (!ok || !user) return;
  renderAdminShell(user, "dashboard");
  await loadStats();
}

main();
