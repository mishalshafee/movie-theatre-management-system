/**
 * Admin · Screen management.
 * Create (name, rows A–Z, seatsPerRow 1–40, premiumRows ⊂ rows) with a live
 * seat-layout preview; rename-only PATCH; details viewer; delete with
 * IN_USE handling. No seat-level edit/delete APIs exist in the backend, so
 * none is offered.
 */

import { initPage } from "../core/session.js";
import { renderAdminShell } from "../components/admin-shell.js";
import { listScreens, getScreen, createScreen, renameScreen, deleteScreen } from "../services/screens.service.js";
import { openModal, confirmDialog } from "../components/modal.js";
import { setButtonLoading, skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { toast } from "../components/toast.js";
import { friendlyMessage } from "../core/api.js";
import { validators, validateFields, applyApiErrorToForm } from "../utils/validators.js";
import { qs, clear, escapeHtml, el } from "../utils/dom.js";
import { icons } from "../components/icons.js";

const ALL_ROWS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/* ------------------------------------------------------------------ *
 * Listing
 * ------------------------------------------------------------------ */

async function loadScreens() {
  const grid = qs("#screens-grid");
  grid.innerHTML = skeletonHTML("cards", 3);

  try {
    const screens = await listScreens();
    clear(grid);
    if (!screens.length) {
      grid.innerHTML = emptyStateHTML({
        icon: "screen",
        title: "No screens yet",
        message: "Create your first auditorium to start scheduling showtimes.",
        actionLabel: "Add screen",
      });
      grid.querySelector(".btn")?.addEventListener("click", () => openCreateModal());
      return;
    }
    screens.forEach((screen, index) => {
      const card = el("article", { class: "screen-card", dataset: { reveal: "" } });
      if (index) card.dataset.revealDelay = String(Math.min(index * 60, 300));
      card.innerHTML = `
        <div class="screen-card__head">
          <span class="screen-card__icon">${icons.screen({ size: 20 })}</span>
          <div>
            <h3 class="screen-card__name">${escapeHtml(screen.name)}</h3>
            <span class="screen-card__seats">${screen.seatCount} seats</span>
          </div>
        </div>
        <div class="screen-card__actions">
          <button type="button" class="btn btn--secondary btn--sm" data-action="details">View layout</button>
          <button type="button" class="icon-button" data-action="rename" aria-label="Rename ${escapeHtml(screen.name)}">${icons.edit({ size: 15 })}</button>
          <button type="button" class="icon-button icon-button--danger" data-action="delete" aria-label="Delete ${escapeHtml(screen.name)}">${icons.trash({ size: 15 })}</button>
        </div>`;
      card.querySelector('[data-action="details"]').addEventListener("click", () => openDetailsModal(screen));
      card.querySelector('[data-action="rename"]').addEventListener("click", () => openRenameModal(screen));
      card.querySelector('[data-action="delete"]').addEventListener("click", () => removeScreen(screen));
      grid.append(card);
    });
  } catch (error) {
    clear(grid);
    grid.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    grid.querySelector(".js-retry")?.addEventListener("click", loadScreens);
  }
}

/* ------------------------------------------------------------------ *
 * Create modal with live seat-map preview
 * ------------------------------------------------------------------ */

function createFormHTML() {
  return `
    <form id="screen-form" class="form" novalidate>
      <div class="form-field">
        <label class="form-label" for="s-name">Screen name <span class="req">*</span></label>
        <input class="form-input" id="s-name" name="name" maxlength="50" placeholder="Screen 01" required>
        <p class="field-error" aria-live="polite"></p>
      </div>

      <div class="form-field">
        <span class="form-label">Rows (A–Z, pick one or more) <span class="req">*</span></span>
        <div class="row-picker" id="row-picker" role="group" aria-label="Row letters">
          ${ALL_ROWS.map((L) => `<button type="button" class="row-letter" data-row="${L}" aria-pressed="false">${L}</button>`).join("")}
        </div>
        <p class="field-hint">Click letters in the physical order of the auditorium.</p>
        <p class="field-error" aria-live="polite"></p>
      </div>

      <div class="form-grid-2">
        <div class="form-field">
          <label class="form-label" for="s-seats">Seats per row (1–40) <span class="req">*</span></label>
          <input class="form-input" id="s-seats" name="seatsPerRow" type="number" min="1" max="40" value="12" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <span class="form-label">Premium rows</span>
          <div class="premium-picker" id="premium-picker"><span class="field-hint">Select rows above first</span></div>
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>

      <div class="screen-preview">
        <p class="screen-preview__title">${icons.screen({ size: 15 })} Live layout preview</p>
        <div class="screen-preview__screen" aria-hidden="true"></div>
        <div class="screen-preview__map" id="screen-preview-map" aria-hidden="true"></div>
        <p class="screen-preview__count" id="screen-preview-count">0 seats</p>
      </div>
      <p class="form-alert" hidden></p>
    </form>`;
}

function wireCreateForm(modal) {
  const form = modal.body.querySelector("#screen-form");
  const pickedRows = [];
  const premiumRows = new Set();

  const rowPicker = form.querySelector("#row-picker");
  const premiumPicker = form.querySelector("#premium-picker");
  const previewMap = form.querySelector("#screen-preview-map");
  const previewCount = form.querySelector("#screen-preview-count");

  const renderPremium = () => {
    if (!pickedRows.length) {
      premiumPicker.innerHTML = '<span class="field-hint">Select rows above first</span>';
      return;
    }
    premiumPicker.innerHTML = pickedRows.map((L) => `
      <button type="button" class="row-letter${premiumRows.has(L) ? " is-premium" : ""}" data-premium="${L}" aria-pressed="${premiumRows.has(L)}">${L}</button>`).join("");
    premiumPicker.querySelectorAll("[data-premium]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const L = btn.dataset.premium;
        if (premiumRows.has(L)) premiumRows.delete(L);
        else premiumRows.add(L);
        renderPremium();
        renderPreview();
      });
    });
  };

  const renderPreview = () => {
    const seats = Number(form.querySelector("#s-seats").value) || 0;
    const seatMax = Math.min(seats, 20); // keep the preview readable
    previewMap.innerHTML = pickedRows.map((L) => `
      <div class="screen-preview__row">
        <span>${L}</span>
        <span class="screen-preview__seats">
          ${Array.from({ length: seatMax }, (_, i) =>
            `<i class="${premiumRows.has(L) ? "is-premium" : ""}" title="${L}${i + 1}"></i>`).join("")}
          ${seats > seatMax ? `<em>+${seats - seatMax}</em>` : ""}
        </span>
      </div>`).join("") || '<p class="field-hint">Pick rows to preview the layout.</p>';
    previewCount.textContent = `${pickedRows.length * Math.max(0, Math.min(40, seats))} seats`;
  };

  rowPicker.querySelectorAll("[data-row]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const L = btn.dataset.row;
      const idx = pickedRows.indexOf(L);
      if (idx >= 0) {
        pickedRows.splice(idx, 1);
        premiumRows.delete(L);
        btn.classList.remove("is-picked", "is-premium");
        btn.setAttribute("aria-pressed", "false");
      } else {
        pickedRows.push(L);
        btn.classList.add("is-picked");
        btn.setAttribute("aria-pressed", "true");
      }
      renderPremium();
      renderPreview();
    });
  });

  form.querySelector("#s-seats").addEventListener("input", renderPreview);
  renderPremium();
  renderPreview();

  return { form, pickedRows, premiumRows };
}

