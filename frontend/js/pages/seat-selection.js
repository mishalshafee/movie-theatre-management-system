/**
 * Seat selection page.
 *
 * Data comes from GET /api/showtimes/:id/seats. Every seat's price and
 * status is taken verbatim from the backend — the frontend never invents
 * prices or availability. Maximum 8 seats per booking (backend rule).
 *
 * Selection is handed to checkout via sessionStorage (booking data only —
 * never tokens).
 */

import { initPage } from "../core/session.js";
import { PAGES, RULES } from "../config.js";
import { resolveUrl, navigate, queryParams } from "../core/router-helpers.js";
import { getSeatMap } from "../services/showtimes.service.js";
import { skeletonHTML, errorStateHTML } from "../components/loader.js";
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
          <span class="dot">·</span> Premium <strong>${formatMoney(showtime.pricePremium)}</strong>
        </p>
      </div>
    </div>`;
}

function seatButton(seat) {
  const btn = el("button", {
    type: "button",
    class: `seat seat--${seat.type}`,
    dataset: { seatId: seat.id, status: seat.status },
    "aria-label": `Seat ${seat.rowLabel ?? ""}${seat.number}, ${seat.type}, ${seat.status}`,
    title: `Row seat ${seat.number} · ${seat.type} · ${formatMoney(seat.price)}`,
  });
  btn.textContent = String(seat.number);

  if (seat.status !== "available") {
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");
    if (seat.status === "sold") btn.classList.add("seat--sold");
    if (seat.status === "held") btn.classList.add("seat--held");
    return btn;
  }

  btn.addEventListener("click", () => toggleSeat(seat, btn));
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
      return;
    }
    state.selected.set(seat.id, seat);
    btn.classList.add("seat--selected");
    btn.setAttribute("aria-pressed", "true");
  }
  updateSummary();
}

function renderSeatMap(data) {
  const host = qs("#seatmap-host");
  clear(host);

  const auditorium = el("div", { class: "auditorium" });
  auditorium.append(
    el("div", { class: "cinema-screen", role: "presentation" }, [
      el("div", { class: "cinema-screen__curve" }),
      el("span", { class: "cinema-screen__label", text: "Screen" }),
    ])
  );

  const map = el("div", { class: "seat-map", role: "group", "aria-label": "Seat map" });
  data.rows.forEach((row) => {
    const rowEl = el("div", { class: "seat-row" });
    rowEl.append(el("span", { class: "seat-row__label", "aria-hidden": "true", text: row.label }));
    row.seats.forEach((seat) => rowEl.append(seatButton({ ...seat, rowLabel: row.label })));
    rowEl.append(el("span", { class: "seat-row__label", "aria-hidden": "true", text: row.label }));
    map.append(rowEl);
  });

  auditorium.append(map);
  host.append(auditorium);
}

function renderLegend() {
  const legend = qs("#seat-legend");
  legend.innerHTML = `
    <span class="legend-item"><span class="legend-dot legend-dot--available"></span>Available</span>
    <span class="legend-item"><span class="legend-dot legend-dot--selected"></span>Selected</span>
    <span class="legend-item"><span class="legend-dot legend-dot--held"></span>Held</span>
    <span class="legend-item"><span class="legend-dot legend-dot--sold"></span>Sold</span>
    <span class="legend-item"><span class="legend-dot legend-dot--premium"></span>Premium</span>
  `;
}

function updateSummary() {
  const bar = qs("#continue-bar");
  const summary = qs("#selection-summary");
  const seats = [...state.selected.values()];
  const total = seats.reduce((sum, s) => sum + Number(s.price || 0), 0);

  summary.hidden = seats.length === 0;
  bar.hidden = false;

  qs("#summary-count").textContent = String(seats.length);
  qs("#summary-seats").textContent = seats.length
    ? seats.map((s) => s.rowLabel ?? s.number).join(", ")
    : "No seats selected yet";

  const totalEl = qs("#summary-total");
  const previous = Number(totalEl.dataset.value || 0);
  if (previous !== total) {
    totalEl.classList.remove("total-pop");
    void totalEl.offsetWidth; // restart animation
    totalEl.classList.add("total-pop");
  }
  totalEl.dataset.value = String(total);
  totalEl.textContent = formatMoney(total);

  qs("#continue-btn").disabled = seats.length === 0;
  qs("#continue-count-label").textContent = seats.length
    ? `${seats.length} seat${seats.length === 1 ? "" : "s"} selected`
    : "No seats selected";
  qs("#continue-total-label").textContent = seats.length
    ? `${seats.map((s) => `${s.rowLabel ?? s.number}`).join(", ")} · total ${formatMoney(total)}`
    : "Select at least one seat to continue";
}

/* ------------------------------------------------------------------ */

function persistAndContinue() {
  const seats = [...state.selected.values()];
  if (!seats.length) return;

  // Keep only the data checkout actually needs.
  const selection = {
    showtimeId: state.showtimeId,
    seats: seats.map((s) => ({ id: s.id, number: s.number, type: s.type, price: Number(s.price), status: s.status })),
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
