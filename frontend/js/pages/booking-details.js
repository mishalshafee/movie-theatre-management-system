/**
 * Booking details — the CineLux digital ticket.
 *
 * A premium ticket is rendered only for `confirmed` bookings (status is
 * verified from the backend). Held bookings show the countdown and route
 * to checkout to complete the demo payment; expired/cancelled bookings get
 * clear recovery states. Print / Save-as-PDF use the browser print dialog
 * with a dedicated print stylesheet.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl, navigate, queryParams } from "../core/router-helpers.js";
import { getBooking, cancelBooking } from "../services/bookings.service.js";
import { setButtonLoading, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { toast } from "../components/toast.js";
import { confirmDialog } from "../components/modal.js";
import { qs, clear, escapeHtml } from "../utils/dom.js";
import { formatMoney, formatBookingStatus, formatSeats } from "../utils/formatters.js";
import { formatDateTime, formatTime, formatDate, formatCountdown, secondsUntil } from "../utils/date-time.js";
import { icons, logoMark } from "../components/icons.js";
import { posterElement } from "../components/movie-card.js";
import { getDemoPayment } from "../payments/payment-methods.js";

const state = { booking: null, timer: null, user: null };

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusClass(status) {
  return {
    held: "status-chip--held",
    confirmed: "status-chip--confirmed",
    used: "status-chip--used",
    cancelled: "status-chip--cancelled",
    expired: "status-chip--expired",
  }[status] || "";
}

/* ------------------------------------------------------------------ *
 * Decorative QR-style block — deterministic pattern from the booking
 * code. Explicitly NOT a scannable validation token.
 * ------------------------------------------------------------------ */

function qrDecoHTML(code) {
  const N = 9;
  let hash = 0;
  for (const ch of String(code || "CINELUX")) {
    hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  }
  const rand = () => {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    return hash / 0xFFFFFFFF;
  };
  const filled = new Set();
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const inFinderTL = r < 3 && c < 3;
      const inFinderBR = r >= N - 3 && c >= N - 3;
      const inFinderTR = r < 3 && c >= N - 3;
      if (inFinderTL || inFinderBR || inFinderTR) continue;
      if (rand() > 0.52) filled.add(`${r}:${c}`);
    }
  }
  let cells = "";
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const finder = (r === 0 || r === 2 || r === N - 1 || r === N - 3) && false;
      const isFinderCell =
        (r < 3 && c < 3) || (r < 3 && c >= N - 3) || (r >= N - 3 && c >= N - 3);
      if (isFinderCell) continue;
      cells += `<i class="${filled.has(`${r}:${c}`) ? "f" : ""}"></i>`;
    }
  }
  return `
    <div class="qr-deco" aria-hidden="true">
      <span class="finder" style="grid-row:1/4;grid-column:1/4;"></span>
      <span class="finder" style="grid-row:1/4;grid-column:${N - 2}/${N + 1};"></span>
      <span class="finder" style="grid-row:${N - 2}/${N + 1};grid-column:${N - 2}/${N + 1};"></span>
      ${cells}
    </div>
    <p class="qr-deco__caption">Decorative pattern · not a validation token</p>`;
}

/* ------------------------------------------------------------------ *
 * Ticket rendering
 * ------------------------------------------------------------------ */

function paymentInfoHTML(booking) {
  const demo = getDemoPayment();
  const isCash = demo?.method === "cash";
  const methodLabel = demo?.label
    ? `${demo.label} – Demo`
    : "Demo payment";
  const statusLabel = isCash
    ? "Demo Reservation Confirmation — no cash was collected"
    : "Demo Confirmation — no real transaction occurred";

  return `
    <div class="ticket__payment-note">
      ${icons.shield({ size: 16 })}
      <span><strong>Payment Method:</strong> ${escapeHtml(methodLabel)}<br>
      <strong>Payment Status:</strong> ${escapeHtml(statusLabel)}${demo?.label ? "" : " (method recorded per browser session)"}</span>
    </div>`;
}

