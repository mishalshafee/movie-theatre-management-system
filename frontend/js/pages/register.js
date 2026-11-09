/**
 * Registration page.
 * Payload mirrors the backend register schema exactly: { fullName, email,
 * password } — confirmPassword is validated in the browser only and never
 * sent. Shows a password strength meter, inline errors and API conflicts
 * (EMAIL_TAKEN). The backend does NOT auto-login, so on success we route
 * to the login page with a success toast.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { navigate, queryParams } from "../core/router-helpers.js";
import { register } from "../core/auth.js";
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

function passwordStrength(value) {
  let score = 0;
  if (value.length >= 8) score++;
  if (value.length >= 12) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value) && /[^A-Za-z0-9]/.test(value)) score++;
  return score;
}

function wireStrengthMeter() {
  const input = qs("#reg-password");
  const meter = qs("#strength-meter");
  const bars = meter.querySelectorAll(".strength-meter__bar");
  const label = meter.querySelector(".strength-meter__label");
  const labels = ["Too short", "Weak", "Fair", "Good", "Strong"];

  input.addEventListener("input", () => {
    const value = input.value;
    meter.hidden = value.length === 0;
    const score = value.length ? passwordStrength(value) : 0;
    bars.forEach((bar, i) => {
      bar.className = "strength-meter__bar" + (i < score ? ` is-filled-${score}` : "");
    });
    label.textContent = value.length ? `Password strength: ${labels[score]}` : "Password strength";
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
  const form = qs("#register-form");
  const button = qs("#register-submit");

  const fullName = form.fullName.value.trim();
  const email = form.email.value.trim();
  const password = form.password.value;
  const confirm = form.confirmPassword.value;

  const fields = [
    { name: "fullName", value: fullName, rules: [validators.fullName()] },
    { name: "email", value: email, rules: [validators.email()] },
    { name: "password", value: password, rules: [validators.password()] },
    { name: "confirmPassword", value: confirm, rules: [(v) => v === password ? null : "Passwords do not match"] },
  ];
  const { valid } = validateFields(form, fields);
  if (!valid) return;

  setButtonLoading(button, true, "Creating account…");
  try {
    // Backend payload: { fullName, email, password } only.
    await register({ fullName, email, password });
    toast.success("Account created — sign in to start booking!");
    const { next } = queryParams({ next: "string" });
    setTimeout(() => navigate(`${PAGES.login}${next ? `?next=${encodeURIComponent(next)}` : ""}`), 700);
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
  wireStrengthMeter();
  decorateReel();
  qs("#register-form").addEventListener("submit", handleSubmit);
}

main();
