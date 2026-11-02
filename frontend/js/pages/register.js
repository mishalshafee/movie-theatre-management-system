/**
 * Registration page.
 * Sends { fullName, email, password } — confirmPassword is frontend-only.
 * The backend does not auto-login, so success redirects to the login page.
 */

import { initPage } from "../core/session.js";
import { register } from "../core/auth.js";
import { friendlyMessage } from "../core/api.js";
import { navigate, resolveUrl, currentPath } from "../core/router-helpers.js";
import { PAGES } from "../config.js";
import { validators, validateFields, applyApiErrorToForm } from "../utils/validators.js";
import { setButtonLoading } from "../components/loader.js";
import { toast } from "../components/toast.js";
import { qs } from "../utils/dom.js";
import { icons } from "../components/icons.js";

function wirePasswordToggle(form) {
  const toggle = form.querySelector("[data-password-toggle]");
  const input = form.querySelector("[data-password-input]");
  toggle?.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.innerHTML = show ? icons.eyeOff({ size: 18 }) : icons.eye({ size: 18 });
    toggle.setAttribute("aria-label", show ? "Hide password" : "Show password");
    input.focus({ preventScroll: true });
  });
}

async function main() {
  await initPage({ auth: "guest" });

  const form = qs("#register-form");
  if (!form) return;
  wirePasswordToggle(form);
  const strengthBar = qs("#password-strength");

  // Live password strength meter (frontend hint only).
  form.password.addEventListener("input", () => {
    const value = form.password.value;
    let score = 0;
    if (value.length >= 8) score++;
    if (value.length >= 12) score++;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
    if (/\d/.test(value) || /[^A-Za-z0-9]/.test(value)) score++;
    strengthBar.dataset.score = String(value ? Math.max(1, score) : 0);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const fullName = form.fullName.value;
    const email = form.email.value;
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;

    const { valid } = validateFields(form, [
      { name: "fullName", value: fullName, rules: [validators.fullName()] },
      { name: "email", value: email, rules: [validators.email()] },
      { name: "password", value: password, rules: [validators.password()] },
      {
        name: "confirmPassword",
        value: confirmPassword,
        rules: [(v) => (v === password ? null : "Passwords do not match")],
      },
    ]);
    if (!valid) return;

    setButtonLoading(submit, true, "Creating account…");
    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
      });
      toast.success("Account created! Please sign in.");
      setTimeout(() => {
        navigate(`${PAGES.login}?registered=1&next=${encodeURIComponent(currentPath().replace(/^register\.html\??/, ""))}`);
      }, 600);
    } catch (error) {
      setButtonLoading(submit, false);
      if (!applyApiErrorToForm(form, error)) {
        toast.error(friendlyMessage(error));
      }
    }
  });

  qs("#login-link")?.setAttribute("href", resolveUrl(PAGES.login));
}

main();
