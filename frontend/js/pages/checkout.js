/**
 * Checkout page — reservation hold + five demo payment methods.
 *
 * Flow (mirrors the backend customer journey):
 *   1. Read the seat selection made on seat-selection.html (sessionStorage).
 *   2. Re-fetch the live seat map and re-validate each seat (availability +
 *      prices straight from the backend).
 *   3. "Reserve seats" → POST /api/bookings → 10-minute hold created by the
 *      backend; the countdown runs ONLY from the returned `expiresAt`.
 *   4. Choose one of five demo methods (card / PayPal / Google Pay /
 *      Apple Pay / cash at counter). After explicit confirmation the page
 *      calls the existing mock endpoint POST /api/bookings/:id/pay.
 *   5. On backend status `confirmed` → booking-details.html?id=…
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
import { posterElement } from "../components/movie-card.js";
import {
  renderMethodSelector,
  renderMethodPanel,
  recordDemoPayment,
  clearDemoPayment,
} from "../payments/payment-methods.js";

const state = {
  showtimeId: null,
  selection: null,     // { seats: [...] } from sessionStorage
  seatMap: null,
  booking: null,       // active hold (after POST /bookings)
  countdownTimer: null,
  paying: false,
  methodId: null,
  panelCtl: null,
};

const HOLD_WINDOW_SECONDS = 10 * 60; // informational only; expiry itself comes from the API

/* ------------------------------------------------------------------ *
 * Rendering — order summary & hold timer
 * ------------------------------------------------------------------ */

function renderSummary(showtime, seats) {
  const host = qs("#order-summary");
  const rows = seats.map((seat) => `
    <div class="order-seat-row">
      <span class="order-seat-row__label">${icons.seat({ size: 15 })} ${escapeHtml(`${seat.row ?? ""}${seat.number}`)}</span>
      <span class="order-seat-row__type order-seat-row__type--${seat.type}">${escapeHtml(seat.type)}</span>
      <span class="order-seat-row__price">${formatMoney(seat.price)}</span>
    </div>`).join("");

  const total = seats.reduce((sum, s) => sum + Number(s.price || 0), 0);

  host.innerHTML = `
    <div class="order-card__head">
      <div class="order-card__poster" id="order-poster"></div>
      <div>
        <h3 class="order-card__title">${escapeHtml(showtime.movie.title)}</h3>
        <div class="order-card__meta">
          <span class="order-card__meta-row">${icons.calendar({ size: 14 })} ${formatDate(showtime.startsAt)}</span>
          <span class="order-card__meta-row">${icons.clock({ size: 14 })} ${formatTime(showtime.startsAt)} · ${escapeHtml(showtime.screen.name)}</span>
        </div>
      </div>
    </div>
    <div class="order-seats">${rows}</div>
    <div class="order-total">
      <span>Total · ${seats.length} seat${seats.length === 1 ? "" : "s"}</span>
      <strong data-total>${formatMoney(total)}</strong>
    </div>
    <p class="summary-note">${icons.info({ size: 13 })} The final total is calculated by the cinema backend.</p>`;

  const posterHost = qs("#order-poster");
  if (posterHost) posterHost.append(posterElement(showtime.movie.posterUrl, showtime.movie.title, "order-card__poster"));
}

function renderHoldTimer(booking) {
  const slot = qs("#hold-timer-slot");
  slot.hidden = false;
  slot.innerHTML = `
    <div class="hold-timer" id="hold-timer" role="timer" aria-label="Reservation countdown">
      <span class="hold-timer__ring" id="hold-ring" style="--hold-fraction:1"></span>
      <div class="hold-timer__body">
        <span class="hold-timer__label">Seats held for you</span>
        <span class="hold-timer__time" id="hold-countdown">--:--</span>
        <span class="hold-timer__note">Booking ${escapeHtml(booking.code)} · ${formatBookingStatus(booking.status)}</span>
      </div>
    </div>`;
  startCountdown(booking.expiresAt);
}

