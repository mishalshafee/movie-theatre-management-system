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
import { qs, clear, escapeHtml, debounce } from "../utils/dom.js";
import { formatMoney } from "../utils/formatters.js";
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
      });
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
            <td class="admin-table__strong">${escapeHtml(st.movie.title)}</td>
            <td>${escapeHtml(st.screen.name)}</td>
            <td>${escapeHtml(formatDateTime(st.startsAt))}</td>
            <td>${formatMoney(st.priceStandard)}</td>
            <td>${formatMoney(st.pricePremium)}</td>
            <td>
              <div class="table-actions">
                <button type="button" class="icon-button" data-action="prices" data-id="${st.id}"
                  data-std="${st.priceStandard}" data-prem="${st.pricePremium}" aria-label="Edit prices for ${escapeHtml(st.movie.title)}">${icons.edit({ size: 16 })}</button>
                <button type="button" class="icon-button icon-button--danger" data-action="delete" data-id="${st.id}"
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
      btn.addEventListener("click", () => openPricesModal(btn.dataset.id, Number(btn.dataset.std), Number(btn.dataset.prem)));
    });
    wrapper.querySelectorAll('[data-action="delete"]').forEach((btn) => {
      btn.addEventListener("click", () => removeShowtime(btn.dataset.id));
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
      <div class="form-field">
        <label class="form-label" for="w-movie">Movie <span class="req">*</span></label>
        <select class="form-select" id="w-movie" name="movieId" required>
          <option value="">Select a movie…</option>
          ${movies.map((m) => `<option value="${m.id}">${escapeHtml(m.title)} (${m.durationMinutes} min)</option>`).join("")}
        </select>
        <p class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-field">
        <label class="form-label" for="w-screen">Screen <span class="req">*</span></label>
        <select class="form-select" id="w-screen" name="screenId" required>
          <option value="">Select a screen…</option>
          ${screens.map((s) => `<option value="${s.id}">${escapeHtml(s.name)} (${s.seatCount} seats)</option>`).join("")}
        </select>
        <p class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-grid-2">
        <div class="form-field">
          <label class="form-label" for="w-date">Start date <span class="req">*</span></label>
          <input class="form-input" id="w-date" name="startDate" type="date" min="${todayInputValue()}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-time">Start time <span class="req">*</span></label>
          <input class="form-input" id="w-time" name="startTime" type="time" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>
      <p class="field-hint">${icons.info({ size: 13 })} End time is computed automatically (duration + 15-minute turnover). Past start times are rejected.</p>
      <div class="form-grid-2">
        <div class="form-field">
          <label class="form-label" for="w-std">Standard seat price <span class="req">*</span></label>
          <input class="form-input" id="w-std" name="priceStandard" type="number" min="0" max="100000" step="0.01" placeholder="12.50" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-prem">Premium seat price <span class="req">*</span></label>
          <input class="form-input" id="w-prem" name="pricePremium" type="number" min="0" max="100000" step="0.01" placeholder="18.00" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>
      <p class="form-alert" hidden></p>
    </form>`;
}

async function openCreateModal() {
  // Fresh catalogues so the modal never offers stale options.
  let movies = [];
  let screens = [];
  try {
    [movies, screens] = await Promise.all([
      listMovies({ page: 1, limit: 50 }),
      listScreens(),
    ]);
  } catch (error) {
    toast.error("Could not load movies/screens for the form: " + friendlyMessage(error));
    return;
  }

  if (!movies.data.length || !screens.length) {
    toast.warning("Add at least one movie and one screen before scheduling showtimes.");
    return;
  }

  const modal = openModal({
    title: "Schedule a showtime",
    size: "lg",
    content: createFormHTML(movies.data, screens),
    actions: [
      { label: "Cancel", kind: "secondary" },
      {
        label: "Create showtime",
        kind: "primary",
        closeOnClick: false,
        onClick: (button) => submitCreate(modal, button),
      },
    ],
  });
  return modal;
}

async function submitCreate(modal, button) {
  const form = modal.body.querySelector("#showtime-form");
  const startsAt = isoFromDateTimeInputs(form.startDate.value, form.startTime.value);

  const { valid } = validateFields(form, [
    { name: "movieId", value: form.movieId.value, rules: [validators.required("Movie")] },
    { name: "screenId", value: form.screenId.value, rules: [validators.required("Screen")] },
    { name: "startDate", value: form.startDate.value, rules: [validators.required("Start date")] },
    { name: "startTime", value: form.startTime.value, rules: [validators.required("Start time")] },
    { name: "priceStandard", value: form.priceStandard.value, rules: [validators.numberRange(0, 100000, "Standard price")] },
    { name: "pricePremium", value: form.pricePremium.value, rules: [validators.numberRange(0, 100000, "Premium price")] },
  ]);
  if (!valid) return false;

  if (!startsAt) {
    const alert = form.querySelector(".form-alert");
    alert.textContent = "The date/time combination is invalid.";
    alert.hidden = false;
    return false;
  }
  if (new Date(startsAt).getTime() <= Date.now()) {
    form.startDate.classList.add("is-invalid");
    const node = form.startDate.closest(".form-field")?.querySelector(".field-error");
    if (node) node.textContent = "The start time must be in the future";
    return false;
  }

  setButtonLoading(button, true, "Scheduling…");
  try {
    const showtime = await createShowtime({
      movieId: form.movieId.value,
      screenId: form.screenId.value,
      startsAt,
      priceStandard: Number(form.priceStandard.value),
      pricePremium: Number(form.pricePremium.value),
    });
    toast.success(`Showtime scheduled — ${showtime.movie.title} on ${showtime.screen.name}.`);
    setButtonLoading(button, false);
    state.page = 1;
    loadShowtimes();
    return true;
  } catch (error) {
    setButtonLoading(button, false);
    if (error.code === "SHOWTIME_OVERLAP") {
      const alert = form.querySelector(".form-alert");
      alert.textContent = "That screen already has a showtime overlapping this period. Pick another time or screen.";
      alert.hidden = false;
    } else if (error.code === "VALIDATION_ERROR" && error.details) {
      const paint = {};
      for (const d of error.details) {
        const key = d.field === "startsAt" ? "startDate" : d.field;
        paint[key] = d.message;
      }
      form.querySelectorAll(".field-error").forEach((n) => { n.textContent = ""; });
      for (const [key, message] of Object.entries(paint)) {
        const anchor = form.querySelector(`[name="${key}"]`);
        anchor?.classList.add("is-invalid");
        anchor?.closest(".form-field")?.querySelector(".field-error")?.append(message);
      }
    } else {
      const alert = form.querySelector(".form-alert");
      alert.textContent = friendlyMessage(error);
      alert.hidden = false;
    }
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Price edit + delete
 * ------------------------------------------------------------------ */

function openPricesModal(id, std, prem) {
  const modal = openModal({
    title: "Update seat prices",
    size: "sm",
    content: `
      <form id="prices-form" class="form" novalidate>
        <div class="form-grid-2">
          <div class="form-field">
            <label class="form-label" for="p-std">Standard price <span class="req">*</span></label>
            <input class="form-input" id="p-std" name="priceStandard" type="number" min="0" max="100000" step="0.01" value="${std}" required>
            <p class="field-error" aria-live="polite"></p>
          </div>
          <div class="form-field">
            <label class="form-label" for="p-prem">Premium price <span class="req">*</span></label>
            <input class="form-input" id="p-prem" name="pricePremium" type="number" min="0" max="100000" step="0.01" value="${prem}" required>
            <p class="field-error" aria-live="polite"></p>
          </div>
        </div>
        <p class="field-hint">${icons.info({ size: 13 })} Only prices can be edited after a showtime is created.</p>
        <p class="form-alert" hidden></p>
      </form>`,
    actions: [
      { label: "Cancel", kind: "secondary" },
      {
        label: "Save prices",
        kind: "primary",
        closeOnClick: false,
        onClick: async (button) => {
          const form = modal.body.querySelector("#prices-form");
          const { valid } = validateFields(form, [
            { name: "priceStandard", value: form.priceStandard.value, rules: [validators.numberRange(0, 100000, "Standard price")] },
            { name: "pricePremium", value: form.pricePremium.value, rules: [validators.numberRange(0, 100000, "Premium price")] },
          ]);
          if (!valid) return false;
          setButtonLoading(button, true, "Saving…");
          try {
            await updateShowtimePrices(id, {
              priceStandard: Number(form.priceStandard.value),
              pricePremium: Number(form.pricePremium.value),
            });
            toast.success("Prices updated.");
            setButtonLoading(button, false);
            loadShowtimes();
            return true;
          } catch (error) {
            setButtonLoading(button, false);
            const alert = form.querySelector(".form-alert");
            alert.textContent = friendlyMessage(error);
            alert.hidden = false;
            return false;
          }
        },
      },
    ],
  });
}

async function removeShowtime(id) {
  const ok = await confirmDialog({
    title: "Delete this showtime?",
    message: "The screening will be removed from the schedule. Showtimes with existing bookings cannot be deleted.",
    confirmLabel: "Delete showtime",
  });
  if (!ok) return;
  try {
    await deleteShowtime(id);
    toast.success("Showtime deleted.");
    loadShowtimes();
  } catch (error) {
    if (error.code === "IN_USE" || error.status === 500) {
      toast.warning("This showtime has bookings (even cancelled ones) and cannot be deleted.");
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

  await populateFilters();
  qs("#add-showtime-btn").addEventListener("click", () => openCreateModal());
  qs("#filter-movie").addEventListener("change", () => { state.movieId = qs("#filter-movie").value; state.page = 1; loadShowtimes(); });
  qs("#filter-screen").addEventListener("change", () => { state.screenId = qs("#filter-screen").value; state.page = 1; loadShowtimes(); });
  qs("#filter-from").addEventListener("change", () => { state.from = qs("#filter-from").value; state.page = 1; loadShowtimes(); });
  qs("#filter-to").addEventListener("change", () => { state.to = qs("#filter-to").value; state.page = 1; loadShowtimes(); });
  qs("#filter-reset").addEventListener("click", () => {
    state.movieId = state.screenId = state.from = state.to = "";
    state.page = 1;
    qs("#filter-movie").value = "";
    qs("#filter-screen").value = "";
    qs("#filter-from").value = "";
    qs("#filter-to").value = "";
    loadShowtimes();
  });

  loadShowtimes();
}

main();
