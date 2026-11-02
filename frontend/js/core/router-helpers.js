/**
 * URL / navigation helpers.
 */

/**
 * Read typed query parameters from the current URL.
 * @param {object} defs  { key: "string" | "number" | "uuid" }
 */
export function queryParams(defs = {}) {
  const params = new URLSearchParams(location.search);
  const out = {};
  for (const [key, type] of Object.entries(defs)) {
    const raw = params.get(key);
    if (raw === null) continue;
    if (type === "number") {
      const n = Number(raw);
      if (Number.isFinite(n) && n > 0) out[key] = n;
    } else {
      out[key] = raw;
    }
  }
  return out;
}

/** Set a query string from an object (null/undefined values dropped). */
export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined && value !== "") search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Navigate to a page. Accepts "movie-details.html?id=…" style targets.
 * Relative to the frontend root so it works from /admin/ and /staff/ too.
 */
export function navigate(target) {
  window.location.href = resolveUrl(target);
}

/**
 * Resolve a root-relative frontend URL from any subfolder or hosting root.
 * - Inside /admin/ or /staff/ subfolder -> prepend "../"
 * - Inside root (or /frontend/) -> no prefix, keeping links within current directory
 */
export function resolveUrl(target) {
  if (!target) return "";
  if (/^https?:\/\//i.test(target) || target.startsWith("#") || target.startsWith("mailto:") || target.startsWith("tel:")) {
    return target;
  }

  const cleanTarget = target.replace(/^\.?\//, "");
  const path = location.pathname.toLowerCase();
  const isInSubfolder = path.includes("/admin/") || path.includes("/staff/");
  const prefix = isInSubfolder ? "../" : "";

  return prefix + cleanTarget;
}

/**
 * Validate a post-login redirect target (the `next` query parameter).
 * Only allow internal, relative paths to prevent open redirects.
 */
export function safeNext(raw, fallback = "index.html") {
  if (!raw) return fallback;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  if (/^[a-zA-Z0-9._/-]+\.html(\?[A-Za-z0-9=&%._:-]*)?$/.test(raw)) return raw;
  return fallback;
}

/** Current URL without host, normalized to relative page name, used to build `next` parameters. */
export function currentPath() {
  const path = location.pathname;
  if (path.includes("/admin/")) {
    return "admin/" + path.split("/admin/")[1] + location.search;
  }
  if (path.includes("/staff/")) {
    return "staff/" + path.split("/staff/")[1] + location.search;
  }
  const file = path.split("/").pop() || "index.html";
  return file + location.search;
}