function startCountdown(expiresAt) {
  stopCountdown();
  const display = qs("#hold-countdown");
  const ring = qs("#hold-ring");
  const timerBox = qs("#hold-timer");

  const tick = () => {
    const seconds = secondsUntil(expiresAt);
    display.textContent = formatCountdown(seconds);
    const fraction = Math.min(1, seconds / HOLD_WINDOW_SECONDS);
    ring.style.setProperty("--hold-fraction", String(fraction));
    const urgent = seconds <= 120 && seconds > 0;
    timerBox.classList.toggle("is-urgent", urgent);
    display.classList.toggle("is-urgent", urgent);

    if (seconds <= 0) {
      stopCountdown();
      onHoldExpired();
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
  // Payment is impossible after expiry — swap the panel for a recovery state.
  const payStep = qs("#pay-step");
  const reserveStep = qs("#reserve-step");
  if (payStep) payStep.hidden = true;
  if (reserveStep) reserveStep.hidden = true;
  state.panelCtl?.destroy();

  const panel = qs(".payment-panel");
  const existing = panel.querySelector(".hold-expired");
  if (!existing) {
    panel.insertAdjacentHTML("beforeend", `
      <div class="hold-expired" role="alert">
        <h4>${icons.alert({ size: 18 })} Your seat hold expired</h4>
        <p>The seats were released back to the pool by the cinema backend. Choose your seats again to continue — your booking reference stays in My Bookings.</p>
        <button type="button" class="btn btn--primary" id="expired-back">Back to seat selection</button>
      </div>`);
  }
  qs("#expired-back")?.addEventListener("click", () => {
    navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(state.showtimeId)}`);
  });
}

/* ------------------------------------------------------------------ *
 * Step 1 — Reserve
 * ------------------------------------------------------------------ */

async function reserveSeats() {
  const button = qs("#reserve-btn");
  const seatIds = state.selection.seats.map((s) => s.id);

  setButtonLoading(button, true, "Reserving…");
  try {
    const booking = await createBooking({ showtimeId: state.showtimeId, seatIds });
    state.booking = booking;
    toast.success(`Seats held for you — booking ${booking.code}`);
    enterPayStep(booking);
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
  if (error.code === "INVALID_SEATS") {
    toast.error("Those seats do not belong to this screen. Please choose again.");
    navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(state.showtimeId)}`);
    return;
  }
  if (error.code === "UNAUTHORIZED") {
    toast.info("Please sign in to reserve your seats.");
    navigate(`${PAGES.login}?next=${encodeURIComponent(`checkout.html?showtime=${state.showtimeId}`)}`);
    return;
  }
  toast.error(friendlyMessage(error));
}

/* ------------------------------------------------------------------ *
 * Step 2 — Demo payment
 * ------------------------------------------------------------------ */

function enterPayStep(booking) {
  qs("#reserve-step").hidden = true;
  qs("#pay-step").hidden = false;

  const steps = qs("#payment-steps");
  steps.innerHTML = `<span class="is-current">2 · Demo payment</span>`;

  qs("#hold-code")?.remove();
  renderHoldTimer(booking);

  const methodsHost = qs("#pay-methods");
  const panelHost = qs("#pay-panel");

  renderMethodSelector(methodsHost, state.methodId, (method) => {
    if (state.paying) return; // don't switch mid-payment
    state.methodId = method.id;
    state.panelCtl?.destroy();
    state.panelCtl = renderMethodPanel(panelHost, {
      methodId: method.id,
      amount: Number(booking.total),
      bookingCode: booking.code,
      movieTitle: state.seatMap?.showtime?.movie?.title ?? booking.showtime?.movie?.title ?? "Your movie",
      onConfirm: ({ label }) => confirmDemoPayment(booking, method.id, label),
    });
  });

  // Default-select the first method for discoverability.
  if (!state.methodId && methodsHost.querySelector(".pay-method")) {
    methodsHost.querySelector(".pay-method").click();
  }
}

/**
 * The single place that talks to the payment backend.
 * POST /api/bookings/:id/pay (existing mock endpoint — no payment payload).
 */
async function confirmDemoPayment(booking, methodId, label) {
  if (state.paying) return false;
  state.paying = true;
  clearDemoPayment();

  try {
    const paid = await payBooking(booking.id);
    if (paid && paid.status === "confirmed") {
      recordDemoPayment({ method: methodId, label });
      toast.success("Demo payment confirmed — your ticket is ready!");
      stopCountdown();
      setTimeout(() => {
        navigate(`${PAGES.bookingDetails}?id=${encodeURIComponent(booking.id)}&paid=1`);
      }, 900);
      return true;
    }
    throw { code: "BOOKING_NOT_PAYABLE", message: "Unexpected booking status after payment." };
  } catch (error) {
    state.paying = false;
    if (error.code === "HOLD_EXPIRED") {
      toast.error("Your hold expired just before payment. Please choose your seats again.");
      onHoldExpired();
      return false;
    }
    if (error.code === "BOOKING_NOT_PAYABLE") {
      toast.error("This booking can no longer be paid. Let's check its current status.");
      try {
        const fresh = await getBooking(booking.id);
        state.booking = fresh;
        if (fresh.status === "confirmed") {
          recordDemoPayment({ method: methodId, label });
          navigate(`${PAGES.bookingDetails}?id=${encodeURIComponent(booking.id)}&paid=1`);
          return true;
        }
        enterPayStep(fresh);
      } catch { onHoldExpired(); }
      return false;
    }
    if (error.code === "UNAUTHORIZED" || error.code === "TOKEN_EXPIRED") {
      toast.info("Please sign in again to complete your payment.");
      navigate(`${PAGES.login}?next=${encodeURIComponent(`checkout.html?showtime=${state.showtimeId}`)}`);
      return false;
    }
    toast.error(friendlyMessage(error));
    return false;
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

  // Live seat map — needed for both the summary and hold resumption.
  try {
    const map = await getSeatMap(state.showtimeId);
    state.seatMap = map;
  } catch (error) {
    host.innerHTML = errorStateHTML({
      title: "Could not verify your seats",
      message: friendlyMessage(error),
    });
    return;
  }

  // Resume an existing unexpired hold if the page was reloaded.
  const resumable = await findResumableHold();
  if (resumable) {
    state.booking = resumable;
    state.selection = {
      seats: (resumable.seats || []).map((s) => ({ ...s, row: s.row })),
    };
    renderSummary(state.seatMap.showtime, resumable.seats || []);
    enterPayStep(resumable);
    toast.info("Welcome back — your seat hold is still active.");
    return;
  }

  if (!selection || !selection.seats?.length) {
    host.innerHTML = errorStateHTML({
      title: "No seats selected",
      message: "Choose your seats first, then continue to checkout.",
      retry: false,
    });
    host.querySelector(".empty-state")?.insertAdjacentHTML(
      "afterbegin",
      `<a class="btn btn--primary" href="${resolveUrl(PAGES.movies)}">Browse movies</a>`,
    );
    return;
  }
  state.selection = selection;

  // Validate the selection against the live seat map (fresh statuses + prices).
  const flat = new Map();
  state.seatMap.rows.forEach((row) => row.seats.forEach((seat) => flat.set(seat.id, { ...seat, row: row.label })));

  const fresh = [];
  for (const chosen of selection.seats) {
    const live = flat.get(chosen.id);
    if (!live || live.status !== "available") {
      toast.error("Some of your selected seats are no longer available. Please choose again.");
      navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(state.showtimeId)}`);
      return;
    }
    fresh.push({ ...live, price: Number(live.price) });
  }
  if (!fresh.length) {
    navigate(`${PAGES.seatSelection}?showtime=${encodeURIComponent(state.showtimeId)}`);
    return;
  }

  state.selection.seats = fresh; // adopt authoritative prices/statuses
  renderSummary(state.seatMap.showtime, fresh);
  qs("#reserve-btn").addEventListener("click", reserveSeats);
}

main();
