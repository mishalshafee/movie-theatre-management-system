/**
 * CineLux — DEMO payment methods.
 *
 * Five fully simulated methods:
 *   1. Credit / Debit Card (local Luhn validation, animated card preview)
 *   2. PayPal (simulated authorization sheet)
 *   3. Google Pay (simulated wallet confirmation)
 *   4. Apple Pay (simulated authorization pulse)
 *   5. Cash at Cinema Counter (demo reservation confirmation)
 *
 * SECURITY / HONESTY CONTRACT:
 *   - No real gateways, SDKs or network calls to payment providers.
 *   - No payment credentials are ever sent to the backend or stored.
 *   - Card form values are wiped after every attempt.
 *   - The ONLY backend call is the existing mock endpoint
 *     POST /api/bookings/:id/pay — performed by the checkout page after
 *     the customer explicitly confirms the demo method.
 *   - A non-sensitive label of the chosen method is kept in sessionStorage
 *     so the ticket can display "Payment Method: … – Demo".
 */

import { icons, contactlessIcon } from "../components/icons.js";
import { escapeHtml } from "../utils/dom.js";
import { formatMoney } from "../utils/formatters.js";

const PAYMENT_LABEL_KEY = "cinelux:demo-payment";

/* ------------------------------------------------------------------ *
 * Method registry
 * ------------------------------------------------------------------ */

export const PAYMENT_METHODS = [
  { id: "card", name: "Card", hint: "Credit / debit", logo: () => icons.pay.visa() },
  { id: "paypal", name: "PayPal", hint: "Demo wallet", logo: () => icons.pay.paypal() },
  { id: "googlepay", name: "Google Pay", hint: "Demo wallet", logo: () => icons.pay.googlePay() },
  { id: "applepay", name: "Apple Pay", hint: "Demo wallet", logo: () => icons.pay.applePay({ width: 44 }) },
  { id: "cash", name: "Cash", hint: "Pay at counter", logo: () => icons.pay.cash() },
];

export const METHOD_LABELS = {
  card: "Credit / Debit Card",
  paypal: "PayPal",
  googlepay: "Google Pay",
  applepay: "Apple Pay",
  cash: "Cash at Cinema Counter",
};

/** Non-sensitive record of the last chosen demo method (for the ticket). */
export function recordDemoPayment(entry) {
  try {
    sessionStorage.setItem(PAYMENT_LABEL_KEY, JSON.stringify({ ...entry, at: Date.now() }));
  } catch { /* storage unavailable — ticket will show a generic label */ }
}

