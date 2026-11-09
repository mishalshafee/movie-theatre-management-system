/**
 * My Bookings page.
 * Server-side pagination through GET /api/bookings (the only list endpoint),
 * plus a client-side status filter over the current page. Cancellation uses
 * POST /api/bookings/:id/cancel and respects backend rules — the list is
 * refreshed from the API afterwards.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { listMyBookings, cancelBooking } from "../services/bookings.service.js";
import { posterElement } from "../components/movie-card.js";
import { skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { renderPagination } from "../components/pagination.js";
import { refreshReveal } from "../components/reveal.js";
import { friendlyMessage } from "../core/api.js";
import { toast } from "../components/toast.js";
import { confirmDialog } from "../components/modal.js";
import { qs, qsa, clear, escapeHtml } from "../utils/dom.js";
import { formatMoney, formatBookingStatus, formatSeats, formatSeatsShort } from "../utils/formatters.js";
import { formatDate, formatTime, formatDateTime, formatCountdown, secondsUntil } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const state = { page: 1, limit: 10, status: "", data: [], meta: null, timer: null };

function statusClass(status) {
  return {
    held: "status-chip--held",
    confirmed: "status-chip--confirmed",
    used: "status-chip--used",
    cancelled: "status-chip--cancelled",
    expired: "status-chip--expired",
  }[status] || "";
}

/* ------------------------------------------------------------------ */

function bookingCard(booking) {
  const st = booking.showtime || {};
  const seats = booking.seats || [];
  const heldActive = booking.status === "held" && booking.expiresAt && new Date(booking.expiresAt).getTime() > Date.now();

  const card = document.createElement("article");
  card.className = "booking-card";
  card.dataset.reveal = "";

  card.innerHTML = `
    <a class="booking-card__poster" href="${resolveUrl(`${PAGES.bookingDetails}?id=${encodeURIComponent(booking.id)}`)}" aria-hidden="true" tabindex="-1"></a>
    <div class="booking-card__main">
      <span class="status-chip ${statusClass(booking.status)}">${formatBookingStatus(booking.status)}</span>
      <h3 class="booking-card__title">
        <a href="${resolveUrl(`${PAGES.bookingDetails}?id=${encodeURIComponent(booking.id)}`)}">${escapeHtml(st.movie?.title ?? "Movie")}</a>
      </h3>
      <div class="booking-card__meta">
        <span class="meta-chip">${icons.calendar({ size: 13 })} ${formatDate(st.startsAt)}</span>
        <span class="meta-chip">${icons.clock({ size: 13 })} ${formatTime(st.startsAt)}</span>
        <span class="meta-chip">${icons.screen({ size: 13 })} ${escapeHtml(st.screen?.name ?? "")}</span>
      </div>
      <p class="booking-card__seats">
        ${icons.seat({ size: 14 })} ${escapeHtml(formatSeatsShort(seats, 6))}
        <span class="dot-sep">·</span> <span class="mono">${escapeHtml(booking.code)}</span>
        ${heldActive ? `<span class="dot-sep">·</span> <span style="color:var(--warning)">holds for <strong data-hold-countdown="${escapeHtml(booking.id)}">${formatCountdown(secondsUntil(booking.expiresAt))}</strong></span>` : ""}
      </p>
    </div>
    <div class="booking-card__facts">
      <span class="booking-card__facts-row">${icons.ticket({ size: 14 })} Booked ${formatDateTime(booking.createdAt)}</span>
      <span class="booking-card__facts-row">${icons.tag({ size: 14 })} ${booking.paidAt ? `Paid (demo) ${formatDateTime(booking.paidAt)}` : "Not paid"}</span>
      <span class="booking-card__total">${formatMoney(booking.total)}</span>
    </div>
    <div class="booking-card__actions">
      <a class="btn btn--secondary btn--sm" href="${resolveUrl(`${PAGES.bookingDetails}?id=${encodeURIComponent(booking.id)}`)}">
        ${booking.status === "confirmed" ? `${icons.eye({ size: 14 })} View Ticket` : `${icons.info({ size: 14 })} Details`}
      </a>
      ${(booking.status === "held" || booking.status === "confirmed") ? `
        <button type="button" class="btn btn--ghost btn--sm" data-cancel="${escapeHtml(booking.id)}">Cancel</button>` : ""}
    </div>`;

  card.querySelector(".booking-card__poster").append(
    posterElement(st.movie?.posterUrl, st.movie?.title ?? "", "booking-card__poster"),
  );

  return card;
}

