/**
 * Client-side form validators.
 * Mirrors the backend (zod) rules so users get instant feedback,
 * while the backend remains the final authority.
 */

export const validators = {
  required: (label = "This field") => (value) =>
    String(value ?? "").trim().length ? null : `${label} is required`,

  email: () => (value) => {
    const v = String(value ?? "").trim();
    if (!v) return "Email is required";
    if (v.length > 254) return "Email is too long";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : "Enter a valid email address";
  },

  password: () => (value) => {
    const v = String(value ?? "");
    if (!v) return "Password is required";
    if (v.length < 8) return "Password must be at least 8 characters";
    if (v.length > 128) return "Password must be at most 128 characters";
    return null;
  },

  minPassword: () => (value) => {
    const v = String(value ?? "");
    if (!v) return "Password is required";
    if (v.length < 12) return "Password must be at least 12 characters";
    if (v.length > 128) return "Password must be at most 128 characters";
    return null;
  },

  fullName: () => (value) => {
    const v = String(value ?? "").trim();
    if (!v) return "Full name is required";
    if (v.length > 100) return "Full name must be at most 100 characters";
    return null;
  },

  title: () => (value) => {
    const v = String(value ?? "").trim();
    if (!v) return "Title is required";
    if (v.length > 200) return "Title must be at most 200 characters";
    return null;
  },

  duration: () => (value) => {
    if (value === "" || value === null || value === undefined) return "Duration is required";
    const n = Number(value);
    if (!Number.isInteger(n)) return "Duration must be a whole number of minutes";
    if (n < 1 || n > 600) return "Duration must be between 1 and 600 minutes";
    return null;
  },

  maxLength: (max, label = "This field") => (value) => {
    const v = String(value ?? "").trim();
    if (v.length > max) return `${label} must be at most ${max} characters`;
    return null;
  },

  url: (label = "This field") => (value) => {
    const v = String(value ?? "").trim();
    if (!v) return null; // optional by default
    if (v.length > 2048) return `${label} is too long`;
    try {
      const u = new URL(v);
      if (!/^https?:$/.test(u.protocol)) return `${label} must start with http:// or https://`;
      return null;
    } catch {
      return `${label} must be a valid URL`;
    }
  },

  dateISO: (label = "This field") => (value) => {
    const v = String(value ?? "").trim();
    if (!v) return null; // optional
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return `${label} must use the YYYY-MM-DD format`;
    const d = new Date(`${v}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? `${label} is not a valid date` : null;
  },

  numberRange: (min, max, label = "This field", { required = true, integer = false } = {}) => (value) => {
    const raw = String(value ?? "").trim();
    if (!raw) return required ? `${label} is required` : null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return `${label} must be a number`;
    if (integer && !Number.isInteger(n)) return `${label} must be a whole number`;
    if (n < min) return `${label} must be at least ${min}`;
    if (n > max) return `${label} must be at most ${max}`;
    return null;
  },

  screenName: () => (value) => {
    const v = String(value ?? "").trim();
    if (!v) return "Screen name is required";
    if (v.length > 50) return "Screen name must be at most 50 characters";
    return null;
  },
};

/**
 * Validate a set of fields against rules and paint field errors.
 * @param {HTMLFormElement} form
 * @param {Array<{name:string, value:any, rules:Array<Function>}>} fields
 * @returns {{valid: boolean, errors: Object<string,string>}}
 */
export function validateFields(form, fields) {
  const errors = {};
  for (const field of fields) {
    for (const rule of field.rules) {
      const message = rule(field.value);
      if (message) { errors[field.name] = message; break; }
    }
  }
  paintFieldErrors(form, errors);
  return { valid: Object.keys(errors).length === 0, errors };
}

/** Paint server-side validation details ({field, message}[]) onto a form. */
export function paintServerDetails(form, details) {
  const errors = {};
  for (const d of details || []) {
    if (d.field) errors[d.field.split(".")[0]] = d.message;
  }
  paintFieldErrors(form, errors);
  return errors;
}

/** Clear previous errors, then set new ones. */
export function paintFieldErrors(form, errors = {}) {
  form.querySelectorAll(".field-error").forEach((n) => { n.textContent = ""; });
  form.querySelectorAll(".form-input, .form-select, .form-textarea").forEach((n) => {
    n.classList.remove("is-invalid");
  });
  for (const [name, message] of Object.entries(errors)) {
    const input = form.querySelector(`[name="${name}"]`);
    if (!input) continue;
    input.classList.add("is-invalid");
    const errorNode = input.closest(".form-field")?.querySelector(".field-error");
    if (errorNode) errorNode.textContent = message;
  }
}

/** Apply a backend API error to a form (validation details / field errors). */
export function applyApiErrorToForm(form, error) {
  if (error && error.code === "VALIDATION_ERROR" && error.details) {
    paintServerDetails(form, error.details);
    return true;
  }
  // Field-specific conflicts (EMAIL_TAKEN, SCREEN_NAME_TAKEN…)
  const fieldName = error && { EMAIL_TAKEN: "email", SCREEN_NAME_TAKEN: "name" }[error.code];
  if (fieldName) {
    paintFieldErrors(form, { [fieldName]: error.friendly || error.message });
    return true;
  }
  return false;
}
