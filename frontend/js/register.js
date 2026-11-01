/**
 * Register page logic.
 *  - validates full name, email, password (8–128), confirm password (frontend only)
 *  - show/hide password toggles for both password fields
 *  - password strength meter
 *  - calls the real backend via auth.register(); sends ONLY fullName, email, password
 *  - on success: toast + redirect to login.html (backend does NOT auto-login)
 *  - handles duplicate email, validation, network errors
 */
import { register } from './auth.js';
import { toast } from './toast.js';
import { initNavbar } from './navbar.js';
import {
  validateFullName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
  passwordStrength,
  extractApiError,
} from './validation.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();

  const form = document.getElementById('register-form');
  const fullNameInput = document.getElementById('fullName');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const confirmInput = document.getElementById('confirmPassword');

  const fullNameError = document.getElementById('fullName-error');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const confirmError = document.getElementById('confirmPassword-error');
  const formError = document.getElementById('form-error');
  const formErrorText = document.getElementById('form-error-text');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');

  const pwBars = document.getElementById('pw-bars');
  const pwLabel = document.getElementById('pw-label');

  // show/hide toggles
  setupToggle('password-toggle', 'password-toggle-icon', passwordInput);
  setupToggle('confirm-toggle', 'confirm-toggle-icon', confirmInput);

  // password strength meter
  passwordInput.addEventListener('input', () => {
    updateStrength(passwordInput.value);
    // re-validate confirm if it has a value
    if (confirmInput.value) {
      const cErr = validateConfirmPassword(passwordInput.value, confirmInput.value);
      if (cErr) showFieldError(confirmInput, confirmError, cErr);
      else clearFieldError(confirmInput, confirmError);
    }
    clearErrors();
  });

  [fullNameInput, emailInput, confirmInput].forEach((input) => {
    input.addEventListener('input', clearErrors);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const fullNameVal = fullNameInput.value.trim();
    const emailVal = emailInput.value.trim();
    const passwordVal = passwordInput.value;
    const confirmVal = confirmInput.value;

    const errors = {
      fullName: validateFullName(fullNameVal),
      email: validateEmail(emailVal),
      password: validatePassword(passwordVal),
      confirmPassword: validateConfirmPassword(passwordVal, confirmVal),
    };

    let hasError = false;
    if (errors.fullName) {
      showFieldError(fullNameInput, fullNameError, errors.fullName);
      hasError = true;
    }
    if (errors.email) {
      showFieldError(emailInput, emailError, errors.email);
      hasError = true;
    }
    if (errors.password) {
      showFieldError(passwordInput, passwordError, errors.password);
      hasError = true;
    }
    if (errors.confirmPassword) {
      showFieldError(confirmInput, confirmError, errors.confirmPassword);
      hasError = true;
    }
    if (hasError) return;

    // loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    btnText.textContent = 'Creating account…';

    try {
      // Send ONLY fullName, email, password — no confirmPassword, no role.
      await register({ fullName: fullNameVal, email: emailVal, password: passwordVal });
      toast.success('Account created successfully. Please sign in.', 'Welcome aboard');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 800);
    } catch (err) {
      const msg = extractApiError(err, 'Unable to create your account. Please try again.');
      if (err?.status === 409 || /already exist|in use/i.test(msg)) {
        showFieldError(emailInput, emailError, 'This email is already registered.');
      }
      formErrorText.textContent = msg;
      formError.classList.add('show');
      toast.error(msg, 'Registration failed');
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      btnText.textContent = 'Create account';
    }
  });

  /* ---------- helpers ---------- */
  function setupToggle(btnId, iconId, input) {
    const btn = document.getElementById(btnId);
    const icon = document.getElementById(iconId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isPw = input.type === 'password';
      input.type = isPw ? 'text' : 'password';
      icon.innerHTML = isPw ? eyeOffSvg : eyeSvg;
      btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
    });
  }

  function updateStrength(pw) {
    if (!pwBars) return;
    const { score, label } = passwordStrength(pw);
    [0, 1, 2, 3].forEach((i) => {
      const bar = pwBars.children[i];
      bar.className = ''; // reset
      if (score > i) bar.classList.add(`s${score}`);
    });
    pwLabel.textContent = label;
    pwLabel.style.color =
      score >= 4
        ? 'var(--success)'
        : score >= 3
          ? 'var(--text-secondary)'
          : score >= 2
            ? 'var(--text-secondary)'
            : 'var(--text-secondary)';
  }

  function clearErrors() {
    [
      [fullNameInput, fullNameError],
      [emailInput, emailError],
      [passwordInput, passwordError],
      [confirmInput, confirmError],
    ].forEach(([input, errEl]) => clearFieldError(input, errEl));
    formError.classList.remove('show');
  }

  function clearFieldError(input, errEl) {
    errEl.textContent = '';
    errEl.classList.remove('show');
    input.classList.remove('has-error');
  }

  function showFieldError(input, errEl, msg) {
    errEl.textContent = msg;
    errEl.classList.add('show');
    input.classList.add('has-error');
  }
});

const eyeSvg =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOffSvg =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';
