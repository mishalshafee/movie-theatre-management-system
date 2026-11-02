/**
 * Checkout page.
 *
 * Flow (mirrors the documented customer journey):
 *   1. Read the seat selection made on seat-selection.html (sessionStorage).
 *   2. Re-fetch the live seat map and re-validate each seat (availability +
 *      prices straight from the backend).
 *   3. "Reserve seats" → POST /api/bookings → 10-minute hold created by the
 *      backend; countdown runs from the returned `expiresAt` timestamp only.
 *   4. "Pay now" → POST /api/bookings/:id/pay (demo payment, no card data).
 *   5. On success → booking-details.html?id=…
 *
 * If the visitor reloads with an existing unexpired hold for this showtime,
 * that hold is resumed instead of silently creating another one.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl, navigate, queryParams } from "../core/router-helpers.js";
import { getSeatMap } from "../services/showtimes.service.js";
import { createBooking, payBooking, listMyBookings, getBooking } from "../services/bookings.service.js";
import { setButtonLoading, errorStateHTML } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { toast } from "../components/toast.js";
import { qs, clear, escapeHtml } from "../utils/dom.js";
import { formatMoney, formatBookingStatus } from "../utils/formatters.js";
import { formatTime, formatDate, formatCountdown, secondsUntil } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const state = {
  showtimeId: null,
  selection: null,   // { seats: [...] } from sessionStorage
  seatMap: null,
  booking: null,     // active hold (after POST /bookings)
  countdownTimer: null,
  paying: false,
};

/* ------------------------------------------------------------------ *
 * Rendering helpers
 * ------------------------------------------------------------------ */

function renderSummary(showtime, seats) {
  const host = qs("#checkout-summary");
  const rows = seats.map((seat) => `
    <div class="summary-row">
      <span class="summary-seat">${escapeHtml(seat.rowLabel ?? `Seat ${seat.number}`)}</span>
      <span class="summary-type type-${seat.type}">${escapeHtml(seat.type)}</span>
      <span class="summary-price">${formatMoney(seat.price)}</span>
    </div>`).join("");

  const total = seats.reduce((sum, s) => sum + Number(s.price || 0), 0);
  host.innerHTML = `
    <div class="summary-movie">
      <div class="summary-movie__icon" aria-hidden="true">${icons.film({ size: 22 })}</div>
      <div>
        <h3 class="summary-movie__title">${escapeHtml(showtime.movie.title)}</h3>
        <p class="summary-movie__meta">${formatDate(showtime.startsAt)} · ${formatTime(showtime.startsAt)} · ${escapeHtml(showtime.screen.name)}</p>
      </div>
    </div>
    <div class="summary-rows">${rows}</div>
    <div class="summary-total">
      <span>Total (${seats.length} seat${seats.length === 1 ? "" : "s"})</span>
      <strong data-total>${formatMoney(total)}</strong>
    </div>
    <p class="summary-note">${icons.info({ size: 14 })} The final total is calculated by the cinema backend.</p>`;
}

function renderHoldPanel(booking) {
  const panel = qs("#hold-panel");
  panel.hidden = false;
  qs("#reserve-step").hidden = true;

  qs("#hold-code").textContent = booking.code;
  qs("#hold-status").innerHTML = `<span class="status-chip status-chip--held">${formatBookingStatus(booking.status)}</span>`;
  renderHoldSeats(booking.seats);
  startCountdown(booking.expiresAt);
}

function renderHoldSeats(seats) {
  const host = qs("#hold-seats");
  host.innerHTML = (seats || [])
    .map((s) => `<span class="seat-chip">${escapeHtml(`${s.row}${s.number}`)}<em>${formatMoney(s.price)}</em></span>`)
    .join("");
  qs("#hold-total").textContent = formatMoney(booking_total());
  function booking_total() {
    return (seats || []).reduce((sum, s) => sum + Number(s.price || 0), 0);
  }
}

function startCountdown(expiresAt) {
  stopCountdown();
  const display = qs("#hold-countdown");
  const ring = qs("#hold-ring");

  const tick = () => {
    const seconds = secondsUntil(expiresAt);
    display.textContent = formatCountdown(seconds);
    const totalWindow = 10 * 60;
    const fraction = Math.min(1, seconds / totalWindow);
    ring.style.setProperty("--hold-fraction", String(fraction));
    display.classList.toggle("is-urgent", seconds <= 120 && seconds > 0);

    if (seconds <= 0) {
      stopCountdown();
      onHoldExpired();
      return;
    }
  };
  tick();
  state.countdownTimer = setInterval(tick, 1000);
}

function stopCountdown() {
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
}

function onHoldExpired() {
  const box = qs("#payment-box");
  box.innerHTML = `
    <div class="hold-expired" role="alert">
      <h4>${icons.alert({ size: 18 })} Your seat hold expired</h4>
      <p>The seats were released back to the pool. Choose your seats again to continue.</p>
      <button type="button" class="btn btn--primary" id="expired-back">Back to seat selection</button>
    </div>`;
  qs("#expired-back").addEventListener("click", () => {
    navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(state.showtimeId)}`);
  });
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

async function reserveSeats() {
  const button = qs("#reserve-btn");
  const seats = state.selection.seats.map((s) => s.id);

  setButtonLoading(button, true, "Reserving…");
  try {
    const booking = await createBooking({ showtimeId: state.showtimeId, seatIds: seats });
    state.booking = booking;
    toast.success(`Seats held for you — booking ${booking.code}`);
    renderHoldPanel(booking);
  } catch (error) {
    setButtonLoading(button, false);
    handleBookingError(error);
  }
}

function handleBookingError(error) {
  if (error.code === "SEAT_UNAVAILABLE") {
    toast.error("One or more of your seats were just taken by another customer. The seat map has been refreshed — please choose again.");
    navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(state.showtimeId)}`);
    return;
  }
  if (error.code === "SHOWTIME_STARTED") {
    toast.error("This showtime has already started and can no longer be booked.");
    navigate(`${PAGES.movieDetails}?id=${state.seatMap?.showtime?.movie?.id ?? ""}`);
    return;
  }
  if (error.code === "UNAUTHORIZED") {
    toast.info("Please sign in to reserve your seats.");
    navigate(`${PAGES.login}?next=${encodeURIComponent(`checkout.html?showtime=${state.showtimeId}`)}`);
    return;
  }
  toast.error(friendlyMessage(error));
}

