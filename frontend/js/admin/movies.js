/**
 * Admin · Movie management (CRUD).
 * Validation mirrors the backend: title ≤200, duration 1–600, description
 * ≤5000, genre ≤100, rating ≤20, posterUrl must be a valid URL, releaseDate
 * YYYY-MM-DD, status enum. Deletion returns 409 IN_USE when showtimes exist.
 */

import { initPage } from "../core/session.js";
import { renderAdminShell } from "../components/admin-shell.js";
import { listMovies, createMovie, updateMovie, deleteMovie } from "../services/movies.service.js";
import { posterThumb } from "../components/movie-card.js";
import { openModal, confirmDialog } from "../components/modal.js";
import { setButtonLoading, skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { toast } from "../components/toast.js";
import { friendlyMessage } from "../core/api.js";
import { validators, validateFields, applyApiErrorToForm } from "../utils/validators.js";
import { qs, qsa, clear, escapeHtml, debounce, el } from "../utils/dom.js";
import { formatDuration, formatMovieStatus } from "../utils/formatters.js";
import { formatDateShort } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const state = { page: 1, limit: 12, search: "", total: 0 };

/* ------------------------------------------------------------------ */

async function loadMovies() {
  const tbody = qs("#movies-tbody");
  const wrapper = qs("#movies-table-wrap");
  wrapper.innerHTML = skeletonHTML("rows", 5);

  try {
    const res = await listMovies({ status: undefined, page: 1, limit: 50 });
    let rows = res.data;
    if (state.search) {
      const term = state.search.toLowerCase();
      rows = rows.filter((m) => m.title.toLowerCase().includes(term));
    }
    state.total = rows.length;

    clear(wrapper);
    if (!rows.length) {
      wrapper.innerHTML = emptyStateHTML({
        icon: "film",
        title: state.search ? "No movies match your search" : "No movies in the catalogue",
        message: state.search ? "Try a different title." : "Add your first movie to start scheduling showtimes.",
        actionLabel: state.search ? "" : "Add movie",
      });
      wrapper.querySelector(".btn")?.addEventListener("click", () => openMovieModal());
      return;
    }

    // Simple client-side pagination over the fetched window.
    const pages = Math.max(1, Math.ceil(rows.length / state.limit));
    if (state.page > pages) state.page = pages;
    const slice = rows.slice((state.page - 1) * state.limit, state.page * state.limit);

    const table = el("table", { class: "admin-table", id: "movies-table" });
    table.innerHTML = `
      <thead><tr>
        <th scope="col">Movie</th>
        <th scope="col">Duration</th>
        <th scope="col">Genre</th>
        <th scope="col">Rating</th>
        <th scope="col">Release</th>
        <th scope="col">Status</th>
        <th scope="col"><span class="sr-only">Actions</span></th>
      </tr></thead>
      <tbody></tbody>`;
    const tbody = table.querySelector("tbody");

    for (const movie of slice) {
      const tr = el("tr");
      tr.innerHTML = `
        <td class="admin-table__movie"></td>
        <td>${formatDuration(movie.durationMinutes)}</td>
        <td>${escapeHtml(movie.genre || "—")}</td>
        <td>${escapeHtml(movie.rating || "—")}</td>
        <td>${movie.releaseDate ? formatDateShort(movie.releaseDate) : "—"}</td>
        <td><span class="status-chip status-chip--${movie.status}">${formatMovieStatus(movie.status)}</span></td>
        <td>
          <div class="table-actions">
            <button type="button" class="icon-button" data-action="edit" aria-label="Edit ${escapeHtml(movie.title)}">${icons.edit({ size: 16 })}</button>
            <button type="button" class="icon-button icon-button--danger" data-action="delete" aria-label="Delete ${escapeHtml(movie.title)}">${icons.trash({ size: 16 })}</button>
          </div>
        </td>`;
      tr.querySelector(".admin-table__movie").append(posterThumb(movie));
      const titleWrap = el("div", { class: "admin-table__movie-meta" });
      titleWrap.append(
        el("strong", { text: movie.title }),
        el("span", { class: "admin-table__sub", text: `Added ${formatDateShort(movie.createdAt)}` })
      );
      tr.querySelector(".admin-table__movie").append(titleWrap);

      tr.querySelector('[data-action="edit"]').addEventListener("click", () => openMovieModal(movie));
      tr.querySelector('[data-action="delete"]').addEventListener("click", () => removeMovie(movie));
      tbody.append(tr);
    }

    wrapper.append(table);
    renderAdminPagination(pages);
  } catch (error) {
    clear(wrapper);
    wrapper.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    wrapper.querySelector(".js-retry")?.addEventListener("click", loadMovies);
  }
}

function renderAdminPagination(totalPages) {
  const host = qs("#movies-pagination");
  if (totalPages <= 1) { host.innerHTML = ""; return; }
  const buttons = [];
  for (let p = 1; p <= totalPages; p++) {
    buttons.push(`<button type="button" class="page-btn${p === state.page ? " is-active" : ""}" data-page="${p}">${p}</button>`);
  }
  host.innerHTML = `<nav class="pagination" aria-label="Movies pagination">${buttons.join("")}</nav>`;
  host.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", () => { state.page = Number(btn.dataset.page); loadMovies(); });
  });
}

