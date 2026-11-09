/**
 * Login page.
 * Uses the existing auth core (core/auth.js login + session persistence).
 * Redirects by role after sign-in: customer → next/home, admin → admin
 * dashboard, staff → booking lookup. Honors the `next` parameter.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl, navigate, safeNext, queryParams } from "../core/router-helpers.js";
import { login } from "../core/auth.js";
import { listMovies } from "../services/movies.service.js";
import { setButtonLoading } from "../components/loader.js";
import { toast } from "../components/toast.js";
import { friendlyMessage } from "../core/api.js";
import { qs } from "../utils/dom.js";
import { validators, validateFields, applyApiErrorToForm } from "../utils/validators.js";
import { icons } from "../components/icons.js";

function wirePasswordToggles() {
  document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      btn.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
    });
  });
}

/** Fill the decorative film-strip with real now-showing posters. */
async function decorateReel() {
  const reel = qs("#auth-reel");
  if (!reel) return;
  try {
    const { data } = await listMovies({ status: "now_showing", page: 1, limit: 3 });
    const frames = reel.querySelectorAll(".auth-brand__frame");
    data.slice(0, 3).forEach((movie, i) => {
      if (!frames[i] || !movie.posterUrl) return;
      const img = document.createElement("img");
      img.src = movie.posterUrl;
      img.alt = "";
      frames[i].append(img);
    });
  } catch { /* decorative only */ }
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = qs("#login-form");
  const button = qs("#login-submit");

  const fields = [
    { name: "email", value: form.email.value, rules: [validators.email()] },
    { name: "password", value: form.password.value, rules: [validators.required("Password")] },
  ];
  const { valid } = validateFields(form, fields);
  if (!valid) return;

  setButtonLoading(button, true, "Signing in…");
  try {
    const user = await login(form.email.value.trim(), form.password.value);

    let target;
    if (user.role === "admin") target = PAGES.adminDashboard;
    else if (user.role === "staff") target = PAGES.staffLookup;
    else {
      const { next } = queryParams({ next: "string" });
      target = safeNext(next, PAGES.home);
    }

    toast.success(`Welcome back, ${user.fullName || user.email}!`);
    setTimeout(() => navigate(target), 600);
  } catch (error) {
    setButtonLoading(button, false);
    if (!applyApiErrorToForm(form, error)) {
      toast.error(friendlyMessage(error));
    }
  }
}

async function main() {
  await initPage({ auth: "guest" });
  wirePasswordToggles();
  decorateReel();
  qs("#login-form").addEventListener("submit", handleSubmit);
}

main();
