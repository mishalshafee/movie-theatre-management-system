/**
 * Seat selection page.
 *
 * Data comes from GET /api/showtimes/:id/seats. Every seat's price and
 * status is taken verbatim from the backend — the frontend never invents
 * prices or availability. Maximum 8 seats per booking (backend rule).
 *
 * Selection is handed to checkout via sessionStorage (booking data only —
 * never tokens). A manual refresh button re-syncs availability.
 */

import { initPage } from "../core/session.js";
import { PAGES, RULES } from "../config.js";
import { resolveUrl, navigate, queryParams } from "../core/router-helpers.js";
import { getSeatMap } from "../services/showtimes.service.js";
import { posterElement } from "../components/movie-card.js";
import { skeletonHTML, errorStateHTML, setButtonLoading } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { toast } from "../components/toast.js";
import { qs, clear, escapeHtml, el } from "../utils/dom.js";
import { formatMoney, formatDuration, formatRating } from "../utils/formatters.js";
import { formatTime, formatDate, isPast } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const state = {
  showtimeId: null,
  seatMap: null,          // raw API response
  selected: new Map(),    // seatId -> seat object
};

const MAX_SEATS = RULES.MAX_SEATS_PER_BOOKING;

/* ------------------------------------------------------------------ */

async function loadSeatMap() {
  const host = qs("#seatmap-host");
  const summary = qs("#selection-summary");
  clear(host);
  host.innerHTML = skeletonHTML("seatmap");
  summary.hidden = true;

  try {
    const data = await getSeatMap(state.showtimeId);
    state.seatMap = data;
    state.selected.clear();
    renderHeader(data.showtime);
    renderSeatMap(data);
    renderLegend();
    updateSummary();

    if (isPast(data.showtime.startsAt)) {
      clear(host);
      host.innerHTML = errorStateHTML({
        title: "This showtime has already started",
        message: "Bookings are closed for this screening. Please choose a future showtime.",
        retry: false,
      });
      qs("#continue-bar").hidden = true;
    }
  } catch (error) {
    clear(host);
    host.innerHTML = errorStateHTML({
      title: error.status === 404 ? "Showtime not found" : "Could not load the seat map",
      message: friendlyMessage(error),
    });
    qs("#continue-bar").hidden = true;
  }
}

function renderHeader(showtime) {
  const host = qs("#showtime-header");
  host.innerHTML = `
    <div class="showtime-header" data-reveal>
      <div class="showtime-header__info">
        <a class="back-link" href="${resolveUrl(`${PAGES.movieDetails}?id=${encodeURIComponent(showtime.movie.id)}`)}">
          ${icons.chevronLeft({ size: 15 })} Back to movie
        </a>
        <h1 class="showtime-header__title">${escapeHtml(showtime.movie.title)}</h1>
        <div class="showtime-header__meta">
          <span class="meta-chip">${icons.calendar({ size: 14 })} ${formatDate(showtime.startsAt)}</span>
          <span class="meta-chip">${icons.clock({ size: 14 })} ${formatTime(showtime.startsAt)}</span>
          <span class="meta-chip">${icons.screen({ size: 14 })} ${escapeHtml(showtime.screen.name)}</span>
          ${showtime.movie.rating ? `<span class="meta-chip meta-chip--plain">${icons.star({ size: 13 })} ${formatRating(showtime.movie.rating)}</span>` : ""}
          <span class="meta-chip meta-chip--plain">${formatDuration(showtime.movie.durationMinutes)}</span>
        </div>
        <p class="showtime-header__prices">
          Standard <strong>${formatMoney(showtime.priceStandard)}</strong>
          <span class="dot-sep">·</span> Premium <strong>${formatMoney(showtime.pricePremium)}</strong>
        </p>
      </div>
      <button type="button" class="btn btn--ghost btn--sm" id="refresh-seatmap" title="Refresh availability">
        ${icons.refresh({ size: 15 })} Refresh
      </button>
    </div>`;
  qs("#refresh-seatmap").addEventListener("click", () => {
    toast.info("Refreshing seat availability…");
    loadSeatMap();
  });
}