/* ------------------------------------------------------------------ *
 * Create / edit modal
 * ------------------------------------------------------------------ */

function modalFormHTML(movie = null) {
  const statuses = ["now_showing", "coming_soon", "archived"];
  return `
    <form id="movie-form" class="form" novalidate>
      <div class="form-field">
        <label class="form-label" for="m-title">Title <span class="req">*</span></label>
        <input class="form-input" id="m-title" name="title" maxlength="200" value="${escapeHtml(movie?.title ?? "")}" required>
        <p class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-field">
        <label class="form-label" for="m-description">Description</label>
        <textarea class="form-textarea" id="m-description" name="description" rows="4" maxlength="5000">${escapeHtml(movie?.description ?? "")}</textarea>
        <p class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-grid-2">
        <div class="form-field">
          <label class="form-label" for="m-duration">Duration (minutes) <span class="req">*</span></label>
          <input class="form-input" id="m-duration" name="durationMinutes" type="number" min="1" max="600" value="${movie?.durationMinutes ?? ""}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="m-rating">Rating</label>
          <input class="form-input" id="m-rating" name="rating" maxlength="20" placeholder="PG-13" value="${escapeHtml(movie?.rating ?? "")}">
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>
      <div class="form-grid-2">
        <div class="form-field">
          <label class="form-label" for="m-genre">Genre</label>
          <input class="form-input" id="m-genre" name="genre" maxlength="100" placeholder="Sci-Fi" value="${escapeHtml(movie?.genre ?? "")}">
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="m-release">Release date</label>
          <input class="form-input" id="m-release" name="releaseDate" type="date" value="${escapeHtml(movie?.releaseDate ?? "")}">
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>
      <div class="form-field">
        <label class="form-label" for="m-poster">Poster URL</label>
        <input class="form-input" id="m-poster" name="posterUrl" type="url" placeholder="https://…" value="${escapeHtml(movie?.posterUrl ?? "")}">
        <div class="poster-preview" id="poster-preview" hidden></div>
        <p class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-field">
        <label class="form-label" for="m-status">Status</label>
        <select class="form-select" id="m-status" name="status">
          ${statuses.map((s) => `<option value="${s}" ${movie?.status === s ? "selected" : ""}>${formatMovieStatus(s)}</option>`).join("")}
        </select>
        <p class="field-error" aria-live="polite"></p>
      </div>
      <p class="form-alert" hidden></p>
    </form>`;
}

function wirePosterPreview(form) {
  const input = form.querySelector("#m-poster");
  const preview = form.querySelector("#poster-preview");
  const render = () => {
    const url = input.value.trim();
    preview.hidden = !url;
    preview.innerHTML = url
      ? `<img src="${escapeHtml(url)}" alt="Poster preview">
         <span class="poster-preview__hint">Live preview</span>`
      : "";
    preview.querySelector("img")?.addEventListener("error", () => {
      preview.innerHTML = '<span class="poster-preview__hint poster-preview__hint--error">This URL did not load as an image</span>';
    });
  };
  input.addEventListener("input", debounce(render, 400));
  render();
}

