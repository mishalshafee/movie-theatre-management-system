/**
 * Movie listing page: status filters, title search, server pagination.
 * Search runs client-side over up to 50 records of the selected status
 * (the API's maximum page size), keeping the behaviour honest to the backend.
 */

import { initPage } from "../core/session.js";
import { listMovies } from "../services/movies.service.js";
import { RULES } from "../config.js";
import { movieCard } from "../components/movie-card.js";
import { skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { renderPagination } from "../components/pagination.js";
import { refreshReveal } from "../components/reveal.js";
import { friendlyMessage } from "../core/api.js";
import { qs, qsa, clear, debounce } from "../utils/dom.js";

const state = {
  status: "now_showing", // "" = all
  search: "",
  page: 1,
  limit: 12,
};

function currentFilterLabel() {
  return { now_showing: "Now Showing", coming_soon: "Coming Soon", archived: "Archived" }[state.status] || "All Movies";
}

async function loadMovies() {
  const grid = qs("#movies-grid");
  const count = qs("#movies-count");
  const pagination = qs("#movies-pagination");
  grid.innerHTML = skeletonHTML("cards", 8);

  try {
    if (state.search) {
      // Client-side search across the biggest honest page the API allows.
      const { data } = await listMovies({ status: state.status || undefined, page: 1, limit: RULES.MOVIES_MAX_LIMIT });
      const term = state.search.trim().toLowerCase();
      const matches = data.filter((m) => m.title.toLowerCase().includes(term));
      renderResults(grid, matches.slice((state.page - 1) * state.limit, state.page * state.limit), {
        total: matches.length, page: state.page, limit: state.limit,
      }, pagination, true);
      count.textContent = `${matches.length} result${matches.length === 1 ? "" : "s"} for “${state.search}”`;
    } else {
      const res = await listMovies({ status: state.status || undefined, page: state.page, limit: state.limit });
      renderResults(grid, res.data, res, pagination, false);
      count.textContent = `${res.total} film${res.total === 1 ? "" : "s"} · ${currentFilterLabel()}`;
    }
  } catch (error) {
    clear(grid);
    grid.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    grid.querySelector(".js-retry")?.addEventListener("click", loadMovies);
    count.textContent = "";
  }
}

function renderResults(grid, movies, meta, pagination, isSearch) {
  clear(grid);
  if (!movies.length) {
    grid.innerHTML = emptyStateHTML({
      icon: "search",
      title: state.search ? "No movies match your search" : "No movies in this category yet",
      message: state.search ? "Try a different title or clear the search." : "New films are added by the cinema team — check back soon.",
    });
    pagination.innerHTML = "";
    return;
  }
  movies.forEach((movie, index) => grid.append(movieCard(movie, { delay: Math.min(index * 50, 450) })));
  refreshReveal(grid);
  if (isSearch) {
    // Search results are paginated client-side over the fetched window.
    renderPagination(pagination, meta, (page) => { state.page = page; loadMovies(); });
  } else {
    renderPagination(pagination, meta, (page) => {
      state.page = page;
      loadMovies();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
}

function wireFilters() {
  const tabs = qsa(".filter-chip");
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      tabs.forEach((t) => t.classList.toggle("is-active", t === tab));
      state.status = tab.dataset.status || "";
      state.page = 1;
      // Keep the URL shareable.
      const url = new URL(location.href);
      if (state.status) url.searchParams.set("status", state.status);
      else url.searchParams.delete("status");
      history.replaceState(null, "", url);
      loadMovies();
    });
  });

  const search = qs("#movie-search");
  search.addEventListener("input", debounce(() => {
    state.search = search.value.trim();
    state.page = 1;
    loadMovies();
  }, 350));
}

async function main() {
  await initPage({ auth: "any" });

  const params = new URLSearchParams(location.search);
  const requested = params.get("status");
  state.status = ["now_showing", "coming_soon", "archived"].includes(requested) ? requested : "";

  // Sync tab UI with the URL.
  qsa(".filter-chip").forEach((tab) => {
    tab.classList.toggle("is-active", (tab.dataset.status || "") === state.status);
  });

  wireFilters();
  loadMovies();
}

main();