function openCreateModal() {
  const modal = openModal({
    title: "Create a new screen",
    size: "lg",
    content: createFormHTML(),
    actions: [
      { label: "Cancel", kind: "secondary" },
      {
        label: "Create screen",
        kind: "primary",
        closeOnClick: false,
        onClick: (button) => submitCreate(modal, button),
      },
    ],
  });
  const wiring = wireCreateForm(modal);
  // Keep the picker state reachable for submitCreate (it must not re-wire
  // the form, which would reset the picked rows).
  modal.body.querySelector("#screen-form").__wiring = wiring;
}

async function submitCreate(modal, button) {
  const form = modal.body.querySelector("#screen-form");
  const { pickedRows, premiumRows } = form.__wiring;
  const name = form.name.value.trim();
  const seatsPerRow = form.seatsPerRow.value === "" ? "" : Number(form.seatsPerRow.value);

  const errors = {};
  const nameCheck = validators.screenName()(name);
  if (nameCheck) errors.name = nameCheck;
  const seatsCheck = validators.numberRange(1, 40, "Seats per row", { integer: true })(seatsPerRow);
  if (seatsCheck) errors.seatsPerRow = seatsCheck;
  if (!pickedRows.length) errors.rows = "Select at least one row (A–Z)";
  if (pickedRows.length > 26) errors.rows = "A screen can have at most 26 rows";
  // duplicate letters are impossible with a picker, but keep parity with backend
  if (new Set(pickedRows).size !== pickedRows.length) errors.rows = "Rows must be unique";

  const paint = (errs) => {
    form.querySelectorAll(".field-error").forEach((n) => { n.textContent = ""; });
    for (const [key, message] of Object.entries(errs)) {
      const anchor = form.querySelector(`[name="${key}"]`) ||
        (key === "rows" ? form.querySelector("#row-picker") : key === "premiumRows" ? form.querySelector("#premium-picker") : null);
      anchor?.closest(".form-field")?.querySelector(".field-error")?.append(message);
    }
  };
  paint(errors);
  if (Object.keys(errors).length) return false;

  setButtonLoading(button, true, "Creating…");
  try {
    const screen = await createScreen({
      name,
      rows: [...pickedRows],
      seatsPerRow,
      premiumRows: [...premiumRows],
    });
    toast.success(`Screen “${screen.name}” created with ${screen.rows.reduce((sum, r) => sum + r.seats.length, 0)} seats.`);
    setButtonLoading(button, false);
    loadScreens();
    return true;
  } catch (error) {
    setButtonLoading(button, false);
    if (!applyApiErrorToForm(form, error)) {
      const alert = form.querySelector(".form-alert");
      alert.textContent = friendlyMessage(error);
      alert.hidden = false;
    }
    return false;
  }
}