/* ------------------------------------------------------------------ */

async function loadBookings() {
  const host = qs("#bookings-list");
  host.innerHTML = skeletonHTML("rows", 4);
  qs("#bookings-pagination").innerHTML = "";

  try {
    const res = await listMyBookings({ page: state.page, limit: state.limit });
    state.data = res.data;
    state.meta = res;
    renderBookings();
  } catch (error) {
    clear(host);
    host.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    host.querySelector(".js-retry")?.addEventListener("click", loadBookings);
    qs("#bookings-count").textContent = "";
  }
}

function renderBookings() {
  const host = qs("#bookings-list");
  clear(host);

  // Client-side status filter over the current server page.
  const rows = state.status
    ? state.data.filter((b) => b.status === state.status)
    : state.data;

  const countEl = qs("#bookings-count");
  countEl.textContent = state.meta.total === 1
    ? "1 booking"
    : `${state.meta.total} booking${state.meta.total === 1 ? "" : "s"} · page ${state.meta.page} of ${Math.max(1, Math.ceil(state.meta.total / state.meta.limit))}`;

  if (!rows.length) {
    host.innerHTML = emptyStateHTML({
      icon: "ticket",
      title: state.status ? `No ${state.status} bookings on this page` : "No bookings yet",
      message: state.status
        ? "Try another filter, or clear it to see every booking."
        : "Pick a movie, choose your seats and your bookings will appear here.",
      actionLabel: "Browse movies",
      actionHref: PAGES.movies,
    });
    return;
  }

  rows.forEach((booking) => host.append(bookingCard(booking)));

  // Cancellations
  host.querySelectorAll("[data-cancel]").forEach((btn) => {
    btn.addEventListener("click", () => requestCancel(btn.dataset.cancel));
  });

  // Live countdowns for active holds on this page
  clearInterval(state.timer);
  const holdNodes = host.querySelectorAll("[data-hold-countdown]");
  if (holdNodes.length) {
    state.timer = setInterval(() => {
      holdNodes.forEach((node) => {
        const booking = state.data.find((b) => b.id === node.dataset.holdCountdown);
        if (!booking?.expiresAt) return;
        node.textContent = formatCountdown(secondsUntil(booking.expiresAt));
      });
    }, 1000);
  }

  renderPagination(qs("#bookings-pagination"), state.meta, (page) => {
    state.page = page;
    loadBookings();
  });

  refreshReveal(host);
}

async function requestCancel(id) {
  const booking = state.data.find((b) => b.id === id);
  if (!booking) return;
  const ok = await confirmDialog({
    title: "Cancel this booking?",
    message: `Booking <strong>${escapeHtml(booking.code)}</strong> for <strong>${escapeHtml(booking.showtime?.movie?.title ?? "")}</strong> will be cancelled and the seats released. This cannot be undone.`,
    confirmLabel: "Yes, cancel booking",
  });
  if (!ok) return;

  try {
    await cancelBooking(id);
    toast.success("Booking cancelled. The seats have been released.");
    await loadBookings();
  } catch (error) {
    if (error.code === "SHOWTIME_STARTED") {
      toast.error("This showtime has already started — the booking can no longer be cancelled.");
    } else if (error.code === "BOOKING_NOT_CANCELLABLE") {
      toast.error("This booking can no longer be cancelled.");
      await loadBookings();
    } else {
      toast.error(friendlyMessage(error));
    }
  }
}

/* ------------------------------------------------------------------ */

function initFilter() {
  qsa("#bookings-filter .segmented__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.status = btn.dataset.status || "";
      state.page = 1;
      qsa("#bookings-filter .segmented__btn").forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-selected", String(active));
      });
      renderBookings();
    });
  });
}

async function main() {
  const { ok } = await initPage({ auth: "user" });
  if (!ok) return;
  initFilter();
  await loadBookings();
}

main();
