/**
 * Booking details / digital ticket.
 * Only renders a confirmed ticket after verifying the booking status from
 * the backend. Supports demo payment of held bookings and cancellation.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl, navigate, queryParams } from "../core/router-helpers.js";
import { getBooking, payBooking, cancelBooking } from "../services/bookings.service.js";
import { setButtonLoading, errorStateHTML } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { toast } from "../components/toast.js";
import { confirmDialog } from "../components/modal.js";
import { qs, clear, escapeHtml } from "../utils/dom.js";
import { formatMoney, formatBookingStatus, formatSeats } from "../utils/formatters.js";
import { formatDateTime, formatTime, formatDate, formatCountdown, secondsUntil } from "../utils/date-time.js";
import { icons, logoMark } from "../components/icons.js";

const state = { booking: null, timer: null };

function statusClass(status) {
  return {
    held: "status-chip--held",
    confirmed: "status-chip--confirmed",
    used: "status-chip--used",
    cancelled: "status-chip--cancelled",
    expired: "status-chip--expired",
  }[status] || "";
}

function ticketHTML(booking) {
  const status = booking.status;
  const seats = booking.seats || [];
  const showtime = booking.showtime || {};

  const infoRows = [
    ["Booking reference", booking.code],
    ["Showtime", `${formatDate(showtime.startsAt)} · ${formatTime(showtime.startsAt)}`],
    ["Screen", showtime.screen?.name ?? "—"],
    ["Seats", formatSeats(seats)],
    ["Booked on", formatDateTime(booking.createdAt)],
    ["Paid on", booking.paidAt ? formatDateTime(booking.paidAt) : "—"],
  ];

  return `
    <article class="ticket" id="ticket">
      <div class="ticket__brand">
        <a class="brand" href="${resolveUrl(PAGES.home)}">${logoMark(30)}<span class="brand__name">Cine<strong>Lux</strong></span></a>
        <span class="ticket__badge status-chip ${statusClass(status)}">${formatBookingStatus(status)}</span>
      </div>
      <div class="ticket__main">
        <div class="ticket__movie">
          <div class="ticket__poster"></div>
          <div>
            <h2 class="ticket__title">${escapeHtml(showtime.movie?.title ?? "Movie")}</h2>
            <p class="ticket__when">
              ${icons.calendar({ size: 15 })} ${formatDate(showtime.startsAt)}
              ${icons.clock({ size: 15 })} ${formatTime(showtime.startsAt)}
            </p>
            <p class="ticket__screen">${icons.screen({ size: 15 })} ${escapeHtml(showtime.screen?.name ?? "")}</p>
          </div>
        </div>
        <div class="ticket__seats">
          ${seats.map((s) => `<span class="seat-chip seat-chip--ticket">${escapeHtml(`${s.row}${s.number}`)}<em>${formatMoney(s.price)}</em></span>`).join("")}
        </div>
        <dl class="ticket__info">
          ${infoRows.map(([label, value]) => `
            <div class="ticket__info-row"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>
      </div>
      <div class="ticket__stub">
        <div class="ticket__code" aria-label="Booking code">${escapeHtml(booking.code)}</div>
        <div class="ticket__total">
          <span>${status === "confirmed" ? "Total paid" : "Total"}</span>
          <strong>${formatMoney(booking.total)}</strong>
        </div>
        <p class="ticket__print-note">Demo ticket · No QR scanning — show the booking reference at the box office</p>
      </div>
      <div class="ticket__perf" aria-hidden="true"></div>
    </article>`;
}

function renderActions(booking) {
  const bar = qs("#ticket-actions");
  clear(bar);

  if (booking.status === "held") {
    const expired = !booking.expiresAt || new Date(booking.expiresAt).getTime() <= Date.now();
    if (!expired) {
      bar.insertAdjacentHTML("beforeend", `
        <div class="ticket-pay" id="ticket-pay">
          <div class="ticket-pay__countdown">
            <span class="hold-ring" style="--hold-fraction:${Math.min(1, secondsUntil(booking.expiresAt) / 600)}"></span>
            Seats held · expires in <strong id="ticket-countdown">${formatCountdown(secondsUntil(booking.expiresAt))}</strong>
          </div>
          <button type="button" class="btn btn--primary btn--lg" id="pay-btn">${icons.card({ size: 17 })} Pay now (demo)</button>
        </div>`);
      qs("#pay-btn").addEventListener("click", payNow);
      state.timer = setInterval(() => {
        const seconds = secondsUntil(booking.expiresAt);
        const node = qs("#ticket-countdown");
        if (!node) { clearInterval(state.timer); return; }
        node.textContent = formatCountdown(seconds);
        if (seconds <= 0) {
          clearInterval(state.timer);
          toast.warning("Your seat hold expired.");
          loadBooking(booking.id, true);
        }
      }, 1000);
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "btn btn--secondary";
      cancel.textContent = "Cancel booking";
      cancel.addEventListener("click", () => cancelCurrent(booking));
      bar.querySelector(".ticket-pay").append(cancel);
    } else {
      bar.insertAdjacentHTML("beforeend", `
        <div class="hold-expired hold-expired--inline" role="alert">
          <h4>${icons.alert({ size: 17 })} This hold has expired</h4>
          <p>The seats were released. You can book again if seats are still available.</p>
          <a class="btn btn--primary" href="${resolveUrl(`${PAGES.seatSelection}?showtime=${encodeURIComponent(booking.showtime?.id ?? "")}`)}">Back to seat selection</a>
        </div>`);
    }
  }

  if (booking.status === "confirmed") {
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn--secondary";
    cancel.textContent = "Cancel booking";
    cancel.addEventListener("click", () => cancelCurrent(booking));
    const print = document.createElement("button");
    print.type = "button";
    print.className = "btn btn--ghost";
    print.innerHTML = `${icons.printer({ size: 16 })} Print ticket`;
    print.addEventListener("click", () => window.print());
    bar.append(print, cancel);
  }
}

async function payNow() {
  const booking = state.booking;
  const button = qs("#pay-btn");
  setButtonLoading(button, true, "Processing…");
  try {
    const paid = await payBooking(booking.id);
    if (paid?.status === "confirmed") {
      toast.success("Payment successful — your seats are confirmed!");
      await loadBooking(booking.id);
    } else {
      throw { code: "BOOKING_NOT_PAYABLE" };
    }
  } catch (error) {
    if (error.code === "HOLD_EXPIRED") {
      toast.error("The hold expired before payment completed.");
      await loadBooking(booking.id);
    } else {
      toast.error(friendlyMessage(error));
      setButtonLoading(button, false);
    }
  }
}

async function cancelCurrent(booking) {
  const ok = await confirmDialog({
    title: "Cancel this booking?",
    message: `Booking <strong>${escapeHtml(booking.code)}</strong> for <strong>${escapeHtml(booking.showtime?.movie?.title ?? "")}</strong> will be cancelled and the seats released. This cannot be undone.`,
    confirmLabel: "Yes, cancel booking",
  });
  if (!ok) return;
  try {
    await cancelBooking(booking.id);
    toast.success("Booking cancelled. The seats have been released.");
    await loadBooking(booking.id);
  } catch (error) {
    if (error.code === "SHOWTIME_STARTED") {
      toast.error("This showtime has already started — the booking can no longer be cancelled.");
    } else if (error.code === "BOOKING_NOT_CANCELLABLE") {
      toast.error("This booking can no longer be cancelled.");
      await loadBooking(booking.id);
    } else {
      toast.error(friendlyMessage(error));
    }
  }
}

/* ------------------------------------------------------------------ */

