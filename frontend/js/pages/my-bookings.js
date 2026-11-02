/**
 * My Bookings — the signed-in customer's booking history with pagination.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { listMyBookings } from "../services/bookings.service.js";
import { skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { renderPagination } from "../components/pagination.js";
import { posterElement } from "../components/movie-card.js";
import { friendlyMessage } from "../core/api.js";
import { qs, clear, escapeHtml } from "../utils/dom.js";
import { formatMoney, formatBookingStatus, formatSeatsShort } from "../utils/formatters.js";
import { formatDateTime, isPast } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const state = { page: 1, limit: 10 };

function statusClass(status) {
  return {
    held: "status-chip--held",
    confirmed: "status-chip--confirmed",
    used: "status-chip--used",
    cancelled: "status-chip--cancelled",
    expired: "status-chip--expired",
  }[status] || "";
}

function bookingRow(booking) {
  const showtime = booking.showtime || {};
  const movie = showtime.movie || {};
  const card = document.createElement("a");
  card.className = "booking-card";
  card.dataset.reveal = "";
  card.href = resolveUrl(`${PAGES.bookingDetails}?id=${encodeURIComponent(booking.id)}`);

  const seatsInfo = formatSeatsShort(booking.seats || [], 3);
  const upcoming = booking.status === "confirmed" && !isPast(showtime.startsAt);

  card.innerHTML = `
    <div class="booking-card__poster"></div>
    <div class="booking-card__body">
      <div class="booking-card__top">
        <h3 class="booking-card__title">${escapeHtml(movie.title ?? "Movie")}</h3>
        <span class="status-chip ${statusClass(booking.status)}">${formatBookingStatus(booking.status)}</span>
      </div>
      <p class="booking-card__meta">
        ${icons.calendar({ size: 14 })} ${formatDateTime(showtime.startsAt)}
        ${icons.screen({ size: 14 })} ${escapeHtml(showtime.screen?.name ?? "")}
        ${icons.seat({ size: 14 })} ${escapeHtml(seatsInfo)}
      </p>
      <p class="booking-card__code">${icons.ticket({ size: 14 })} Booking code: <strong>${escapeHtml(booking.code)}</strong>
        ${upcoming ? '<span class="pill pill--success">Upcoming</span>' : ""}</p>
    </div>
    <div class="booking-card__aside">
      <span class="booking-card__total">${formatMoney(booking.total)}</span>
      <span class="booking-card__cta">View ticket ${icons.chevronRight({ size: 14 })}</span>
    </div>`;

  const posterHost = card.querySelector(".booking-card__poster");
  posterHost.append(posterElement(movie.posterUrl, movie.title ?? "", "booking-card__poster-frame"));
  return card;
}

async function loadBookings() {
  const list = qs("#bookings-list");
  const pagination = qs("#bookings-pagination");
  list.innerHTML = skeletonHTML("rows", 3);

  try {
    const res = await listMyBookings({ page: state.page, limit: state.limit });
    clear(list);
    if (!res.data.length) {
      list.innerHTML = emptyStateHTML({
        icon: "ticket",
        title: "No bookings yet",
        message: "When you book your first tickets they will appear here.",
        actionLabel: "Browse movies",
        actionHref: PAGES.movies,
      });
      pagination.innerHTML = "";
      return;
    }
    res.data.forEach((booking) => list.append(bookingRow(booking)));
    renderPagination(pagination, res, (page) => {
      state.page = page;
      loadBookings();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  } catch (error) {
    clear(list);
    list.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    list.querySelector(".js-retry")?.addEventListener("click", loadBookings);
  }
}

async function main() {
  const { ok } = await initPage({ auth: "user" });
  if (!ok) return;
  await loadBookings();
}

main();
