# CineLux — Frontend

A complete, premium cinema ticket booking frontend built with **pure HTML5, CSS3 and Vanilla JavaScript (ES modules)**. No frameworks, no build step, no dependencies.

It talks to the existing Node.js + Express + PostgreSQL backend over REST and renders **only real database data** — never fabricated records.

---

## Quick start

1. **Start the backend** (from the backend project):

   ```bash
   npm install
   cp .env.example .env          # then edit values (never commit .env)
   npm run migrate               # apply the 7 SQL migrations
   SEED_ADMIN_EMAIL=admin@example.com SEED_ADMIN_PASSWORD='admin-password-123' npm run seed
   npm run dev                   # API on http://localhost:4000
   ```

   The seed password must be at least 12 characters (backend rule).

2. **Serve this frontend** on port **5500** (the backend's default CORS origin):

   ```bash
   cd frontend
   python3 -m http.server 5500
   # or: VS Code Live Server (set port 5500), npx serve -l 5500, nginx, …
   ```

3. Open **http://localhost:5500**

> The frontend must be served over HTTP (`http://localhost:5500`).
> Opening `index.html` via `file://` will not work — ES modules require HTTP.

### Configuration

Everything lives in **`js/config.js`**:

```js
export const API_BASE_URL = "http://localhost:4000";
```

If your backend runs on another port, change it there only. Never hardcode API URLs in page scripts.

If you must serve the frontend on a different origin/port, update `CORS_ORIGIN`
in the backend `.env` accordingly (e.g. `CORS_ORIGIN=http://localhost:3000`) and restart the backend —
otherwise the browser will block the cross-origin requests.

---

## Features

### Customer
- **Homepage** — featured hero (real Now Showing movie + poster), Now Showing / Coming Soon grids, experience band, promo CTA
- **Movies** — status filter tabs, title search, pagination, skeletons, empty states
- **Movie details** — full info + upcoming showtimes grouped by date (time, screen, standard/premium prices)
- **Seat selection** — live seat map from `GET /api/showtimes/:id/seats`, premium/standard/accessible styling, held/sold states, max 8 seats, animated total
- **Checkout** — backend-validated selection, 10-minute hold (countdown from the backend's `expiresAt`), demo payment (no card data), resume of an existing unexpired hold
- **Digital ticket** — status badge, booking code, print-friendly layout, cancellation
- **My bookings** — paginated history with posters and status chips
- **Account** — profile from `GET /api/auth/me`, logout

### Admin (role: admin)
- Dashboard with statistics computed **only** from real endpoints (movies by status, screens, upcoming showtimes). No revenue/customer/sales fabrications — those APIs do not exist.
- Movies: create / edit / delete, poster URL live preview, IN_USE → "archive instead" guidance
- Screens: create with A–Z row picker, seats-per-row, premium rows, live seat-layout preview; rename; layout viewer; delete with IN_USE handling
- Showtimes: filters (movie, screen, date range), create (timezone-aware ISO `startsAt`; backend computes end time), price-only edit, delete, SHOWTIME_OVERLAP handling

### Staff (role: staff)
- Booking lookup by exact booking ID via `GET /api/bookings/:id` (backend authorizes). No invented list/search APIs.

### Authentication
- Register (full name, email, password — `confirmPassword` never sent), login with show/hide password
- Access token **in memory only**; rotating refresh token in an HTTP-only cookie (path `/api/auth`)
- Every page load restores the session via `POST /api/auth/refresh`
- `TOKEN_EXPIRED` → automatic single-flight refresh → retry original request once
- `REFRESH_REUSED` / `UNAUTHORIZED` → clean return to guest state
- Logout via `POST /api/auth/logout`

---

## Project structure

```
frontend/
├── index.html · login.html · register.html · movies.html · movie-details.html
├── seat-selection.html · checkout.html · booking-details.html · my-bookings.html · account.html
├── admin/    dashboard.html · movies.html · screens.html · showtimes.html
├── staff/    booking-lookup.html
├── css/      variables · main · components · animations · auth · movies · booking · admin · responsive
├── js/
│   ├── config.js                  # API_BASE_URL + app constants
│   ├── core/                      # api.js (fetch client), auth.js, session.js, guards.js, router-helpers.js
│   ├── services/                  # auth / movies / screens / showtimes / bookings service modules
│   ├── components/                # navbar, footer, modal, toast, loader, pagination, reveal, icons, movie-card, admin-shell
│   ├── utils/                     # validators, formatters, date-time, dom
│   ├── pages/                     # one module per page
│   ├── admin/                     # dashboard, movies, screens, showtimes
│   └── staff/                     # booking-lookup
└── assets/   logo.svg, favicon, fallback art
```

## Error handling contract

All backend errors arrive as `{ error: { code, message, details? } }`. `js/core/api.js`
normalises them into `{ status, code, message, friendly, details }` and pages map codes to UI:

| Code | UI behaviour |
| --- | --- |
| `VALIDATION_ERROR` | field-level messages on the form |
| `TOKEN_EXPIRED` | silent refresh + retry once |
| `UNAUTHORIZED` / `REFRESH_REUSED` | guest state, redirect to login for protected pages |
| `INVALID_CREDENTIALS` | inline form alert |
| `EMAIL_TAKEN` / `SCREEN_NAME_TAKEN` | error on the field itself |
| `SEAT_UNAVAILABLE` | seat map refetched, customer asked to reselect |
| `HOLD_EXPIRED` | expired panel + back to seat selection |
| `SHOWTIME_STARTED` | friendly closed-for-booking message |
| `SHOWTIME_OVERLAP` | inline alert in showtime form |
| `IN_USE` | "cannot delete" guidance (e.g. archive the movie) |
| `BOOKING_NOT_PAYABLE` / `BOOKING_NOT_CANCELLABLE` | status refetch + explanation |
| `NOT_FOUND` | friendly empty/error state |
| `NETWORK` / `TIMEOUT` / `INTERNAL` | toast + retry where sensible |

## Notes & limitations

- The backend payment endpoint is a **mock** (`POST /api/bookings/:id/pay`). No card details are ever collected, and success is only shown after the backend confirms `status === "confirmed"`.
- Amounts have no currency in the API; the UI renders them as USD (change `CURRENCY` in `js/config.js` if needed).
- Movie "search" is client-side over one full page of results (the API caps `limit` at 50 and has no `?search=` parameter).
- The showtime API only ever returns **upcoming** screenings; admins cannot list past showtimes.
- Screens cannot be edited beyond renaming (backend `PATCH` accepts `{ name }` only) — the UI reflects that.
- See `../docs/API-COMPATIBILITY-REPORT.md` for endpoint-by-endpoint verification, including a backend quirk where `DELETE …/` returns `500` instead of the documented `409 IN_USE`.