async function loadBooking(id, quiet = false) {
  const host = qs("#ticket-host");
  if (!quiet) {
    clear(host);
    host.innerHTML = '<div class="ticket-skeleton"><div class="skeleton skeleton--block" style="height:420px"></div></div>';
  }
  try {
    const booking = await getBooking(id);
    state.booking = booking;
    document.title = `Booking ${booking.code} · CineLux`;
    clearInterval(state.timer);
    host.innerHTML = ticketHTML(booking);

    // Poster inside the ticket (with graceful fallback)
    const posterHost = qs(".ticket__poster");
    if (posterHost) {
      const { posterElement } = await import("../components/movie-card.js");
      posterHost.append(posterElement(booking.showtime?.movie?.posterUrl, booking.showtime?.movie?.title ?? "", "ticket__poster-frame"));
    }
    renderActions(booking);
  } catch (error) {
    clear(host);
    host.innerHTML = errorStateHTML({
      title: error.status === 404 ? "Booking not found" : "Could not load this booking",
      message: error.status === 404
        ? "Check the link or sign in with the account that made this booking."
        : friendlyMessage(error),
    });
    qs("#ticket-actions").innerHTML = "";
  }
}

async function main() {
  const { user, ok } = await initPage({ auth: "user" });
  if (!ok) return;
  if (!user) return;

  const { id } = queryParams({ id: "string" });
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!id || !uuidRe.test(id)) {
    qs("#ticket-host").innerHTML = errorStateHTML({
      title: "Booking not specified",
      message: "Open this page from My Bookings.",
      retry: false,
    });
    return;
  }
  await loadBooking(id);
}

main();
