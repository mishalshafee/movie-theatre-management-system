/**
 * Accessible modal dialogs with entrance/exit animations,
 * focus trap, Escape-to-close and backdrop click.
 */

const OPEN_MODALS = new Set();

function trapFocus(node, event) {
  const focusable = node.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && OPEN_MODALS.size) {
    const top = [...OPEN_MODALS].pop();
    top.close();
  }
});

/**
 * Open a modal.
 * @param {object} opts { title, content (Node|HTML string), size, onClose, actions: [{label, kind, onClick, closeOnClick}] }
 * @returns {{ root: HTMLElement, close: Function, body: HTMLElement }}
 */
export function openModal({ title = "", content = null, size = "md", actions = [], onClose = null, dismissible = true } = {}) {
  const root = document.createElement("div");
  root.className = "modal-backdrop";
  root.innerHTML = `
    <div class="modal modal--${size}" role="dialog" aria-modal="true" aria-label="${title ? String(title).replace(/"/g, "&quot;") : "Dialog"}">
      <div class="modal__header">
        <h3 class="modal__title">${title}</h3>
        ${dismissible ? '<button type="button" class="modal__close icon-button" aria-label="Close dialog">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg></button>' : ""}
      </div>
      <div class="modal__body"></div>
      ${actions.length ? '<div class="modal__footer"></div>' : ""}
    </div>
  `;

  const dialog = root.querySelector(".modal");
  const body = root.querySelector(".modal__body");
  if (content instanceof Node) body.append(content);
  else if (content) body.innerHTML = content;

  const footer = root.querySelector(".modal__footer");
  for (const action of actions) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `btn btn--${action.kind || "secondary"}`;
    btn.textContent = action.label;
    btn.addEventListener("click", async () => {
      if (!action.onClick) {
        if (action.closeOnClick !== false) close();
        return;
      }
      const result = await action.onClick(btn);
      // closeOnClick === false → the handler decides: true closes, false stays open.
      const shouldClose = action.closeOnClick === false
        ? result === true
        : action.closeOnClick !== false;
      if (shouldClose) close();
    });
    footer?.append(btn);
  }

  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    OPEN_MODALS.delete(api);
    root.classList.add("modal-backdrop--closing");
    setTimeout(() => {
      root.remove();
      onClose?.();
      if (!OPEN_MODALS.size) document.body.classList.remove("no-scroll");
    }, 180);
  }

  function onKeydown(event) {
    if (event.key === "Tab") trapFocus(dialog, event);
  }

  if (dismissible) {
    root.addEventListener("mousedown", (event) => {
      if (event.target === root) close();
    });
    root.querySelector(".modal__close")?.addEventListener("click", close);
  }
  root.addEventListener("keydown", onKeydown);

  // Define the controller BEFORE anything that references it.
  const api = { root, body, dialog, close };

  document.body.classList.add("no-scroll");
  document.body.append(root);
  OPEN_MODALS.add(api);

  // Move focus into the dialog for keyboard users.
  requestAnimationFrame(() => {
    const target = dialog.querySelector("input, select, textarea, .btn--primary") || dialog;
    target?.focus?.();
  });

  return api;
}

/**
 * Confirmation dialog (used for deletions and destructive actions).
 * @returns {Promise<boolean>} resolves true when confirmed
 */
export function confirmDialog({ title = "Are you sure?", message = "", confirmLabel = "Confirm", danger = true } = {}) {
  return new Promise((resolve) => {
    let decided = false;
    const modal = openModal({
      title,
      size: "sm",
      content: `<p class="modal__text">${message}</p>`,
      actions: [
        { label: "Cancel", kind: "secondary", onClick: () => true },
        {
          label: confirmLabel,
          kind: danger ? "danger" : "primary",
          closeOnClick: false,
          onClick: () => { decided = true; return true; },
        },
      ],
      onClose: () => resolve(decided),
    });
    return modal;
  });
}
