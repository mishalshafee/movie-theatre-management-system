/**
 * Login page.
 */

import { initPage } from "../core/session.js";
import { login } from "../core/auth.js";
import { friendlyMessage } from "../core/api.js";
import { navigate, safeNext, resolveUrl, currentPath } from "../core/router-helpers.js";
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

function landingFor(user, next) {
  if (next) return next;
  if (user.role === "admin") return PAGES.adminDashboard;
  if (user.role === "staff") return PAGES.staffLookup;
  return PAGES.home;
}

async function main() {
  const { user } = await initPage({ auth: "guest" });

  // Show "registration succeeded" hint when arriving from register.html
  const params = new URLSearchParams(location.search);
  if (params.get("registered") === "1") {
    toast.success("Account created! Sign in with your new credentials.");
  }

  const form = qs("#login-form");
  if (!form) return;
  wirePasswordToggle(form);
  // Only honour ?next= when actually present; otherwise null = role-based landing.
  const rawNext = params.get("next");
  const next = rawNext ? safeNext(rawNext) : null;

  // Already signed in (e.g. navigating back) → leave immediately.
  if (user) { navigate(landingFor(user, next)); return; }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = form.querySelector('[type="submit"]');
    const email = form.email.value;
    const password = form.password.value;

    const { valid } = validateFields(form, [
      { name: "email", value: email, rules: [validators.email()] },
      { name: "password", value: password, rules: [validators.required("Password")] },
    ]);
    if (!valid) return;

    setButtonLoading(submit, true, "Signing in…");
    try {
      const signedIn = await login(email.trim(), password);
      toast.success(`Welcome back, ${signedIn.fullName || signedIn.email}!`);
      setTimeout(() => navigate(landingFor(signedIn, next)), 500);
    } catch (error) {
      setButtonLoading(submit, false);
      if (!applyApiErrorToForm(form, error)) {
        if (error.code === "INVALID_CREDENTIALS") {
          form.querySelector(".form-alert").textContent = friendlyMessage(error);
          form.querySelector(".form-alert").hidden = false;
        } else {
          toast.error(friendlyMessage(error));
        }
      }
    }
  });

  // Pre-fill demo hint if the URL carries ?demo=admin (used by docs/testing).
  if (params.get("demo")) {
    form.email.value = "";
  }

  qs("#to-register")?.addEventListener("click", () => {
    navigate(`${PAGES.register}?next=${encodeURIComponent(next || currentPath())}`);
  });
  qs("#register-link")?.setAttribute("href", resolveUrl(PAGES.register));
}

main();
