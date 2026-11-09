/**
 * Admin · Showtime management.
 * Create (movie, screen, date+time → timezone-aware ISO, prices), price-only
 * PATCH, delete, filters (movie / screen / date range) and pagination.
 * The backend computes endsAt (duration + 15-minute buffer) and rejects
 * overlapping schedules (SHOWTIME_OVERLAP) and past start times.
 */

import { initPage } from "../core/session.js";
import { renderAdminShell } from "../components/admin-shell.js";
import { listShowtimes, createShowtime, updateShowtimePrices, deleteShowtime } from "../services/showtimes.service.js";
import { listMovies } from "../services/movies.service.js";
import { listScreens } from "../services/screens.service.js";
import { openModal, confirmDialog } from "../components/modal.js";
import { setButtonLoading, skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { renderPagination } from "../components/pagination.js";
import { toast } from "../components/toast.js";
import { friendlyMessage } from "../core/api.js";
import { validators, validateFields } from "../utils/validators.js";
import { qs, clear, escapeHtml } from "../utils/dom.js";
import { formatMoney, formatDuration } from "../utils/formatters.js";
import { formatDateTime, formatTime, isoFromDateTimeInputs, todayInputValue } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const state = { page: 1, limit: 10, movieId: "", screenId: "", from: "", to: "" };

/* ------------------------------------------------------------------ *
 * Filters + listing
 * ------------------------------------------------------------------ */

async function populateFilters() {
  try {
    const [movies, screens] = await Promise.all([
      listMovies({ page: 1, limit: 50 }),
      listScreens(),
    ]);
    const movieSelect = qs("#filter-movie");
    movies.data.forEach((m) => {
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = m.title;
      movieSelect.append(opt);
    });
    const screenSelect = qs("#filter-screen");
    screens.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.id;
      opt.textContent = s.name;
      screenSelect.append(opt);
    });
  } catch { /* filters stay empty; listing still works */ }
}

async function loadShowtimes() {
  const wrapper = qs("#showtimes-table-wrap");
  wrapper.innerHTML = skeletonHTML("rows", 5);

  try {
    const res = await listShowtimes({
      movieId: state.movieId || undefined,
      screenId: state.screenId || undefined,
      from: state.from ? new Date(`${state.from}T00:00:00`).toISOString() : undefined,
      to: state.to ? new Date(`${state.to}T23:59:59`).toISOString() : undefined,
      page: state.page,
      limit: state.limit,
    });

    clear(wrapper);
    if (!res.data.length) {
      wrapper.innerHTML = emptyStateHTML({
        icon: "calendar",
        title: "No showtimes found",
        message: "Adjust the filters or schedule a new showtime.",
        actionLabel: "Schedule showtime",
      });
      wrapper.querySelector(".btn")?.addEventListener("click", openCreateModal);
      qs("#showtimes-pagination").innerHTML = "";
      return;
    }

    const table = document.createElement("table");
    table.className = "admin-table";
    table.innerHTML = `
      <thead><tr>
        <th scope="col">Movie</th>
        <th scope="col">Screen</th>
        <th scope="col">Starts (local)</th>
        <th scope="col">Standard</th>
        <th scope="col">Premium</th>
        <th scope="col"><span class="sr-only">Actions</span></th>
      </tr></thead>
      <tbody>
        ${res.data.map((st) => `
          <tr>
            <td>
              <div class="admin-table__movie-meta">
                <strong>${escapeHtml(st.movie.title)}</strong>
                <span class="admin-table__sub">${formatDuration(st.movie.durationMinutes)}${st.movie.rating ? ` · ★ ${escapeHtml(st.movie.rating)}` : ""}</span>
              </div>
            </td>
            <td>${escapeHtml(st.screen.name)}</td>
            <td>${escapeHtml(formatDateTime(st.startsAt))}</td>
            <td>${formatMoney(st.priceStandard)}</td>
            <td>${formatMoney(st.pricePremium)}</td>
            <td>
              <div class="table-actions">
                <button type="button" class="icon-button" data-action="prices" data-id="${st.id}"
                  data-std="${st.priceStandard}" data-prem="${st.pricePremium}" data-title="${escapeHtml(st.movie.title)}" aria-label="Edit prices for ${escapeHtml(st.movie.title)}">${icons.edit({ size: 16 })}</button>
                <button type="button" class="icon-button icon-button--danger" data-action="delete" data-id="${st.id}" data-title="${escapeHtml(st.movie.title)}"
                  aria-label="Delete showtime of ${escapeHtml(st.movie.title)}">${icons.trash({ size: 16 })}</button>
              </div>
            </td>
          </tr>`).join("")}
      </tbody>`;
    wrapper.append(table);

    renderPagination(qs("#showtimes-pagination"), res, (page) => {
      state.page = page;
      loadShowtimes();
    });

    wrapper.querySelectorAll('[data-action="prices"]').forEach((btn) => {
      btn.addEventListener("click", () => openPricesModal(btn.dataset.id, Number(btn.dataset.std), Number(btn.dataset.prem), btn.dataset.title));
    });
    wrapper.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener("click", () => removeShowtime(btn.dataset.id, btn.dataset.title));
    });
  } catch (error) {
    clear(wrapper);
    wrapper.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    wrapper.querySelector(".js-retry")?.addEventListener("click", loadShowtimes);
  }
}

