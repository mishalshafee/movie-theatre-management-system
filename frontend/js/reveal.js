/**
 * Scroll-reveal animations using IntersectionObserver.
 * Replaces Framer Motion's whileInView for pure JS.
 *
 * Any element with [data-reveal] animates in when it enters the viewport.
 * Optional [data-reveal-delay="1..6"] staggers siblings.
 */
export function initReveal() {
  const els = document.querySelectorAll('[data-reveal]');
  if (!els.length) return;

  // If IntersectionObserver isn't supported, show everything.
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-visible'));
    return;
  }

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

  els.forEach((el) => observer.observe(el));
}

/** Add a page-load entrance class to the main content wrapper. */
export function initPageEnter(selector = '.page-enter') {
  const el = document.querySelector(selector);
  if (el) {
    // re-trigger animation
    el.classList.remove('page-enter');
    void el.offsetWidth;
    el.classList.add('page-enter');
  }
}
