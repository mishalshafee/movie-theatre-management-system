/**
 * Scroll-triggered reveal animations via IntersectionObserver.
 * Add `data-reveal` to any element; optional `data-reveal-delay="120"` (ms).
 * Falls back to instantly visible when IntersectionObserver or
 * prefers-reduced-motion is unavailable.
 */

let observer = null;
let mutationReady = false;

/**
 * Watch the DOM for dynamically injected [data-reveal] nodes so pages that
 * render content after boot (hero, grids, tickets…) are revealed too.
 */
function watchMutations() {
  if (mutationReady || !("MutationObserver" in window)) return;
  mutationReady = true;
  let scheduled = false;
  const mo = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      const pending = document.querySelectorAll("[data-reveal]:not(.revealed)");
      pending.forEach((node) => {
        if (observer) observer.observe(node);
        else node.classList.add("revealed");
      });
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
}

export function initRevealOnScroll() {
  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  const elements = document.querySelectorAll("[data-reveal]:not(.revealed)");
  if (reduced || !("IntersectionObserver" in window)) {
    elements.forEach((node) => node.classList.add("revealed"));
    return;
  }
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const delay = Number(entry.target.dataset.revealDelay || 0);
            setTimeout(() => entry.target.classList.add("revealed"), delay);
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" }
    );
  }
  elements.forEach((node) => observer.observe(node));
  watchMutations();
}

/** Re-scan after dynamically injecting content (e.g. movie grids). */
export function refreshReveal(container = document) {
  if (!observer) { initRevealOnScroll(); return; }
  container.querySelectorAll("[data-reveal]:not(.revealed)").forEach((node) => observer.observe(node));
}