/* ------------------------------------------------------------------ *
 * Create modal
 * ------------------------------------------------------------------ */

function createFormHTML(movies, screens) {
  return `
    <form id="showtime-form" class="form" novalidate>
      <div class="form-grid">
        <div class="form-field form-field--full">
          <label class="form-label" for="w-movie">Movie <span class="req">*</span></label>
          <select class="form-select" id="w-movie" name="movieId" required>
            <option value="">Select a movie…</option>
            ${movies.map((m) => `<option value="${m.id}">${escapeHtml(m.title)} (${m.durationMinutes} min)</option>`).join("")}
          </select>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="w-screen">Screen <span class="req">*</span></label>
          <select class="form-select" id="w-screen" name="screenId" required>
            <option value="">Select a screen…</option>
            ${screens.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${s.seatCount} seats)</option>`).join("")}
          </select>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-date">Start date <span class="req">*</span></label>
          <input class="form-input" id="w-date" name="date" type="date" min="${todayInputValue()}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-time">Start time <span class="req">*</span></label>
          <input class="form-input" id="w-time" name="time" type="time" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-std">Standard price ($) <span class="req">*</span></label>
          <input class="form-input" id="w-std" name="priceStandard" type="number" min="0" max="100000" step="0.5" value="12.50" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-prem">Premium price ($) <span class="req">*</span></label>
          <input class="form-input" id="w-prem" name="pricePremium" type="number" min="0" max="100000" step="0.5" value="18.00" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>
      <p class="field-hint">${icons.info({ size: 13 })} The end time is computed by the backend (movie duration + 15-min buffer). Overlapping schedules on the same screen are rejected.</p>
    </form>`;
}

async function openCreateModal() {
  let movies = [];
  let screens = [];
  try {
    const [moviesRes, screensRes] = await Promise.all([
      listMovies({ page: 1, limit: 50 }),
      listScreens(),
    ]);
    movies = moviesRes.data;
    screens = screensRes;
  } catch (error) {
    toast.error(friendlyMessage(error));
    return;
  }

  if (!movies.length || !screens.length) {
    toast.warning("You need at least one movie and one screen before scheduling showtimes.");
    return;
  }

  openModal({
    title: "Schedule a showtime",
    size: "lg",
    content: createFormHTML(movies, screens),
    actions: [
      { label: "Cancel", kind: "ghost" },
      {
        label: "Create showtime",
        kind: "primary",
        closeOnClick: false,
        onClick: async (btn) => {
          const form = qs("#showtime-form");
          const fields = [
            { name: "movieId", value: form.movieId.value, rules: [validators.required("Movie")] },
            { name: "screenId", value: form.screenId.value, rules: [validators.required("Screen")] },
            { name: "date", value: form.date.value, rules: [validators.required("Start date")] },
            { name: "time", value: form.time.value, rules: [validators.required("Start time")] },
            { name: "priceStandard", value: form.priceStandard.value, rules: [validators.numberRange(0, 100000, "Standard price")] },
            { name: "pricePremium", value: form.pricePremium.value, rules: [validators.numberRange(0, 100000, "Premium price")] },
          ];
          const { valid } = validateFields(form, fields);
          if (!valid) return false;

          const startsAt = isoFromDateTimeInputs(form.date.value, form.time.value);
          if (!startsAt || new Date(startsAt).getTime() <= Date.now()) {
            validateFields(form, [{ name: "time", value: "", rules: [() => "Choose a future date and time"] }]);
            return false;
          }

          setButtonLoading(btn, true, "Scheduling…");
          try {
            await createShowtime({
              movieId: form.movieId.value,
              screenId: form.screenId.value,
              startsAt,
              priceStandard: Number(form.priceStandard.value),
              pricePremium: Number(form.pricePremium.value),
            });
            toast.success("Showtime scheduled.");
            await loadShowtimes();
            return true;
          } catch (error) {
            setButtonLoading(btn, false);
            if (error.code === "SHOWTIME_OVERLAP") {
              toast.error("This screen already has a showtime overlapping that period. Pick another time or screen.");
            } else {
              toast.error(friendlyMessage(error));
            }
            return false;
          }
        },
      },
    ],
  });
}

/* ------------------------------------------------------------------ *
 * Prices modal (PATCH supports prices only)
 * ------------------------------------------------------------------ */

function openPricesModal(id, std, prem, title) {
  openModal({
    title: `Edit prices · ${title}`,
    size: "sm",
    content: `
      <form id="prices-form" class="form" novalidate>
        <div class="form-field">
          <label class="form-label" for="p-std">Standard price ($) <span class="req">*</span></label>
          <input class="form-input" id="p-std" name="priceStandard" type="number" min="0" max="100000" step="0.5" value="${std}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="p-prem">Premium price ($) <span class="req">*</span></label>
          <input class="form-input" id="p-prem" name="pricePremium" type="number" min="0" max="100000" step="0.5" value="${prem}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <p class="field-hint">${icons.info({ size: 13 })} The backend supports price updates only — times, movie and screen are fixed once scheduled.</p>
      </form>`,
    actions: [
      { label: "Cancel", kind: "ghost" },
      {
        label: "Save prices",
        kind: "primary",
        closeOnClick: false,
        onClick: async (btn) => {
          const form = qs("#prices-form");
          const fields = [
            { name: "priceStandard", value: form.priceStandard.value, rules: [validators.numberRange(0, 100000, "Standard price")] },
            { name: "pricePremium", value: form.pricePremium.value, rules: [validators.numberRange(0, 100000, "Premium price")] },
          ];
          const { valid } = validateFields(form, fields);
          if (!valid) return false;

          setButtonLoading(btn, true, "Saving…");
          try {
            await updateShowtimePrices(id, {
              priceStandard: Number(form.priceStandard.value),
              pricePremium: Number(form.pricePremium.value),
            });
            toast.success("Prices updated.");
            await loadShowtimes();
            return true;
          } catch (error) {
            setButtonLoading(btn, false);
            toast.error(friendlyMessage(error));
            return false;
          }
        },
      },
    ],
  });
}

async function removeShowtime(id, title) {
  const ok = await confirmDialog({
    title: `Delete showtime · ${title}?`,
    message: "Customers will no longer be able to book this screening. Showtimes that already have bookings cannot be deleted.",
    confirmLabel: "Delete showtime",
  });
  if (!ok) return;
  try {
    await deleteShowtime(id);
    toast.success("Showtime deleted.");
    await loadShowtimes();
  } catch (error) {
    if (error.code === "IN_USE") {
      toast.error("This showtime has bookings and cannot be deleted.");
    } else {
      toast.error(friendlyMessage(error));
    }
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  const { user, ok } = await initPage({ auth: "admin", chrome: false });
  if (!ok || !user) return;
  renderAdminShell(user, "showtimes");

  qs("#add-showtime").addEventListener("click", openCreateModal);

  qs("#filter-movie").addEventListener("change", (e) => { state.movieId = e.target.value; state.page = 1; loadShowtimes(); });
  qs("#filter-screen").addEventListener("change", (e) => { state.screenId = e.target.value; state.page = 1; loadShowtimes(); });
  qs("#filter-from").addEventListener("change", (e) => { state.from = e.target.value; state.page = 1; loadShowtimes(); });
  qs("#filter-to").addEventListener("change", (e) => { state.to = e.target.value; state.page = 1; loadShowtimes(); });
  qs("#clear-filters").addEventListener("click", () => {
    state.movieId = state.screenId = state.from = state.to = "";
    state.page = 1;
    qs("#filter-movie").value = "";
    qs("#filter-screen").value = "";
    qs("#filter-from").value = "";
    qs("#filter-to").value = "";
    loadShowtimes();
  });

  await populateFilters();
  await loadShowtimes();
}

main();