function ticketHTML(booking) {
  const status = booking.status;
  const seats = booking.seats || [];
  const showtime = booking.showtime || {};
  const customerName = state.user?.role === "customer" ? state.user.fullName : (state.user?.fullName ?? null);

  const infoRows = [
    ["Booking reference", booking.code],
    ["Customer", customerName || "CineLux guest"],
    ["Showtime", `${formatDate(showtime.startsAt)} · ${formatTime(showtime.startsAt)}`],
    ["Screen", showtime.screen?.name ?? "—"],
    ["Seats", formatSeats(seats)],
    ["Booked on", formatDateTime(booking.createdAt)],
    ["Paid on", booking.paidAt ? formatDateTime(booking.paidAt) : "—"],
  ];

  return `
    <article class="ticket ticket-entrance" id="ticket">
      <div class="ticket__main">
        <div class="ticket__brand-row">
          <a class="brand" href="${resolveUrl(PAGES.home)}">${logoMark(32)}<span class="brand__name">Cine<strong>Lux</strong></span></a>
          <span class="ticket__badge status-chip ${statusClass(status)}">${formatBookingStatus(status)}</span>
        </div>

        <div class="ticket__movie">
          <div class="ticket__poster-frame" id="ticket-poster"></div>
          <div>
            <h2 class="ticket__title">${escapeHtml(showtime.movie?.title ?? "Movie")}</h2>
            <div class="ticket__when">
              <span class="meta-chip">${icons.calendar({ size: 13 })} ${formatDate(showtime.startsAt)}</span>
              <span class="meta-chip">${icons.clock({ size: 13 })} ${formatTime(showtime.startsAt)}</span>
              <span class="meta-chip">${icons.screen({ size: 13 })} ${escapeHtml(showtime.screen?.name ?? "")}</span>
            </div>
            <div class="seat-chips" style="margin-top:0.9rem;">
              ${seats.map((s) => `<span class="seat-chip">${escapeHtml(`${s.row}${s.number}`)}<em>${formatMoney(s.price)}</em></span>`).join("")}
            </div>
          </div>
        </div>

        <dl class="ticket__info">
          ${infoRows.map(([label, value]) => `
            <div class="ticket__info-row"><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
        </dl>

        ${status === "confirmed" ? paymentInfoHTML(booking) : ""}
      </div>

      <div class="ticket__perf" aria-hidden="true"></div>

      <div class="ticket__stub">
        <span class="ticket__stub-label">CineLux admit</span>
        <div class="ticket__stub-visual">
          ${qrDecoHTML(booking.code)}
        </div>
        <div class="ticket__code-wrap">
          <span class="ticket__code-label">Booking code</span>
          <div class="ticket__code">${escapeHtml(booking.code)}</div>
        </div>
        <div class="ticket__total">
          <span>${status === "confirmed" ? "Total paid (demo)" : "Total"}</span>
          <strong>${formatMoney(booking.total)}</strong>
        </div>
        <p class="ticket__print-note">Demo ticket · show the booking reference at the box office</p>
      </div>
    </article>`;
}

function renderBanner(booking) {
  const host = qs("#ticket-banner");
  const params = new URLSearchParams(location.search);

  if (booking.status === "confirmed" && params.get("paid") === "1") {
    host.innerHTML = `
      <div class="pay-success" style="border:1px solid rgba(52,211,153,.35); border-radius:var(--radius-lg); background:var(--success-soft);">
        <div class="pay-success-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m4 12.5 5 5L20 6.5"/></svg>
        </div>
        <h3 class="pay-success__title">Demo payment confirmed</h3>
        <p class="pay-success__text">Your seats are booked. No real money was charged or collected.</p>
      </div>`;
  } else {
    host.innerHTML = "";
  }
}

/* ------------------------------------------------------------------ *
 * Actions per status
 * ------------------------------------------------------------------ */

function renderActions(booking) {
  const bar = qs("#ticket-actions");
  clear(bar);

  if (booking.status === "held") {
    const expired = !booking.expiresAt || new Date(booking.expiresAt).getTime() <= Date.now();
    if (!expired) {
      bar.insertAdjacentHTML("beforeend", `
        <div class="ticket-pay" id="ticket-pay">
          <h3 class="ticket-pay__title">${icons.clock({ size: 16 })} Seats held — expires in <strong id="ticket-countdown" style="font-family:var(--font-mono)">${formatCountdown(secondsUntil(booking.expiresAt))}</strong></h3>
          <p class="text-2" style="font-size:var(--fs-sm)">Complete your demo payment before the hold releases the seats.</p>
          <div class="ticket-pay__row">
            <a class="btn btn--primary btn--lg" href="${resolveUrl(`${PAGES.checkout}?showtime=${encodeURIComponent(booking.showtime?.id ?? "")}`)}">
              ${icons.card({ size: 17 })} Complete payment
            </a>
            <button type="button" class="btn btn--danger" data-cancel>Cancel booking</button>
          </div>
        </div>`);
      state.timer = setInterval(() => {
        const seconds = secondsUntil(booking.expiresAt);
        const node = qs("#ticket-countdown");
        if (!node) { clearInterval(state.timer); return; }
        node.textContent = formatCountdown(seconds);
        node.classList.toggle("is-urgent", seconds <= 120);
        if (seconds <= 0) {
          clearInterval(state.timer);
          toast.warning("Your seat hold expired.");
          loadBooking(booking.id, true);
        }
      }, 1000);
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
    const print = document.createElement("button");
    print.type = "button";
    print.className = "btn btn--primary";
    print.innerHTML = `${icons.printer({ size: 16 })} Print ticket`;
    print.addEventListener("click", () => window.print());

    const pdf = document.createElement("button");
    pdf.type = "button";
    pdf.className = "btn btn--secondary";
    pdf.innerHTML = `${icons.download({ size: 16 })} Save as PDF`;
    pdf.addEventListener("click", () => {
      toast.info("Choose “Save as PDF” as the printer destination in the print dialog.");
      setTimeout(() => window.print(), 450);
    });

    const bookings = document.createElement("a");
    bookings.className = "btn btn--ghost";
 bookings.href = resolveUrl(PAGES.myBookings);
    bookings.innerHTML = `${icons.ticket({ size: 16 })} My Bookings`;

    const home = document.createElement("a");
    home.className = "btn btn--ghost";
    home.href = resolveUrl(PAGES.home);
    home.innerHTML = `${icons.home({ size: 16 })} Back to Home`;

    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn btn--danger";
    cancel.textContent = "Cancel booking";
    cancel.dataset.cancel = booking.id; // handled by the delegated listener in main()

    bar.append(print, pdf, bookings, home, cancel);
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

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

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

    const posterHost = qs("#ticket-poster");
    if (posterHost) posterHost.append(posterElement(booking.showtime?.movie?.posterUrl, booking.showtime?.movie?.title ?? "", "ticket__poster-frame"));

    renderBanner(booking);
    renderActions(booking);
  } catch (error) {
    clear(host);
    host.innerHTML = error.status === 404
      ? emptyStateHTML({ icon: "ticket", title: "Booking not found", message: "Check the link or sign in with the account that made this booking.", actionLabel: "My bookings", actionHref: PAGES.myBookings })
      : errorStateHTML({ message: friendlyMessage(error) });
    qs("#ticket-actions").innerHTML = "";
  }
}

async function main() {
  const { user, ok } = await initPage({ auth: "user" });
  if (!ok || !user) return;
  state.user = user;

  const { id } = queryParams({ id: "string" });
  if (!id || !uuidRe.test(id)) {
    qs("#ticket-host").innerHTML = errorStateHTML({
      title: "Booking not specified",
      message: "Open this page from My Bookings.",
      retry: false,
    });
    return;
  }
  await loadBooking(id);

  // Delegate dynamically added cancel buttons
  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cancel]");
    if (btn && state.booking) cancelCurrent(state.booking);
  });
}

main();
