/**
 * Movies catalogue page.
 * Status filter (All / Now Showing / Coming Soon) via the backend `status`
 * query parameter + client-side title search (the API has no search field,
 * so we filter the fetched page locally — max 50 per backend limit).
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { listMovies } from "../services/movies.service.js";
import { movieCard } from "../components/movie-card.js";
import { skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { refreshReveal } from "../components/reveal.js";
import { friendlyMessage } from "../core/api.js";
import { qs, qsa, clear, debounce, escapeHtml } from "../utils/dom.js";

const state = { status: "", search: "", page: 1, limit: 12, window: [], total: 0 };

/* ------------------------------------------------------------------ */

async function loadMovies() {
  const grid = qs("#movies-grid");
  const countEl = qs("#movies-count");
  grid.innerHTML = skeletonHTML("cards", 8);

  try {
    const res = await listMovies({
      status: state.status || undefined,
      page: 1,
      limit: 50, // backend max — search filters this window locally
    });
    state.window = res.data;
    state.total = res.total;
    renderPage();
  } catch (error) {
    clear(grid);
    grid.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    grid.querySelector(".js-retry")?.addEventListener("click", loadMovies);
    countEl.textContent = "";
    qs("#movies-pagination").innerHTML = "";
  }
}

function filteredMovies() {
  const term = state.search.trim().toLowerCase();
  if (!term) return state.window;
  return state.window.filter((m) => m.title.toLowerCase().includes(term));
}

function renderPage() {
  const grid = qs("#movies-grid");
  const countEl = qs("#movies-count");
  const all = filteredMovies();
  state.total = all.length;

  const totalPages = Math.max(1, Math.ceil(all.length / state.limit));
  if (state.page > totalPages) state.page = totalPages;
  const slice = all.slice((state.page - 1) * state.limit, state.page * state.limit);

  clear(grid);
  if (!slice.length) {
    grid.innerHTML = emptyStateHTML({
      icon: "search",
      title: state.search ? `No movies match "${escapeHtml(state.search)}"` : "No movies found",
      message: state.search
        ? "Try a different title, or clear the search to see the full catalogue."
        : "The catalogue is empty right now — check back soon.",
    });
    countEl.textContent = "";
    qs("#movies-pagination").innerHTML = "";
    return;
  }

  slice.forEach((movie, index) => grid.append(movieCard(movie, {
    delay: Math.min(index * 50, 400),
    bookable: movie.status === "now_showing",
  })));
  refreshReveal(grid);

  countEl.textContent = all.length === 1
    ? "1 movie"
    : `${all.length} movies${state.search ? ` matching “${escapeHtml(state.search)}”` : ""}`;

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  const host = qs("#movies-pagination");
  if (totalPages <= 1) { host.innerHTML = ""; return; }
  const buttons = [];
  for (let p = 1; p <= totalPages; p++) {
    buttons.push(`<button type="button" class="page-btn${p === state.page ? " is-active" : ""}" data-page="${p}" aria-label="Page ${p}">${p}</button>`);
  }
  host.innerHTML = `<nav class="pagination" aria-label="Movies pagination">${buttons.join("")}
    <span class="pagination__info">Page ${state.page} of ${totalPages}</span></nav>`;
  host.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.page = Number(btn.dataset.page);
      renderPage();
      qs("#movies-grid").scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/* ------------------------------------------------------------------ */

function syncFilterUI() {
  qsa("#status-filter .segmented__btn").forEach((btn) => {
    const active = (btn.dataset.status || "") === state.status;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });
}

function initFilters() {
  const params = new URLSearchParams(location.search);
  state.status = params.get("status") || "";
  state.search = params.get("q") || "";
  qs("#movie-search").value = state.search;
  syncFilterUI();

  qsa("#status-filter .segmented__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.status = btn.dataset.status || "";
      state.page = 1;
      syncFilterUI();
      const url = new URL(location.href);
      if (state.status) url.searchParams.set("status", state.status);
      else url.searchParams.delete("status");
      history.replaceState(null, "", url);
      loadMovies();
    });
  });

  qs("#movie-search").addEventListener("input", debounce((event) => {
    state.search = event.target.value;
    state.page = 1;
    renderPage();
  }, 220));
}

async function main() {
  await initPage({ auth: "any" });
  initFilters();
  await loadMovies();
}

main();