export function getDemoPayment() {
  try {
    const raw = sessionStorage.getItem(PAYMENT_LABEL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDemoPayment() {
  try {
    sessionStorage.removeItem(PAYMENT_LABEL_KEY);
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ *
 * Method selector grid
 * ------------------------------------------------------------------ */

/**
 * Render the payment method selection cards.
 * @param {HTMLElement} host
 * @param {string|null} selectedId
 * @param {(method: object) => void} onSelect
 */
export function renderMethodSelector(host, selectedId, onSelect) {
  host.innerHTML = PAYMENT_METHODS.map((m) => `
    <button type="button" class="pay-method${m.id === selectedId ? " is-selected" : ""}" data-method="${m.id}"
      aria-pressed="${m.id === selectedId}">
      <span class="pay-method__logo">${m.logo()}</span>
      <span class="pay-method__name">${escapeHtml(m.name)}</span>
      <span class="pay-method__hint">${escapeHtml(m.hint)}</span>
    </button>`).join("");

  host.querySelectorAll(".pay-method").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.method;
      host.querySelectorAll(".pay-method").forEach((b) => {
        const selected = b === btn;
        b.classList.toggle("is-selected", selected);
        b.setAttribute("aria-pressed", String(selected));
      });
      const method = PAYMENT_METHODS.find((m) => m.id === id);
      if (method) onSelect(method);
    });
  });
}

/* ------------------------------------------------------------------ *
 * Card helpers (Luhn + brand)
 * ------------------------------------------------------------------ */

export function luhnValid(numberDigits) {
  if (!/^\d{12,19}$/.test(numberDigits)) return false;
  let sum = 0;
  let double = false;
  for (let i = numberDigits.length - 1; i >= 0; i--) {
    let d = Number(numberDigits[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function cardBrand(numberDigits) {
  if (/^4/.test(numberDigits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(numberDigits)) return "mastercard";
  if (/^3[47]/.test(numberDigits)) return "amex";
  return null;
}

const brandMark = (brand) => {
  if (brand === "visa") return icons.pay.visa();
  if (brand === "mastercard") return icons.pay.mastercard();
  if (brand === "amex") return icons.pay.amex();
  return icons.card({ size: 26 });
};

const formatCardNumber = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  const groups = [];
  for (let i = 0; i < digits.length; i += 4) groups.push(digits.slice(i, i + 4));
  return groups.join(" ");
};

const formatExpiry = (value) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

/* ------------------------------------------------------------------ *
 * Method panels
 * ------------------------------------------------------------------ */

/**
 * Render the interactive panel for the selected method.
 *
 * @param {HTMLElement} host            container for the panel
 * @param {object} ctx
 *   ctx.methodId     one of card|paypal|googlepay|applepay|cash
 *   ctx.amount       numeric booking total
 *   ctx.bookingCode  booking reference code
 *   ctx.movieTitle   movie title for summaries
 *   ctx.onConfirm    async ({ label }) => boolean — performs POST /pay;
 *                   return true on success, false/throw on failure.
 * @returns {{ destroy(): void }}
 */
export function renderMethodPanel(host, ctx) {
  host.innerHTML = "";
  const builders = {
    card: buildCardPanel,
    paypal: buildPayPalPanel,
    googlepay: buildGooglePayPanel,
    applepay: buildApplePayPanel,
    cash: buildCashPanel,
  };
  const builder = builders[ctx.methodId] || buildCardPanel;
  const node = builder(host, ctx);
  return {
    destroy() {
      wipeInputs(host);
      host.innerHTML = "";
    },
  };
}

/** Remove every typed payment value from the DOM (never stored anywhere). */
function wipeInputs(root) {
  root.querySelectorAll("input").forEach((input) => {
    input.value = "";
  });
}

/** Shared: show processing → await confirm → show success or error. */
async function runPaymentFlow(panel, confirmBtn, ctx, label, { processingText = "Simulating the payment provider. No real money moves." } = {}) {
  if (!confirmBtn || confirmBtn.disabled) return;
  const original = confirmBtn.innerHTML;
  confirmBtn.disabled = true;
  confirmBtn.innerHTML = `<span class="spinner"></span><span>Authorizing…</span>`;

  // Simulated provider latency (purely cosmetic).
  await new Promise((r) => setTimeout(r, 900));

  // The checkout page performs the real POST /api/bookings/:id/pay here.
  let ok = false;
  try {
    ok = (await ctx.onConfirm({ label })) === true;
  } catch {
    ok = false;
  }

  if (ok) {
    confirmBtn.innerHTML = `${icons.check({ size: 16 })} Confirmed`;
    panel.dispatchEvent(new CustomEvent("payment-confirmed", { bubbles: true }));
    return;
  }

  // Failure → restore the button and wipe any sensitive values.
  confirmBtn.disabled = false;
  confirmBtn.innerHTML = original;
  wipeInputs(panel);
}

/* ---------------------------- 9.1 CARD ---------------------------- */

function buildCardPanel(host, ctx) {
  const panel = document.createElement("div");
  panel.className = "pay-form";
  panel.innerHTML = `
    <div class="demo-card" data-demo-card aria-hidden="true">
      <div class="demo-card__top">
        <span class="demo-card__chip-el"></span>
        <span class="demo-card__brand" data-card-brand>${icons.card({ size: 26 })}</span>
      </div>
      <div class="demo-card__number mono" data-card-number>•••• •••• •••• ••••</div>
      <div class="demo-card__bottom">
        <div class="demo-card__field"><span>Card holder</span><strong data-card-name>YOUR NAME</strong></div>
        <span class="demo-card__contactless">${contactlessIcon({ size: 20 })}</span>
        <div class="demo-card__field"><span>Expires</span><strong data-card-exp>MM/YY</strong></div>
      </div>
    </div>

    <form class="form" id="demo-card-form" novalidate autocomplete="off">
      <div class="form-field">
        <label class="form-label" for="cc-name">Cardholder name <span class="req">*</span></label>
        <input class="form-input" id="cc-name" name="name" type="text" inputmode="text" placeholder="e.g. A. Fernando" maxlength="40" spellcheck="false">
        <p class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-field">
        <label class="form-label" for="cc-number">Card number <span class="req">*</span></label>
        <div class="input-group">
          <input class="form-input mono" id="cc-number" name="number" type="text" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="23" spellcheck="false">
          <span class="input-group__action" data-brand-slot>${icons.card({ size: 18 })}</span>
        </div>
        <p class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label" for="cc-exp">Expiry date <span class="req">*</span></label>
          <input class="form-input mono" id="cc-exp" name="expiry" type="text" inputmode="numeric" placeholder="MM/YY" maxlength="5">
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="cc-cvv">CVV <span class="req">*</span></label>
          <div class="input-group">
            <input class="form-input mono" id="cc-cvv" name="cvv" type="password" inputmode="numeric" placeholder="•••" maxlength="4">
            <button type="button" class="input-group__action" data-cvv-toggle aria-label="Show or hide CVV">${icons.eye({ size: 16 })}</button>
          </div>
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>
      <p class="field-hint">${icons.info({ size: 13 })} Synthetic demo details only — try <span class="mono">4242 4242 4242 4242</span>. Nothing is transmitted or stored.</p>
      <button type="submit" class="btn btn--primary btn--lg btn--block" data-pay-confirm>
        ${icons.lock({ size: 16 })} Pay ${formatMoney(ctx.amount)} — Demo
      </button>
    </form>`;
  host.append(panel);

  const numberInput = panel.querySelector("#cc-number");
  const nameInput = panel.querySelector("#cc-name");
  const expInput = panel.querySelector("#cc-exp");
  const cvvInput = panel.querySelector("#cc-cvv");
  const brandEls = panel.querySelectorAll("[data-brand-slot], [data-card-brand]");

  numberInput.addEventListener("input", () => {
    const formatted = formatCardNumber(numberInput.value);
    numberInput.value = formatted;
    const digits = formatted.replace(/\s/g, "");
    panel.querySelector("[data-card-number]").textContent = digits
      ? digits.padEnd(16, "•").replace(/(.{4})/g, "$1 ").trim()
      : "•••• •••• •••• ••••";
    const brand = cardBrand(digits);
    brandEls.forEach((el) => { el.innerHTML = brand ? brandMark(brand) : icons.card({ size: 26 }); });
  });

  nameInput.addEventListener("input", () => {
    panel.querySelector("[data-card-name]").textContent = (nameInput.value || "YOUR NAME").toUpperCase();
  });

  expInput.addEventListener("input", () => {
    expInput.value = formatExpiry(expInput.value);
    panel.querySelector("[data-card-exp]").textContent = expInput.value || "MM/YY";
  });

  panel.querySelector("[data-cvv-toggle]")?.addEventListener("click", () => {
    const hidden = cvvInput.type === "password";
    cvvInput.type = hidden ? "text" : "password";
  });

  panel.querySelector("#demo-card-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const errors = {};
    const name = nameInput.value.trim();
    const digits = numberInput.value.replace(/\D/g, "");
    const expiry = expInput.value.trim();
    const cvv = cvvInput.value.trim();

    if (name.length < 2) errors.name = "Enter the cardholder name shown on the card";
    if (!luhnValid(digits)) errors.number = "Enter a valid card number (try 4242 4242 4242 4242)";
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      errors.expiry = "Use MM/YY";
    } else {
      const [mm, yy] = expiry.split("/").map(Number);
      const expDate = new Date(2000 + yy, mm, 0, 23, 59, 59);
      if (expDate < new Date()) errors.expiry = "This card has expired";
    }
    const brand = cardBrand(digits);
    const cvvLen = brand === "amex" ? 4 : 3;
    if (!new RegExp(`^\\d{${cvvLen}}$`).test(cvv)) errors.cvv = `CVV must be ${cvvLen} digits`;

    paintErrors(panel, errors);
    if (Object.keys(errors).length) return;

    const last4 = digits.slice(-4);
    await runPaymentFlow(panel, panel.querySelector("[data-pay-confirm]"), ctx,
      `Card ${brand ? brand.toUpperCase() : "Card"} •••• ${last4}`,
    );
  });

  return panel;
}

function paintErrors(root, errors) {
  root.querySelectorAll(".field-error").forEach((n) => { n.textContent = ""; });
  root.querySelectorAll(".form-input").forEach((n) => n.classList.remove("is-invalid"));
  for (const [name, message] of Object.entries(errors)) {
    const input = root.querySelector(`[name="${name}"]`);
    if (!input) continue;
    input.classList.add("is-invalid");
    const errorNode = input.closest(".form-field")?.querySelector(".field-error");
    if (errorNode) errorNode.textContent = message;
  }
}

/* ---------------------------- 9.2 PAYPAL ---------------------------- */

function buildPayPalPanel(host, ctx) {
  const panel = document.createElement("div");
  panel.className = "wallet-panel";
  panel.innerHTML = `
    <div class="wallet-panel__brand" style="border-color:#2790C3;">
      ${icons.pay.paypal({ width: 56 })}
      <span class="meta-chip meta-chip--gold">DEMO</span>
    </div>

    <div class="wallet-panel__summary">
      <div class="wallet-panel__summary-row"><span>Movie</span><strong>${escapeHtml(ctx.movieTitle)}</strong></div>
      <div class="wallet-panel__summary-row"><span>Booking reference</span><strong class="mono">${escapeHtml(ctx.bookingCode)}</strong></div>
      <div class="wallet-panel__summary-row wallet-panel__summary-row--total"><span>Total</span><strong>${formatMoney(ctx.amount)}</strong></div>
    </div>

    <div class="wallet-steps" data-steps>
      <div class="wallet-step" data-step="1"><span class="wallet-step__num">1</span><span>Review your order</span></div>
      <div class="wallet-step" data-step="2"><span class="wallet-step__num">2</span><span>Simulated PayPal authorization</span></div>
      <div class="wallet-step" data-step="3"><span class="wallet-step__num">3</span><span>Confirm &amp; finish the demo payment</span></div>
    </div>

    <div data-paypal-stage></div>`;

  const stage = panel.querySelector("[data-paypal-stage]");
  const steps = panel.querySelectorAll(".wallet-step");

  const setStep = (n) => steps.forEach((s) => s.classList.toggle("is-done", Number(s.dataset.step) < n));

  const startBtn = document.createElement("button");
  startBtn.type = "button";
  startBtn.className = "wa-btn wa-btn--paypal wa-btn--block";
  startBtn.innerHTML = `Continue with PayPal — Demo`;
  stage.append(startBtn);
  setStep(1);

  startBtn.addEventListener("click", () => {
    setStep(2);
    stage.innerHTML = `
      <div class="wallet-auth" role="dialog" aria-label="PayPal demo authorization">
        <div class="wallet-auth__head">
          <span class="wallet-auth__title" style="color:#0070BA;">PayPal</span>
          <span class="wallet-auth__demo-badge">DEMO MODE</span>
        </div>
        <p style="color:#5B677D;font-size:0.85rem;">This is a <strong>simulated</strong> PayPal screen. No real PayPal account is contacted and no credentials are requested.</p>
        <div class="wallet-auth__amount">
          <span>Amount due</span>
          ${formatMoney(ctx.amount)}
        </div>
        <div class="wallet-auth__row">
          <label>Demo account</label>
          <div class="value">cinema-fan@demo.example</div>
        </div>
        <div class="wallet-auth__row">
          <label>Paying to</label>
          <div class="value">CineLux Cinemas (Demo Checkout)</div>
        </div>
        <div class="wallet-auth__actions">
          <button type="button" class="wa-btn wa-btn--plain" data-pp-cancel>Cancel</button>
          <button type="button" class="wa-btn wa-btn--paypal" data-pp-approve>Authorize payment</button>
        </div>
      </div>`;

    stage.querySelector("[data-pp-cancel]")?.addEventListener("click", () => {
      setStep(1);
      stage.innerHTML = "";
      stage.append(startBtn);
    });

    stage.querySelector("[data-pp-approve]")?.addEventListener("click", async (event) => {
      const btn = event.currentTarget;
      btn.disabled = true;
      btn.innerHTML = `<span class="processing-dots"><span></span><span></span><span></span></span> Authorizing…`;
      await new Promise((r) => setTimeout(r, 850));
      setStep(3);
      stage.innerHTML = `
        <button type="button" class="btn btn--primary btn--lg btn--block" data-pay-confirm>
          ${icons.check({ size: 16 })} Approve ${formatMoney(ctx.amount)} via PayPal — Demo
        </button>`;
      stage.querySelector("[data-pay-confirm]").addEventListener("click", () => {
        runPaymentFlow(panel, stage.querySelector("[data-pay-confirm]"), ctx, "PayPal");
      });
    });
  });

  host.append(panel);
  return panel;
}

/* ---------------------------- 9.3 GOOGLE PAY ---------------------------- */

function buildGooglePayPanel(host, ctx) {
  const panel = document.createElement("div");
  panel.className = "wallet-panel";
  panel.innerHTML = `
    <div class="wallet-panel__brand">
      ${icons.pay.googlePay({ width: 64 })}
      <span class="meta-chip meta-chip--gold">DEMO</span>
    </div>

    <div class="wallet-panel__summary">
      <div class="wallet-panel__summary-row"><span>Merchant</span><strong>CineLux Cinemas</strong></div>
      <div class="wallet-panel__summary-row"><span>Booking reference</span><strong class="mono">${escapeHtml(ctx.bookingCode)}</strong></div>
      <div class="wallet-panel__summary-row wallet-panel__summary-row--total"><span>Total</span><strong>${formatMoney(ctx.amount)}</strong></div>
    </div>

    <div class="wallet-steps" data-steps>
      <div class="wallet-step is-done" data-step="1"><span class="wallet-step__num">1</span><span>Choose your demo wallet card</span></div>
      <div class="wallet-step" data-step="2"><span class="wallet-step__num">2</span><span>Confirm with Google Pay simulation</span></div>
    </div>

    <label class="wallet-step" style="cursor:pointer;border-color:var(--blue-line);">
      <input type="radio" name="gpay-card" checked style="accent-color:#60A5FA;">
      <span style="display:flex;align-items:center;gap:0.6rem;">
        ${icons.pay.mastercard({ width: 24 })}
        <strong style="color:var(--text);">Demo Wallet Card</strong>
        <span class="mono" style="color:var(--text-2);">•••• 1234</span>
      </span>
      <span style="margin-left:auto;color:var(--blue-strong);font-weight:700;">Default</span>
    </label>

    <button type="button" class="wa-btn wa-btn--google wa-btn--block" data-gpay-confirm>
      Confirm with Google Pay — Demo
    </button>

    <p class="field-hint">${icons.info({ size: 13 })} Simulated wallet confirmation. Google Pay is not contacted; no Google account data is used.</p>`;

  const confirmBtn = panel.querySelector("[data-gpay-confirm]");
  confirmBtn.addEventListener("click", () => {
    panel.querySelector('[data-step="2"]').classList.add("is-done");
    runPaymentFlow(panel, confirmBtn, ctx, "Google Pay", {
      processingText: "Simulated Google Pay authorization. No real transaction.",
    });
  });

  host.append(panel);
  return panel;
}

/* ---------------------------- 9.4 APPLE PAY ---------------------------- */

function buildApplePayPanel(host, ctx) {
  const panel = document.createElement("div");
  panel.className = "wallet-panel";
  panel.innerHTML = `
    <div class="wallet-panel__brand" style="background:#0F1724;border-color:#2A3550;">
      ${icons.pay.applePay({ width: 56 })}
      <span class="meta-chip meta-chip--gold">DEMO</span>
    </div>

    <div class="wallet-panel__summary">
      <div class="wallet-panel__summary-row"><span>Movie</span><strong>${escapeHtml(ctx.movieTitle)}</strong></div>
      <div class="wallet-panel__summary-row"><span>Booking reference</span><strong class="mono">${escapeHtml(ctx.bookingCode)}</strong></div>
      <div class="wallet-panel__summary-row wallet-panel__summary-row--total"><span>Total</span><strong>${formatMoney(ctx.amount)}</strong></div>
    </div>

    <div class="wallet-steps">
      <div class="wallet-step is-done"><span class="wallet-step__num">1</span><span>Review the demo amount</span></div>
      <div class="wallet-step" data-apay-step><span class="wallet-step__num">2</span><span>Authorize with the simulated payment sheet</span></div>
    </div>

    <button type="button" class="wa-btn wa-btn--dark wa-btn--block" data-apay-confirm style="font-size:1.05rem;">
      Pay ${formatMoney(ctx.amount)} with Apple Pay — Demo
    </button>

    <p class="field-hint">${icons.info({ size: 13 })} Simulated authorization only. Apple Wallet, Face ID and real cards are never accessed.</p>`;

  const confirmBtn = panel.querySelector("[data-apay-confirm]");
  confirmBtn.addEventListener("click", () => {
    panel.querySelector("[data-apay-step]")?.classList.add("is-done");
    runPaymentFlow(panel, confirmBtn, ctx, "Apple Pay");
  });

  host.append(panel);
  return panel;
}

/* ---------------------------- 9.5 CASH ---------------------------- */

function buildCashPanel(host, ctx) {
  const panel = document.createElement("div");
  panel.className = "cash-panel";
  panel.innerHTML = `
    <div style="display:flex;gap:1rem;align-items:center;">
      <span class="cash-panel__icon">${icons.banknote({ size: 30 })}</span>
      <div>
        <strong style="font-size:var(--fs-lg);">Pay at Cinema Counter</strong>
        <p class="text-2" style="font-size:var(--fs-sm);margin-top:0.15rem;">You selected the cash-at-counter <strong>demo</strong> option.</p>
      </div>
    </div>

    <dl class="cash-panel__ref">
      <dt>Booking reference</dt>
      <dd>${escapeHtml(ctx.bookingCode)}</dd>
    </dl>

    <div class="wallet-panel__summary" style="background:var(--surface);">
      <div class="wallet-panel__summary-row"><span>Movie</span><strong>${escapeHtml(ctx.movieTitle)}</strong></div>
      <div class="wallet-panel__summary-row wallet-panel__summary-row--total">
        <span>Amount due at counter</span><strong>${formatMoney(ctx.amount)}</strong>
      </div>
    </div>

    <ol class="cash-panel__steps">
      <li>Confirm this demo reservation below — no cash is collected online.</li>
      <li>Your booking is confirmed through the cinema's demo checkout.</li>
      <li>Show the booking reference at the box office on arrival.</li>
    </ol>

    <button type="button" class="btn btn--secondary btn--lg btn--block" data-cash-confirm>
      ${icons.check({ size: 16 })} Confirm Demo Reservation — Pay at Counter
    </button>

    <p class="field-hint" style="text-align:center;">${icons.alert({ size: 13 })} "Cash at Cinema Counter – Demo". No cash was collected.</p>`;

  const confirmBtn = panel.querySelector("[data-cash-confirm]");
  confirmBtn.addEventListener("click", () => {
    runPaymentFlow(panel, confirmBtn, ctx, "Cash at Cinema Counter", {
      processingText: "Confirming your demo reservation through the cinema backend.",
    });
  });

  host.append(panel);
  return panel;
}