/* ------------------------------------------------------------------ */

function seatButton(seat, rowLabel) {
  const btn = el("button", {
    type: "button",
    class: `seat seat--${seat.type}`,
    dataset: { seatId: seat.id },
    "aria-label": `Seat ${rowLabel}${seat.number}, ${seat.type}, ${seat.status}`,
    "aria-pressed": "false",
    "data-tip": `${rowLabel}${seat.number} · ${seat.type} · ${formatMoney(seat.price)}`,
  });
  btn.textContent = String(seat.number);

  if (seat.status !== "available") {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    if (seat.status === "sold") btn.classList.add("seat--sold");
    if (seat.status === "held") btn.classList.add("seat--held");
    return btn;
  }

  btn.addEventListener("click", () => toggleSeat({ ...seat, rowLabel }, btn));
  return btn;
}

function toggleSeat(seat, btn) {
  if (state.selected.has(seat.id)) {
    state.selected.delete(seat.id);
    btn.classList.remove("seat--selected");
    btn.setAttribute("aria-pressed", "false");
  } else {
    if (state.selected.size >= MAX_SEATS) {
      toast.warning(`You can select up to ${MAX_SEATS} seats per booking.`);
      btn.animate?.(
        [{ transform: "translateX(0)" }, { transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "translateX(0)" }],
        { duration: 240 },
      );
      return;
    }
    state.selected.set(seat.id, seat);
    btn.classList.add("seat--selected");
    btn.classList.add("animate-pop");
    btn.setAttribute("aria-pressed", "true");
  }
  updateSummary();
}

function renderSeatMap(data) {
  const host = qs("#seatmap-host");
  clear(host);

  const map = el("div", { class: "seat-map-wrap" });
  const grid = el("div", { class: "seat-map", role: "group", "aria-label": "Seat map" });

  let previousWasPremium = null;
  data.rows.forEach((row) => {
    const isPremium = row.seats.every((s) => s.type === "premium");
    const rowEl = el("div", { class: `seat-row${isPremium ? " seat-row--premium" : ""}${previousWasPremium !== null && isPremium !== previousWasPremium ? " seat-row--section-break" : ""}` });
    previousWasPremium = isPremium;
    rowEl.append(el("span", { class: "seat-row__label", "aria-hidden": "true", text: row.label }));
    row.seats.forEach((seat) => rowEl.append(seatButton(seat, row.label)));
    rowEl.append(el("span", { class: "seat-row__label", "aria-hidden": "true", text: row.label }));
    grid.append(rowEl);
  });

  map.append(grid);
  host.append(map);
}

function renderLegend() {
  const legend = qs("#seat-legend");
  legend.innerHTML = `
    <span class="legend-item"><span class="legend-dot"></span>Available</span>
    <span class="legend-item"><span class="legend-dot legend-dot--selected"></span>Selected</span>
    <span class="legend-item"><span class="legend-dot legend-dot--premium"></span>Premium row</span>
    <span class="legend-item"><span class="legend-dot legend-dot--held"></span>Held by another guest</span>
    <span class="legend-item"><span class="legend-dot legend-dot--sold"></span>Sold</span>`;
}

/* ------------------------------------------------------------------ */

