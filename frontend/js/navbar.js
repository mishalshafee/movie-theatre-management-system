/**
 * Navbar behaviour (shared across all pages).
 *  - translucent-on-scroll (hero mode or normal)
 *  - animated hamburger + slide-in mobile menu
 *  - auth-aware: shows Login/Register when guest, user + Sign out when logged in
 *  - "Explore Movies" smooth scroll on the home page
 *
 * The navbar HTML is duplicated in each page; this module wires up behaviour
 * and toggles the auth-state UI.
 */
import { subscribe, logout, getAuthState } from './auth.js';
import { toast } from './toast.js';

export function initNavbar() {
  const navbar = document.querySelector('.navbar');
  const hamburger = document.querySelector('.hamburger-open');
  const mobileMenu = document.querySelector('.mobile-menu');
  const backdrop = document.querySelector('.mobile-backdrop');
  const closeBtn = document.querySelector('.mobile-close');

  /* ---- scroll state ---- */
  const onScroll = () => {
    if (!navbar) return;
    if (window.scrollY > 24) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---- mobile menu ---- */
  const openMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    mobileMenu.style.transform = 'translateX(0)';
    mobileMenu.style.visibility = 'visible';
    if (backdrop) backdrop.classList.add('show');
    document.body.style.overflow = 'hidden';
  };
  const closeMenu = () => {
    if (!mobileMenu) return;
    mobileMenu.style.transform = 'translateX(100%)';
    if (backdrop) backdrop.classList.remove('show');
    document.body.style.overflow = '';
    setTimeout(() => {
      mobileMenu.classList.remove('open');
      mobileMenu.style.visibility = 'hidden';
    }, 320);
  };

  if (hamburger) hamburger.addEventListener('click', openMenu);
  if (closeBtn) closeBtn.addEventListener('click', closeMenu);
  if (backdrop) backdrop.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });

  // close on internal link click inside mobile menu
  if (mobileMenu) {
    mobileMenu.querySelectorAll('a, button').forEach((el) => {
      el.addEventListener('click', () => {
        if (el.dataset.keepMenu !== '1') closeMenu();
      });
    });
  }

  /* ---- smooth scroll for "Movies" / "Explore Movies" ---- */
  document.querySelectorAll('[data-scroll-to]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const target = el.getAttribute('data-scroll-to');
      const node = document.querySelector(target);
      if (node) {
        e.preventDefault();
        node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ---- logout button (both desktop + mobile) ---- */
  document.querySelectorAll('[data-action="logout"]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      btn.disabled = true;
      try {
        await logout();
        toast.success("You've been signed out.");
        setTimeout(() => (window.location.href = 'index.html'), 600);
      } catch (_) {
        toast.error('Could not sign out. Please try again.');
        btn.disabled = false;
      }
    });
  });

  /* ---- auth-aware UI ---- */
  const guestEls = document.querySelectorAll('[data-auth="guest"]');
  const authEls = document.querySelectorAll('[data-auth="authenticated"]');

  const render = (state) => {
    if (state.status === 'loading') {
      // keep both hidden until we know
      guestEls.forEach((el) => (el.style.display = 'none'));
      authEls.forEach((el) => (el.style.display = 'none'));
      return;
    }
    if (state.status === 'authenticated' && state.user) {
      guestEls.forEach((el) => (el.style.display = 'none'));
      authEls.forEach((el) => (el.style.display = ''));
      // fill in user name + initial
      const initial = (state.user.fullName || 'U').trim().charAt(0).toUpperCase();
      document.querySelectorAll('[data-user-initial]').forEach((el) => {
        el.textContent = initial;
      });
      document.querySelectorAll('[data-user-name]').forEach((el) => {
        el.textContent = state.user.fullName || 'Account';
      });
      document.querySelectorAll('[data-user-email]').forEach((el) => {
        if (el.tagName === 'A') el.textContent = state.user.email || '';
      });
    } else {
      authEls.forEach((el) => (el.style.display = 'none'));
      guestEls.forEach((el) => (el.style.display = ''));
    }
  };

  subscribe(render);
  render(getAuthState());
}