/* ------------------------------------------------------------------ *
 * Rename / details / delete
 * ------------------------------------------------------------------ */

function openRenameModal(screen) {
  const modal = openModal({
    title: `Rename “${escapeHtml(screen.name)}”`,
    size: "sm",
    content: `
      <form id="rename-form" class="form" novalidate>
        <div class="form-field">
          <label class="form-label" for="r-name">New name <span class="req">*</span></label>
          <input class="form-input" id="r-name" name="name" maxlength="50" value="${escapeHtml(screen.name)}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <p class="form-alert" hidden></p>
      </form>`,
    actions: [
      { label: "Cancel", kind: "secondary" },
      {
        label: "Save name",
        kind: "primary",
        closeOnClick: false,
        onClick: async (button) => {
          const form = modal.body.querySelector("#rename-form");
          const name = form.name.value.trim();
          const { valid } = validateFields(form, [{ name: "name", value: name, rules: [validators.screenName()] }]);
          if (!valid) return false;
          setButtonLoading(button, true, "Saving…");
          try {
            await renameScreen(screen.id, name);
            toast.success("Screen renamed.");
            setButtonLoading(button, false);
            loadScreens();
            return true;
          } catch (error) {
            setButtonLoading(button, false);
            if (!applyApiErrorToForm(form, error)) {
              const alert = form.querySelector(".form-alert");
              alert.textContent = friendlyMessage(error);
              alert.hidden = false;
            }
            return false;
          }
        },
      },
    ],
  });
  return modal;
}

async function openDetailsModal(screen) {
  const modal = openModal({
    title: `Seat layout · ${escapeHtml(screen.name)}`,
    size: "lg",
    content: '<div class="screen-layout-loading">' + skeletonHTML("seatmap") + "</div>",
    actions: [{ label: "Close", kind: "secondary" }],
  });

  try {
    const detailed = await getScreen(screen.id);
    const total = detailed.rows.reduce((sum, r) => sum + r.seats.length, 0);
    const premium = detailed.rows.reduce((sum, r) => sum + r.seats.filter((s) => s.type === "premium").length, 0);
    const accessible = detailed.rows.reduce((sum, r) => sum + r.seats.filter((s) => s.type === "accessible").length, 0);

    const body = modal.body;
    clear(body);
    body.innerHTML = `
      <div class="screen-layout">
        <div class="screen-layout__stats">
          <span><strong>${total}</strong> seats</span>
          <span><strong>${premium}</strong> premium</span>
          <span><strong>${accessible}</strong> accessible</span>
          <span><strong>${detailed.rows.length}</strong> rows</span>
        </div>
        <div class="screen-layout__screen" aria-hidden="true"></div>
        <div class="screen-layout__map">
          ${detailed.rows.map((row) => `
            <div class="screen-layout__row">
              <span class="screen-layout__label">${row.label}</span>
              ${row.seats.map((seat) => `<i class="seat-dot seat-dot--${seat.type}" title="${row.label}${seat.number} (${seat.type})"></i>`).join("")}
              <span class="screen-layout__label">${row.label}</span>
            </div>`).join("")}
        </div>
        <div class="screen-layout__legend">
          <span class="legend-item"><span class="legend-dot legend-dot--available"></span>Standard</span>
          <span class="legend-item"><span class="legend-dot legend-dot--premium"></span>Premium</span>
          ${accessible ? '<span class="legend-item"><span class="legend-dot legend-dot--accessible"></span>Accessible</span>' : ""}
        </div>
      </div>`;
  } catch (error) {
    clear(modal.body);
    modal.body.innerHTML = errorStateHTML({ message: friendlyMessage(error), retry: false });
  }
}

async function removeScreen(screen) {
  const ok = await confirmDialog({
    title: "Delete this screen?",
    message: `“<strong>${escapeHtml(screen.name)}</strong>” (${screen.seatCount} seats) will be permanently removed. Screens with scheduled showtimes cannot be deleted.`,
    confirmLabel: "Delete screen",
  });
  if (!ok) return;
  try {
    await deleteScreen(screen.id);
    toast.success("Screen deleted.");
    loadScreens();
  } catch (error) {
    if (error.code === "IN_USE" || error.status === 500) {
      toast.warning("This screen has showtimes and cannot be deleted. Remove or reschedule its showtimes first.");
    } else {
      toast.error(friendlyMessage(error));
    }
  }
}

/* ------------------------------------------------------------------ */

async function main() {
  const { user, ok } = await initPage({ auth: "admin", chrome: false });
  if (!ok || !user) return;
  renderAdminShell(user, "screens");
  qs("#add-screen-btn").addEventListener("click", () => openCreateModal());
  loadScreens();
}

main();
