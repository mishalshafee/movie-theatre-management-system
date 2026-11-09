/**
 * Staff · Booking lookup.
 * Staff can read any booking by ID via GET /api/bookings/:id (the backend
 * authorizes this). There is deliberately NO booking-list or search API for
 * staff — only lookup by a known booking ID, so that is all this page offers.
 * Result card shows the full booking facts plus quick ticket navigation.
 */

import { initPage } from "../core/session.js";
import { PAGES } from "../config.js";
import { resolveUrl } from "../core/router-helpers.js";
import { getBooking } from "../services/bookings.service.js";
import { setButtonLoading, errorStateHTML, emptyStateHTML } from "../components/loader.js";
import { friendlyMessage } from "../core/api.js";
import { toast } from "../components/toast.js";
import { qs, clear, escapeHtml } from "../utils/dom.js";
import { formatMoney, formatBookingStatus, formatSeats } from "../utils/formatters.js";
import { formatDateTime, formatDate, formatTime } from "../utils/date-time.js";
import { icons } from "../components/icons.js";

const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function statusClass(status) {
  return {
    held: "status-chip--held",
    confirmed: "status-chip--confirmed",
    used: "status-chip--used",
    cancelled: "status-chip--cancelled",
    expired: "status-chip--expired",
  }[status] || "";
}

function bookingPanelHTML(booking) {
  const st = booking.showtime || {};
  return `
    <article class="lookup-result card card--pad ticket-entrance" data-reveal>
      <header class="lookup-result__head">
        <div>
          <span class="lookup-result__code">${icons.ticket({ size: 16 })} ${escapeHtml(booking.code)}</span>
          <h2 class="lookup-result__movie">${escapeHtml(st.movie?.title ?? "Movie")}</h2>
          <p class="lookup-result__when">${formatDate(st.startsAt)} · ${formatTime(st.startsAt)} · ${escapeHtml(st.screen?.name ?? "")}</p>
        </div>
        <span class="status-chip ${statusClass(booking.status)}">${formatBookingStatus(booking.status)}</span>
      </header>

      <div class="seat-chips">
        ${(booking.seats || []).map((s) => `<span class="seat-chip">${escapeHtml(`${s.row}${s.number}`)}<em>${formatMoney(s.price)}</em></span>`).join("")}
      </div>

      <dl class="lookup-details">
        <div><dt>Booking ID</dt><dd class="lookup-details__mono">${escapeHtml(booking.id)}</dd></div>
        <div><dt>Seats</dt><dd>${escapeHtml(formatSeats(booking.seats || []))}</dd></div>
        <div><dt>Total</dt><dd>${formatMoney(booking.total)}</dd></div>
        <div><dt>Booked</dt><dd>${formatDateTime(booking.createdAt)}</dd></div>
        <div><dt>Paid (demo)</dt><dd>${booking.paidAt ? formatDateTime(booking.paidAt) : "—"}</dd></div>
        <div><dt>Hold expires</dt><dd>${booking.expiresAt ? formatDateTime(booking.expiresAt) : "—"}</dd></div>
      </dl>

      <div class="ticket-actions" style="margin-top:1.2rem">
        <a class="btn btn--secondary btn--sm" href="${resolveUrl(`${PAGES.bookingDetails}?id=${encodeURIComponent(booking.id)}`)}">
          ${icons.eye({ size: 14 })} Open ticket view
        </a>
      </div>
    </article>`;
}

async function lookup(event) {
  event.preventDefault();
  const form = qs("#lookup-form");
  const input = form.lookupId;
  const result = qs("#lookup-result");
  const value = input.value.trim();

  if (!value) {
    toast.warning("Paste a booking ID to look it up.");
    input.focus();
    return;
  }
  if (!uuidRe.test(value)) {
    result.innerHTML = errorStateHTML({
      title: "That does not look like a booking ID",
      message: "Booking IDs are UUIDs like 7c9e6679-7425-40de-944b-e07fc1f90ae7. Ask the customer to open their ticket page and copy the booking ID shown there.",
      retry: false,
    });
    return;
  }

  const button = form.querySelector('[type="submit"]');
  setButtonLoading(button, true, "Searching…");
  clear(result);
  result.innerHTML = '<div class="skeleton-rows"><div class="skeleton-row"><div class="skeleton skeleton--thumb"></div><div class="skeleton skeleton--line w-40"></div><div class="skeleton skeleton--line w-25"></div></div></div>';

  try {
    const booking = await getBooking(value);
    result.innerHTML = bookingPanelHTML(booking);
  } catch (error) {
    if (error.status === 404) {
      result.innerHTML = emptyStateHTML({
        icon: "search",
        title: "No booking found for that ID",
        message: "Double-check the ID with the customer — it may belong to a different account or be mistyped.",
      });
    } else if (error.status === 403 || error.code === "FORBIDDEN") {
      result.innerHTML = errorStateHTML({
        title: "Not permitted",
        message: friendlyMessage(error),
        retry: false,
      });
    } else {
      result.innerHTML = errorStateHTML({ message: friendlyMessage(error) });
    }
  } finally {
    setButtonLoading(button, false);
  }
}

async function main() {
  const { user, ok } = await initPage({ auth: "staff" });
  if (!ok || !user) return;

  qs("#welcome-staff").textContent = `Signed in as ${user.fullName || user.email}`;
  qs("#lookup-form").addEventListener("submit", lookup);

  qs("[data-paste]")?.addEventListener("click", async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        qs("#lookup-id").value = text.trim();
        qs("#lookup-form").requestSubmit();
      }
    } catch {
      toast.info("Clipboard access was blocked — paste the ID manually.");
    }
  });
}

main();
