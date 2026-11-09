/**
 * Admin · Screen management.
 * Supports exactly what the backend offers: list, view seat layout,
 * create (name + rows + seatsPerRow + premiumRows), rename, delete
 * (409 IN_USE when showtimes reference the screen).
 * A visual seat-layout preview renders inside the create modal and the
 * view modal from the configured rows — no layout-editing endpoints are
 * invented.
 */

import { initPage } from "../core/session.js";
import { renderAdminShell } from "../components/admin-shell.js";
import { listScreens, getScreen, createScreen, renameScreen, deleteScreen } from "../services/screens.service.js";
import { openModal, confirmDialog } from "../components/modal.js";
import { setButtonLoading, skeletonHTML, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { toast } from "../components/toast.js";
import { friendlyMessage } from "../core/api.js";
import { validators, validateFields, applyApiErrorToForm } from "../utils/validators.js";
import { qs, qsa, clear, escapeHtml, el } from "../utils/dom.js";
import { formatDateShort } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

/* ------------------------------------------------------------------ *
 * Seat layout preview
 * ------------------------------------------------------------------ */

function seatPreviewHTML({ rows, seatsPerRow, premiumRows }) {
  return `
    <div class="seat-preview">
      <div class="seat-preview__screen" aria-hidden="true"></div>
      <div class="seat-preview__rows">
        ${rows.map((label) => `
          <div class="seat-preview__row">
            <span class="seat-preview__label">${escapeHtml(label)}</span>
            ${Array.from({ length: Math.min(seatsPerRow, 40) }, (_, i) =>
              `<span class="pv-seat${premiumRows.includes(label) ? " pv-seat--premium" : ""}" title="${escapeHtml(label)}${i + 1}"></span>`).join("")}
          </div>`).join("")}
      </div>
      <div class="seat-preview__legend">
        <span><i></i>Standard</span>
        <span><i class="i-premium"></i>Premium</span>
        <span>${rows.length} rows × ${seatsPerRow} = ${rows.length * seatsPerRow} seats</span>
      </div>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * Listing
 * ------------------------------------------------------------------ */

async function loadScreens() {
  const wrapper = qs("#screens-table-wrap");
  wrapper.innerHTML = skeletonHTML("rows", 3);

  try {
    const screens = await listScreens();
    clear(wrapper);

    qs("#screens-summary").textContent = screens.length
      ? `${screens.length} screen${screens.length === 1 ? "" : "s"} · ${screens.reduce((n, s) => n + Number(s.seatCount || 0), 0)} seats total`
      : "";

    if (!screens.length) {
      wrapper.innerHTML = emptyStateHTML({
        icon: "seat",
        title: "No screens yet",
        message: "Create your first auditorium with rows and premium rows.",
        actionLabel: "Create screen",
      });
      wrapper.querySelector(".btn")?.addEventListener("click", () => openCreateModal());
      return;
    }

    const table = el("table", { class: "admin-table" });
    table.innerHTML = `
      <thead><tr>
        <th scope="col">Screen</th>
        <th scope="col">Seats</th>
        <th scope="col">Created</th>
        <th scope="col"><span class="sr-only">Actions</span></th>
      </tr></thead>
      <tbody></tbody>`;
    const tbody = table.querySelector("tbody");

    for (const screen of screens) {
      const tr = el("tr");
      tr.innerHTML = `
        <td class="admin-table__strong">${escapeHtml(screen.name)}</td>
        <td>${icons.seat({ size: 15 })} ${screen.seatCount} seats</td>
        <td class="text-3">${formatDateShort(screen.createdAt)}</td>
        <td>
          <div class="table-actions">
            <button type="button" class="icon-button" data-action="view" aria-label="View seat layout of ${escapeHtml(screen.name)}">${icons.eye({ size: 16 })}</button>
            <button type="button" class="icon-button" data-action="rename" aria-label="Rename ${escapeHtml(screen.name)}">${icons.edit({ size: 16 })}</button>
            <button type="button" class="icon-button icon-button--danger" data-action="delete" aria-label="Delete ${escapeHtml(screen.name)}">${icons.trash({ size: 16 })}</button>
          </div>
        </td>`;
      tr.querySelector('[data-action="view"]').addEventListener("click", () => viewLayout(screen));
      tr.querySelector('[data-action="rename"]').addEventListener("click", () => openRenameModal(screen));
      tr.querySelector('[data-action="delete"]').addEventListener("click", () => removeScreen(screen));
      tbody.append(tr);
    }

    wrapper.append(table);
  } catch (error) {
    clear(wrapper);
    wrapper.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    wrapper.querySelector(".js-retry")?.addEventListener("click", loadScreens);
  }
}

async function viewLayout(screenSummary) {
  let screen;
  try {
    screen = await getScreen(screenSummary.id);
  } catch (error) {
    toast.error(friendlyMessage(error));
    return;
  }

  const rows = screen.rows || [];
  const premiumRows = rows.filter((r) => r.seats.some((s) => s.type === "premium")).map((r) => r.label);
  const seatsPerRow = rows.length ? rows[0].seats.length : 0;

  openModal({
    title: screen.name,
    size: "lg",
    content: `
      <div class="seat-preview">
        <div class="seat-preview__screen" aria-hidden="true"></div>
        <div class="seat-preview__rows">
          ${rows.map((row) => `
            <div class="seat-preview__row">
              <span class="seat-preview__label">${escapeHtml(row.label)}</span>
              ${row.seats.map((s) => `<span class="pv-seat${s.type === "premium" ? " pv-seat--premium" : ""}" title="${escapeHtml(row.label)}${s.number}"></span>`).join("")}
            </div>`).join("")}
        </div>
        <div class="seat-preview__legend">
          <span><i></i>Standard</span>
          <span><i class="i-premium"></i>Premium</span>
          <span>${rows.length} rows · ${rows.reduce((n, r) => n + r.seats.length, 0)} seats</span>
        </div>
      </div>
      <p class="field-hint" style="margin-top:0.9rem">${icons.info({ size: 13 })} Seat layouts are fixed at creation — the backend offers row/seat reads and screen renames only.</p>`,
    actions: [{ label: "Close", kind: "primary" }],
  });
}

/* ------------------------------------------------------------------ *
 * Create modal
 * ------------------------------------------------------------------ */

const ALL_ROWS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function createFormHTML({ name, rows, seatsPerRow, premiumRows }) {
  return `
    <form id="screen-form" class="form" novalidate>
      <div class="form-field">
        <label class="form-label" for="w-name">Screen name <span class="req">*</span></label>
        <input class="form-input" id="w-name" name="name" type="text" maxlength="50" placeholder="e.g. Screen 3 — Luxe Recliner" value="${escapeHtml(name)}" required>
        <p class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-grid">
        <div class="form-field">
          <label class="form-label" for="w-seats">Seats per row <span class="req">*</span></label>
          <input class="form-input" id="w-seats" name="seatsPerRow" type="number" min="1" max="40" value="${seatsPerRow}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label class="form-label" for="w-rows-count">Number of rows <span class="req">*</span></label>
          <select class="form-select" id="w-rows-count" name="rowsCount">
            ${Array.from({ length: 26 }, (_, i) => `<option value="${i + 1}" ${i + 1 === rows.length ? "selected" : ""}>${i + 1} row${i ? "s" : ""} (A${i ? `–${ALL_ROWS[i]}` : ""})</option>`).join("")}
          </select>
          <p class="field-error" aria-live="polite"></p>
        </div>
      </div>
      <div class="form-field">
        <span class="form-label">Premium rows <button type="button" class="link-button" id="toggle-premium" aria-expanded="true">Toggle a row</button></span>
        <div class="rows-chips" id="rows-chips" role="group" aria-label="Select premium rows"></div>
        <p class="field-error" aria-live="polite"></p>
        <p class="field-hint">Click a row chip to mark it premium (gold). Rows start from the screen (A) — the last rows are usually premium.</p>
      </div>
      <div id="preview-slot"></div>
    </form>`;
}

function openCreateModal() {
  const draft = { name: "", rows: ["A", "B", "C", "D"], premiumRows: ["D"] };

  const modal = openModal({
    title: "Create a screen",
    size: "lg",
    content: createFormHTML({ ...draft, rows: draft.rows, seatsPerRow: 8 }),
    actions: [
      { label: "Cancel", kind: "ghost" },
      {
        label: "Create screen",
        kind: "primary",
        closeOnClick: false,
        onClick: async (btn) => {
          const form = qs("#screen-form");
          const name = form.name.value.trim();
          const seatsPerRow = Number(form.seatsPerRow.value);
          const rowsCount = Number(form.rowsCount.value);
          const rows = ALL_ROWS.slice(0, rowsCount);
          const premiumRows = qsa("#rows-chips .row-chip.is-premium").map((chip) => chip.dataset.row);

          const fields = [
            { name: "name", value: name, rules: [validators.screenName()] },
            { name: "seatsPerRow", value: form.seatsPerRow.value, rules: [validators.numberRange(1, 40, "Seats per row", { integer: true })] },
          ];
          const { valid } = validateFields(form, fields);
          if (!valid) return false;

          setButtonLoading(btn, true, "Creating…");
          try {
            await createScreen({ name, rows, seatsPerRow, premiumRows });
            toast.success(`“${name}” created with ${rows.length * seatsPerRow} seats.`);
            await loadScreens();
            return true;
          } catch (error) {
            setButtonLoading(btn, false);
            if (!applyApiErrorToForm(form, error)) toast.error(friendlyMessage(error));
            return false;
          }
        },
      },
    ],
  });

  wireDraftPreview(draft);
  return modal;
}

function wireDraftPreview(draft) {
  const chipsHost = qs("#rows-chips");
  const previewSlot = qs("#preview-slot");
  const rowsSelect = qs("#w-rows-count");
  const seatsInput = qs("#w-seats");

  const renderChips = () => {
    const rows = ALL_ROWS.slice(0, Number(rowsSelect.value));
    chipsHost.innerHTML = rows.map((label) => `
      <button type="button" class="row-chip${draft.premiumRows.includes(label) ? " is-premium" : ""}" data-row="${label}" aria-pressed="${draft.premiumRows.includes(label)}">
        <span class="row-chip__toggle" aria-hidden="true"></span>${label}
      </button>`).join("");
    chipsHost.querySelectorAll(".row-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        const label = chip.dataset.row;
        if (draft.premiumRows.includes(label)) {
          draft.premiumRows = draft.premiumRows.filter((r) => r !== label);
        } else {
          draft.premiumRows.push(label);
        }
        renderChips();
        renderPreview();
      });
    });
  };

  const renderPreview = () => {
    const rows = ALL_ROWS.slice(0, Number(rowsSelect.value));
    const seatsPerRow = Math.max(1, Math.min(40, Number(seatsInput.value) || 8));
    previewSlot.innerHTML = seatPreviewHTML({ rows, seatsPerRow, premiumRows: draft.premiumRows });
  };

  rowsSelect.addEventListener("change", () => {
    const rows = ALL_ROWS.slice(0, Number(rowsSelect.value));
    draft.premiumRows = draft.premiumRows.filter((r) => rows.includes(r));
    renderChips();
    renderPreview();
  });
  seatsInput.addEventListener("input", renderPreview);

  renderChips();
  renderPreview();
}

/* ------------------------------------------------------------------ *
 * Rename / delete
 * ------------------------------------------------------------------ */

function openRenameModal(screen) {
  openModal({
    title: `Rename · ${screen.name}`,
    size: "sm",
    content: `
      <form id="rename-form" class="form" novalidate>
        <div class="form-field">
          <label class="form-label" for="w-new-name">New name <span class="req">*</span></label>
          <input class="form-input" id="w-new-name" name="name" type="text" maxlength="50" value="${escapeHtml(screen.name)}" required>
          <p class="field-error" aria-live="polite"></p>
        </div>
      </form>`,
    actions: [
      { label: "Cancel", kind: "ghost" },
      {
        label: "Save name",
        kind: "primary",
        closeOnClick: false,
        onClick: async (btn) => {
          const form = qs("#rename-form");
          const name = form.name.value.trim();
          const { valid } = validateFields(form, [{ name: "name", value: name, rules: [validators.screenName()] }]);
          if (!valid) return false;
          setButtonLoading(btn, true, "Saving…");
          try {
            await renameScreen(screen.id, name);
            toast.success("Screen renamed.");
            await loadScreens();
            return true;
          } catch (error) {
            setButtonLoading(btn, false);
            if (!applyApiErrorToForm(form, error)) toast.error(friendlyMessage(error));
            return false;
          }
        },
      },
    ],
  });
}

async function removeScreen(screen) {
  const ok = await confirmDialog({
    title: `Delete “${screen.name}”?`,
    message: "The auditorium and all of its seats will be removed. Screens referenced by showtimes cannot be deleted.",
    confirmLabel: "Delete screen",
  });
  if (!ok) return;
  try {
    await deleteScreen(screen.id);
    toast.success(`“${screen.name}” deleted.`);
    await loadScreens();
  } catch (error) {
    if (error.code === "IN_USE") {
      toast.error("This screen still has showtimes scheduled and cannot be deleted.");
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
  qs("#add-screen").addEventListener("click", openCreateModal);
  await loadScreens();
}

main();