function openMovieModal(movie = null) {
  const isEdit = !!movie;
  const modal = openModal({
    title: isEdit ? `Edit “${escapeHtml(movie.title)}”` : "Add a new movie",
    size: "lg",
    content: modalFormHTML(movie),
    actions: [
      { label: "Cancel", kind: "secondary" },
      {
        label: isEdit ? "Save changes" : "Create movie",
        kind: "primary",
        closeOnClick: false,
        onClick: (button) => submitMovieForm(modal, button, movie),
      },
    ],
  });
  const form = modal.body.querySelector("#movie-form");
  wirePosterPreview(form);
}

async function submitMovieForm(modal, button, movie = null) {
  const form = modal.body.querySelector("#movie-form");
  const payload = {
    title: form.title.value.trim(),
    description: form.description.value.trim(),
    durationMinutes: form.durationMinutes.value === "" ? "" : Number(form.durationMinutes.value),
    genre: form.genre.value.trim(),
    rating: form.rating.value.trim(),
    posterUrl: form.posterUrl.value.trim(),
    releaseDate: form.releaseDate.value || null,
    status: form.status.value,
  };

  const { valid } = validateFields(form, [
    { name: "title", value: payload.title, rules: [validators.title()] },
    { name: "durationMinutes", value: payload.durationMinutes, rules: [validators.duration()] },
    { name: "genre", value: payload.genre, rules: [validators.maxLength(100, "Genre")] },
    { name: "rating", value: payload.rating, rules: [validators.maxLength(20, "Rating")] },
    { name: "posterUrl", value: payload.posterUrl, rules: [validators.url("Poster URL")] },
    { name: "releaseDate", value: payload.releaseDate, rules: [validators.dateISO("Release date")] },
  ]);
  if (!valid) return false;

  // Build the exact payload shape the API expects (skip empty optionals).
  const body = { title: payload.title, durationMinutes: payload.durationMinutes };
  if (payload.description) body.description = payload.description;
  if (payload.genre) body.genre = payload.genre;
  if (payload.rating) body.rating = payload.rating;
  if (payload.posterUrl) body.posterUrl = payload.posterUrl;
  if (payload.releaseDate) body.releaseDate = payload.releaseDate;
  body.status = payload.status;

  setButtonLoading(button, true, movie ? "Saving…" : "Creating…");
  try {
    if (movie) {
      await updateMovie(movie.id, body);
      toast.success("Movie updated.");
    } else {
      await createMovie(body);
      toast.success("Movie added to the catalogue.");
    }
    setButtonLoading(button, false);
    return true; // closes modal
  } catch (error) {
    setButtonLoading(button, false);
    if (!applyApiErrorToForm(form, error)) {
      const alert = form.querySelector(".form-alert");
      alert.textContent = friendlyMessage(error);
      alert.hidden = false;
    }
    return false;
  }
}

/* ------------------------------------------------------------------ */

async function removeMovie(movie) {
  const ok = await confirmDialog({
    title: "Delete this movie?",
    message: `“<strong>${escapeHtml(movie.title)}</strong>” will be permanently removed. If it has showtimes, deletion is blocked — archive it instead.`,
    confirmLabel: "Delete movie",
  });
  if (!ok) return;
  try {
    await deleteMovie(movie.id);
    toast.success("Movie deleted.");
    loadMovies();
  } catch (error) {
    if (error.code === "IN_USE" || (error.status === 500)) {
      // NOTE: the backend currently reports in-use movies as 500 INTERNAL
      // instead of 409 IN_USE (documented discrepancy) — same advice stands.
      toast.warning("This movie has showtimes and cannot be deleted. Set its status to “Archived” instead.", {
        actionLabel: "Archive now",
        onAction: async () => {
          try {
            await updateMovie(movie.id, { status: "archived" });
            toast.success("Movie archived.");
            loadMovies();
          } catch (err) {
            toast.error(friendlyMessage(err));
          }
        },
      });
    } else {
      toast.error(friendlyMessage(error));
    }
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  const { user, ok } = await initPage({ auth: "admin", chrome: false });
  if (!ok || !user) return;
  renderAdminShell(user, "movies");

  qs("#add-movie-btn").addEventListener("click", () => openMovieModal());
  qs("#movie-search").addEventListener("input", debounce(() => {
    state.search = qs("#movie-search").value.trim();
    state.page = 1;
    loadMovies();
  }, 300));

  loadMovies();
}

main();
