/**
 * Admin · Movie management (CRUD).
 * Validation mirrors the backend: title ≤200, duration 1–600, description
 * ≤5000, genre ≤100, rating ≤20, posterUrl must be a valid URL, releaseDate
 * YYYY-MM-DD, status enum. Deletion returns 409 IN_USE when showtimes exist.
 * Includes a live poster preview in the create/edit modal.
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
import { formatDuration, formatMovieStatus, truncate } from "../utils/formatters.js";
import { formatDateShort } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const state = { page: 1, limit: 10, search: "", total: 0 };

/* ------------------------------------------------------------------ */

async function loadMovies() {
  const wrapper = qs("#movies-table-wrap");
  wrapper.innerHTML = skeletonHTML("rows", 5);

  try {
    const res = await listMovies({ status: undefined, page: 1, limit: 50 });
    let rows = res.data;
    if (state.search) {
      const term = state.search.toLowerCase();
      rows = rows.filter((m) => m.title.toLowerCase().includes(term) || (m.genre || "").toLowerCase().includes(term));
    }
    state.total = rows.length;

    clear(wrapper);
    if (!rows.length) {
      wrapper.innerHTML = emptyStateHTML({
        icon: "film",
        title: state.search ? "No movies match your search" : "No movies in the catalogue",
        message: state.search ? "Try a different title or genre." : "Add your first movie to start scheduling showtimes.",
        actionLabel: state.search ? "" : "Add movie",
      });
      wrapper.querySelector(".btn")?.addEventListener("click", () => openMovieModal());
      qs("#movies-pagination").innerHTML = "";
      return;
    }

    // Client-side pagination over the fetched window.
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
        <td>${movie.releaseDate ? formatDateShort(`${movie.releaseDate}T00:00:00`) : "—"}</td>
        <td><span class="status-chip status-chip--${movie.status}">${formatMovieStatus(movie.status)}</span></td>
        <td>
          <div class="table-actions">
            <button type="button" class="icon-button" data-action="edit" aria-label="Edit ${escapeHtml(movie.title)}">${icons.edit({ size: 16 })}</button>
            <button type="button" class="icon-button icon-button--danger" data-action="delete" aria-label="Delete ${escapeHtml(movie.title)}">${icons.trash({ size: 16 })}</button>
          </div>
        </td>`;
      const movieCell = tr.querySelector(".admin-table__movie");
      movieCell.append(posterThumb(movie));
      movieCell.append(el("div", { class: "admin-table__movie-meta" }, [
        el("strong", { text: movie.title }),
        el("span", { class: "admin-table__sub", text: truncate(movie.description || "No description", 46) }),
      ]));

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
  host.innerHTML = `<nav class="pagination" aria-label="Movies pagination">${buttons.join("")}
    <span class="pagination__info">${state.total} movies · page ${state.page} of ${totalPages}</span></nav>`;
  host.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", () => { state.page = Number(btn.dataset.page); loadMovies(); });
  });
}

/* ------------------------------------------------------------------ *
 * Create / edit modal with live poster preview
 * ------------------------------------------------------------------ */

function movieFormHTML(movie) {
  return `
    <form id="movie-form" class="form" novalidate>
      <div class="form-grid">
        <div class="form-field form-field--full" style="display:grid;grid-template-columns:88px minmax(0,1fr);gap:1rem;align-items:start">
          <div class="poster-thumb" id="form-poster-preview" style="width:88px;height:128px;border-radius:10px;background:var(--bg-2);border:1px dashed var(--line-strong);display:grid;place-items:center;color:var(--text-3)">
            ${icons.filmReel({ size: 22 })}
          </div>
          <div class="form-field">
            <label class="form-label" for="w-poster">Poster URL</label>
            <input class="form-input" id="w-poster" name="posterUrl" type="url" placeholder="images/movies/movie-1.svg or https://…" value="${escapeHtml(movie.posterUrl || "")}" maxlength="2048">
            <p class="field-error" aria-live="polite"></p>
            <p class="field-hint">Local paths like <span class="mono">images/movies/movie-1.svg</span> work too.</p>
          </div>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="w-title">Title <span class="req">*</span></label>
          <input class="form-input" id="w-title" name="title" type="text" value="${escapeHtml(movie.title || "")}" maxlength="200" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field form-field--full">
          <label class="form-label" for="w-description">Description</label>
          <textarea class="form-textarea" id="w-description" name="description" maxlength="5000" style="min-height:96px">${escapeHtml(movie.description || "")}</textarea>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-duration">Duration (minutes) <span class="req">*</span></label>
          <input class="form-input" id="w-duration" name="durationMinutes" type="number" min="1" max="600" value="${movie.durationMinutes ?? ""}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-genre">Genre</label>
          <input class="form-input" id="w-genre" name="genre" type="text" value="${escapeHtml(movie.genre || "")}" maxlength="100" placeholder="e.g. Sci-Fi">
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-rating">Rating</label>
          <input class="form-input" id="w-rating" name="rating" type="text" value="${escapeHtml(movie.rating || "")}" maxlength="20" placeholder="e.g. 8.7">
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-release">Release date</label>
          <input class="form-input" id="w-release" name="releaseDate" type="date" value="${escapeHtml(movie.releaseDate || "")}">
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-status">Status</label>
          <select class="form-select" id="w-status" name="status">
            <option value="coming_soon" ${movie.status === "coming_soon" || !movie.status ? "selected" : ""}>Coming Soon</option>
            <option value="now_showing" ${movie.status === "now_showing" ? "selected" : ""}>Now Showing</option>
            <option value="archived" ${movie.status === "archived" ? "selected" : ""}>Archived</option>
          </select>
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>
    </form>`;
}

function wirePosterPreview() {
  const input = qs("#w-poster");
  const preview = qs("#form-poster-preview");
  input?.addEventListener("input", debounce(() => {
    const url = input.value.trim();
    if (!url) {
      preview.innerHTML = icons.filmReel({ size: 22 });
      return;
    }
    preview.innerHTML = `<img src="${escapeHtml(url)}" alt="" style="width:100%;height:100%;object-fit:cover;" onerror="this.remove()">`;
  }, 250));
  if (input?.value.trim()) input.dispatchEvent(new Event("input"));
}

function openMovieModal(movie = null) {
  const isEdit = !!movie;
  const modal = openModal({
    title: isEdit ? `Edit · ${movie.title}` : "Add a movie",
    size: "lg",
    content: movieFormHTML(movie || {}),
    actions: [
      { label: "Cancel", kind: "ghost" },
      {
        label: isEdit ? "Save changes" : "Create movie",
        kind: "primary",
        closeOnClick: false,
        onClick: async (btn) => {
          const form = qs("#movie-form");
          const values = {
            title: form.title.value.trim(),
            description: form.description.value.trim(),
            durationMinutes: form.durationMinutes.value,
            genre: form.genre.value.trim() || null,
            rating: form.rating.value.trim() || null,
            posterUrl: form.posterUrl.value.trim() || null,
            releaseDate: form.releaseDate.value || null,
            status: form.status.value,
          };

          const fields = [
            { name: "title", value: values.title, rules: [validators.title()] },
            { name: "durationMinutes", value: values.durationMinutes, rules: [validators.duration()] },
            { name: "description", value: values.description, rules: [validators.maxLength(5000, "Description")] },
            { name: "genre", value: values.genre ?? "", rules: [validators.maxLength(100, "Genre")] },
            { name: "rating", value: values.rating ?? "", rules: [validators.maxLength(20, "Rating")] },
            { name: "posterUrl", value: values.posterUrl ?? "", rules: [validators.url("Poster URL")] },
            { name: "releaseDate", value: values.releaseDate ?? "", rules: [validators.dateISO("Release date")] },
          ];
          const { valid } = validateFields(form, fields);
          if (!valid) return false;

          const payload = {
            title: values.title,
            description: values.description,
            durationMinutes: Number(values.durationMinutes),
            genre: values.genre,
            rating: values.rating,
            posterUrl: values.posterUrl,
            releaseDate: values.releaseDate,
            status: values.status,
          };

          setButtonLoading(btn, true, "Saving…");
          try {
            if (isEdit) await updateMovie(movie.id, payload);
            else await createMovie(payload);
            toast.success(isEdit ? "Movie updated." : "Movie added to the catalogue.");
            await loadMovies();
            return true;
          } catch (error) {
            setButtonLoading(btn, false);
            if (!applyApiErrorToForm(form, error)) toast.error(friendlyMessage(error));
            return false;
          }
        },
      },
    ],
    onClose: () => {},
  });
  wirePosterPreview();
  return modal;
}

async function removeMovie(movie) {
  const ok = await confirmDialog({
    title: `Delete “${movie.title}”?`,
    message: "The movie will be removed from the catalogue. Showtimes referencing it will block deletion (the backend protects them).",
    confirmLabel: "Delete movie",
  });
  if (!ok) return;
  try {
    await deleteMovie(movie.id);
    toast.success(`“${movie.title}” deleted.`);
    await loadMovies();
  } catch (error) {
    if (error.code === "IN_USE") {
      toast.error("This movie is referenced by showtimes and cannot be deleted. Delete or reschedule those showtimes first.");
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

  qs("#add-movie").addEventListener("click", () => openMovieModal());
  qs("#movie-search").addEventListener("input", debounce((event) => {
    state.search = event.target.value;
    state.page = 1;
    loadMovies();
  }, 240));

  await loadMovies();
}

main();
