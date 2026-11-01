/**
 * Home page logic.
 *  - fetches movies from backend API (/api/movies) connected to PostgreSQL
 *  - falls back smoothly to demo movies if backend is not yet started
 *  - All / Now Showing / Coming Soon filter
 *  - scroll-reveal animations
 *  - navbar init
 */
import { apiJSON } from './api.js';
import { movies as fallbackMovies } from '../data/movies.js';
import { initNavbar } from './navbar.js';
import { initReveal } from './reveal.js';

let currentMovies = [];
let activeFilter = 'all';

function movieCardHTML(m, delayIndex) {
  const isNow = m.status === 'now' || m.status === 'now_showing';
  const statusLabel = isNow ? 'Now Showing' : 'Coming Soon';
  const statusClass = isNow ? 'now' : 'soon';

  let ratingVal = 8.0;
  if (typeof m.rating === 'number') {
    ratingVal = m.rating;
  } else if (typeof m.rating === 'string') {
    const parsed = parseFloat(m.rating);
    if (!isNaN(parsed)) ratingVal = parsed;
  }

  let durationStr = m.duration || '';
  if (!durationStr && m.durationMinutes) {
    const hours = Math.floor(m.durationMinutes / 60);
    const mins = m.durationMinutes % 60;
    durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
  if (!durationStr) durationStr = '2h 00m';

  const poster = m.posterUrl || m.poster || 'images/movies/movie-1.svg';
  const genre = m.genre || 'Cinema';
  const title = m.title || 'Untitled';

  return `
    <article class="movie-card" data-reveal data-reveal-delay="${delayIndex}">
      <div class="movie-poster">
        <img src="${escapeAttr(poster)}" alt="${escapeAttr(title)} poster" loading="lazy" />
        <span class="movie-status ${statusClass}">${statusLabel}</span>
        <span class="movie-rating">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          ${ratingVal.toFixed(1)}
        </span>
      </div>
      <div class="movie-body">
        <h3 class="movie-title">${escapeHtml(title)}</h3>
        <div class="movie-meta">
          <span>${escapeHtml(genre)}</span>
          <span class="dot-sep"></span>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>${escapeHtml(durationStr)}</span>
        </div>
        <span class="movie-genre-tag">${escapeHtml(genre)}</span>
      </div>
    </article>
  `;
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(s) {
  return escapeHtml(s);
}

function renderMovies(filter) {
  const grid = document.getElementById('movies-grid');
  if (!grid) return;
  activeFilter = filter || 'all';

  let list = currentMovies;
  if (activeFilter === 'now') {
    list = currentMovies.filter((m) => m.status === 'now' || m.status === 'now_showing');
  } else if (activeFilter === 'soon') {
    list = currentMovies.filter((m) => m.status === 'soon' || m.status === 'coming_soon');
  }

  if (list.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: var(--text-secondary);">
        <p style="font-size: 1.1rem; margin-bottom: 8px;">No movies found in this category.</p>
        <p style="font-size: 0.9rem; opacity: 0.8;">Try selecting "All" to view the complete collection.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = list.map((m, i) => movieCardHTML(m, (i % 3) + 1)).join('');

  // re-observe newly created reveal elements
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    grid.querySelectorAll('[data-reveal]').forEach((el) => observer.observe(el));
  } else {
    grid.querySelectorAll('[data-reveal]').forEach((el) => el.classList.add('is-visible'));
  }
}

function initFilter() {
  const buttons = document.querySelectorAll('.movies-filter button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      renderMovies(btn.dataset.filter);
    });
  });
}

async function loadMovies() {
  const grid = document.getElementById('movies-grid');
  if (grid) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 40px 16px; color: var(--text-secondary);">
        <span class="spinner" style="display: inline-block; width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.2); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 12px;"></span>
        <p>Loading movies from cinema catalog...</p>
      </div>
    `;
  }

  try {
    const res = await apiJSON('/api/movies?limit=50');
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      currentMovies = res.data;
    } else {
      currentMovies = fallbackMovies;
    }
  } catch (err) {
    console.warn('Backend connection unavailable, using fallback movies:', err);
    currentMovies = fallbackMovies;
  }

  renderMovies(activeFilter);
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initFilter();
  loadMovies();
  initReveal();
});
