/**
 * Login page logic.
 *  - validates email + password
 *  - show/hide password toggle
 *  - calls the real backend via auth.login()
 *  - loading state, error banner, success toast, redirect to index.html
 *  - navbar init (so the bar reflects auth state on return)
 */
import { login } from './auth.js';
import { toast } from './toast.js';
import { initNavbar } from './navbar.js';
import {
  validateEmail,
  validatePassword,
  extractApiError,
} from './validation.js';

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();

  const form = document.getElementById('login-form');
  const emailInput = document.getElementById('email');
  const passwordInput = document.getElementById('password');
  const emailError = document.getElementById('email-error');
  const passwordError = document.getElementById('password-error');
  const formError = document.getElementById('form-error');
  const formErrorText = document.getElementById('form-error-text');
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');

  // show/hide password
  const toggleBtn = document.getElementById('password-toggle');
  const toggleIcon = document.getElementById('password-toggle-icon');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isPw = passwordInput.type === 'password';
      passwordInput.type = isPw ? 'text' : 'password';
      toggleIcon.innerHTML = isPw ? eyeOffSvg : eyeSvg;
      toggleBtn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
    });
  }

  const clearErrors = () => {
    emailError.textContent = '';
    emailError.classList.remove('show');
    emailInput.classList.remove('has-error');
    passwordError.textContent = '';
    passwordError.classList.remove('show');
    passwordInput.classList.remove('has-error');
    formError.classList.remove('show');
  };

  const showFieldError = (input, errorEl, msg) => {
    errorEl.textContent = msg;
    errorEl.classList.add('show');
    input.classList.add('has-error');
  };

  [emailInput, passwordInput].forEach((input) => {
    input.addEventListener('input', () => {
      clearErrors();
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const emailVal = emailInput.value.trim();
    const passwordVal = passwordInput.value;

    const emailErr = validateEmail(emailVal);
    const passwordErr = validatePassword(passwordVal);

    let hasError = false;
    if (emailErr) {
      showFieldError(emailInput, emailError, emailErr);
      hasError = true;
    }
    if (passwordErr) {
      showFieldError(passwordInput, passwordError, passwordErr);
      hasError = true;
    }
    if (hasError) return;

    // loading state
    submitBtn.disabled = true;
    submitBtn.classList.add('loading');
    btnText.textContent = 'Signing in…';

    try {
      const user = await login({ email: emailVal, password: passwordVal });
      const first = (user?.fullName || 'movie lover').split(' ')[0];
      toast.success(`Welcome back, ${first}!`, 'Signed in');
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 700);
    } catch (err) {
      const msg = extractApiError(err, 'Unable to sign in. Please try again.');
      formErrorText.textContent = msg;
      formError.classList.add('show');
      if (err?.status === 401) {
        showFieldError(
          passwordInput,
          passwordError,
          'Please double-check your email and password.'
        );
      }
      toast.error(msg, 'Sign-in failed');
      submitBtn.disabled = false;
      submitBtn.classList.remove('loading');
      btnText.textContent = 'Sign in';
    }
  });
});

const eyeSvg =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const eyeOffSvg =
  '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';