function updateSummary() {
  const bar = qs("#continue-bar");
  const summary = qs("#selection-summary");
  const seats = [...state.selected.values()];
  const total = seats.reduce((sum, s) => sum + Number(s.price || 0), 0);

  bar.hidden = false;
  summary.hidden = seats.length === 0;

  const showtime = state.seatMap?.showtime;

  if (seats.length && showtime) {
    summary.innerHTML = `
      <div class="selection-summary__movie">
        <div class="selection-summary__poster" id="summary-poster"></div>
        <div>
          <h3 class="selection-summary__title">${escapeHtml(showtime.movie.title)}</h3>
          <div class="selection-summary__meta">
            <span class="selection-summary__meta-row">${icons.calendar({ size: 13 })} ${formatDate(showtime.startsAt)}</span>
            <span class="selection-summary__meta-row">${icons.clock({ size: 13 })} ${formatTime(showtime.startsAt)} · ${escapeHtml(showtime.screen.name)}</span>
          </div>
        </div>
      </div>
      <div class="seat-chips" aria-live="polite">
        ${seats.map((s) => `<span class="seat-chip">${escapeHtml(`${s.rowLabel}${s.number}`)}<em>${formatMoney(s.price)}</em></span>`).join("")}
      </div>
      <div class="summary-total">
        <span>${seats.length} seat${seats.length === 1 ? "" : "s"} selected</span>
        <strong data-total>${formatMoney(total)}</strong>
      </div>
      <p class="summary-note">${icons.info({ size: 13 })} Prices come directly from the cinema backend. Seats are held for 10 minutes once you continue to checkout.</p>`;

    const posterHost = qs("#summary-poster");
    if (posterHost) {
      posterHost.append(posterElement(showtime.movie.posterUrl, showtime.movie.title, "selection-summary__poster"));
    }

    // Animated total transition
    const totalEl = summary.querySelector("[data-total]");
    const previous = Number(totalEl.dataset.value || 0);
    if (previous !== total) {
      totalEl.classList.remove("total-pop");
      void totalEl.offsetWidth;
      totalEl.classList.add("total-pop");
    }
    totalEl.dataset.value = String(total);
  }

  // Continue bar
  qs("#continue-btn").disabled = seats.length === 0;
  qs("#continue-seats-label").textContent = seats.length
    ? `${seats.length} seat${seats.length === 1 ? "" : "s"} · ${seats.map((s) => `${s.rowLabel}${s.number}`).join(", ")}`
    : "Select at least one seat to continue";
  qs("#continue-total-label").innerHTML = seats.length
    ? `Total <strong>${formatMoney(total)}</strong> · held 10 min at checkout`
    : "";

  // Max seats progress dots
  const pill = qs("#max-seats-pill");
  pill.innerHTML = `<span class="max-seats-pill__track">${Array.from({ length: MAX_SEATS }, (_, i) =>
    `<span class="max-seats-pill__dot${i < seats.length ? " is-filled" : ""}"></span>`).join("")}</span>
    <span>${seats.length}/${MAX_SEATS}</span>`;
}

/* ------------------------------------------------------------------ */

function persistAndContinue() {
  const seats = [...state.selected.values()];
  if (!seats.length) return;

  // Keep only the data checkout actually needs.
  const selection = {
    showtimeId: state.showtimeId,
    seats: seats.map((s) => ({ id: s.id, row: s.rowLabel, number: s.number, type: s.type, price: Number(s.price), status: s.status })),
    savedAt: Date.now(),
  };
  try {
    sessionStorage.setItem("cinelux:seat-selection", JSON.stringify(selection));
  } catch {
    toast.warning("Seat selection could not be saved for the next step.");
    return;
  }
  navigate(`${PAGES.checkout}?showtime=${encodeURIComponent(state.showtimeId)}`);
}

async function main() {
  await initPage({ auth: "any" });
  const { showtime } = queryParams({ showtime: "string" });

  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!showtime || !uuidRe.test(showtime)) {
    qs("#seatmap-host").innerHTML = errorStateHTML({
      title: "Showtime not specified",
      message: "Open this page from a movie's showtimes list.",
      retry: false,
    });
    qs("#continue-bar").hidden = true;
    return;
  }
  state.showtimeId = showtime;

  qs("#continue-btn").addEventListener("click", persistAndContinue);
  await loadSeatMap();
}

main();