async function payNow() {
  if (!state.booking || state.paying) return;
  const button = qs("#pay-btn");
  state.paying = true;
  setButtonLoading(button, true, "Processing payment…");

  try {
    const paid = await payBooking(state.booking.id);
    // Trust only the backend's status.
    if (paid && paid.status === "confirmed") {
      stopCountdown();
      toast.success("Payment successful — enjoy the movie!");
      setTimeout(() => navigate(`${PAGES.bookingDetails}?id=${encodeURIComponent(state.booking.id)}`), 700);
    } else {
      throw { code: "BOOKING_NOT_PAYABLE", message: "Unexpected booking status after payment." };
    }
  } catch (error) {
    state.paying = false;
    setButtonLoading(button, false);
    if (error.code === "HOLD_EXPIRED") {
      // Backend released the seats; refresh booking state and inform the customer.
      toast.error("Your hold expired just before payment. Please choose your seats again.");
      onHoldExpired();
      return;
    }
    if (error.code === "BOOKING_NOT_PAYABLE") {
      toast.error("This booking can no longer be paid. Let's check its current status.");
      try {
        const fresh = await getBooking(state.booking.id);
        state.booking = fresh;
        renderHoldPanel(fresh);
      } catch { onHoldExpired(); }
      return;
    }
    toast.error(friendlyMessage(error));
  }
}

/* ------------------------------------------------------------------ *
 * Boot
 * ------------------------------------------------------------------ */

async function findResumableHold() {
  try {
    const { data } = await listMyBookings({ page: 1, limit: 50 });
    return data.find(
      (b) =>
        b.showtime?.id === state.showtimeId &&
        b.status === "held" &&
        b.expiresAt &&
        new Date(b.expiresAt).getTime() > Date.now()
    ) || null;
  } catch {
    return null;
  }
}

async function main() {
  const { user, ok } = await initPage({ auth: "user" });
  if (!ok) return; // guard redirected to login
  const { showtime } = queryParams({ showtime: "string" });

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const host = qs("#checkout-host");
  if (!showtime || !uuidRe.test(showtime)) {
    host.innerHTML = errorStateHTML({
      title: "Nothing to check out",
      message: "Open checkout from a seat selection step.",
      retry: false,
    });
    return;
  }
  state.showtimeId = showtime;

  // Restore the customer's seat selection.
  let selection = null;
  try {
    const raw = sessionStorage.getItem("cinelux:seat-selection");
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.showtimeId === state.showtimeId) selection = parsed;
    }
  } catch { /* corrupted storage — treat as no selection */ }

  // Resume an existing unexpired hold if the page was reloaded.
  const resumable = await findResumableHold();
  if (resumable) {
    state.booking = resumable;
    try {
      const map = await getSeatMap(state.showtimeId);
      state.seatMap = map;
      renderSummary(map.showtime, resumable.seats);
    } catch { /* summary stays simple */ }
    renderHoldPanel(resumable);
    toast.info("Welcome back — your seat hold is still active.");
    qs("#pay-btn").addEventListener("click", payNow);
    return;
  }

  if (!selection || !selection.seats?.length) {
    host.innerHTML = errorStateHTML({
      title: "No seats selected",
      message: "Choose your seats first, then continue to checkout.",
      retryLabel: "Find a movie",
      retry: false,
    });
    qs("#checkout-actions").insertAdjacentHTML(
      "afterbegin",
      `<a class="btn btn--primary" href="${resolveUrl(PAGES.movies)}">Browse movies</a>`
    );
    return;
  }
  state.selection = selection;

  // Validate the selection against the live seat map (fresh statuses + prices).
  try {
    const map = await getSeatMap(state.showtimeId);
    state.seatMap = map;
    const flat = new Map();
    map.rows.forEach((row) => row.seats.forEach((seat) => flat.set(seat.id, { ...seat, rowLabel: row.label })));

    const fresh = [];
    let conflict = false;
    for (const chosen of selection.seats) {
      const live = flat.get(chosen.id);
      if (!live || live.status !== "available") { conflict = true; break; }
      fresh.push({ ...live, price: Number(live.price) });
    }

    if (conflict || !fresh.length) {
      toast.error("Some of your selected seats are no longer available. Please choose again.");
      navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(state.showtimeId)}`);
      return;
    }
    state.selection.seats = fresh; // adopt authoritative prices/statuses
    renderSummary(map.showtime, fresh);
  } catch (error) {
    host.innerHTML = errorStateHTML({
      title: "Could not verify your seats",
      message: friendlyMessage(error),
    });
    return;
  }

  if (!user) return; // defensive: guard already handled this

  qs("#reserve-btn").addEventListener("click", reserveSeats);
  qs("#pay-btn").addEventListener("click", payNow);
}

main();
