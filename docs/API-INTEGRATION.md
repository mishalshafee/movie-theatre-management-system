# API Integration Guide

How the CineLux frontend consumes the backend. Every HTTP call in the app goes
through `frontend/js/core/api.js` → `frontend/js/services/*.service.js`. Page
modules never call `fetch()` directly and never hardcode URLs.

- Base URL: `API_BASE_URL` from `js/config.js` (`http://localhost:4000`)
- All requests: `credentials: "include"` (refresh cookie), JSON bodies, 15 s timeout via `AbortController`
- Authenticated requests: `Authorization: Bearer <accessToken>` (in-memory token)
- `204` responses → `null`; structured errors → `{ status, code, message, friendly, details }`

---

## 1. Authentication

| Endpoint | Used by | Notes |
| --- | --- | --- |
| `POST /api/auth/register` | register page | body `{ fullName, email, password }`; `confirmPassword` is validated client-side only and **never sent**. Success → redirect to login (backend does not auto-login). `EMAIL_TAKEN` paints the email field. |
| `POST /api/auth/login` | login page | body `{ email, password }`. On success the access token + user go to JS memory; the refresh cookie is set by the backend (HTTP-only, path `/api/auth`). Redirect honours role (admin → dashboard, staff → lookup) and a safe `?next=` target. |
| `POST /api/auth/refresh` | every page load + on `TOKEN_EXPIRED` | cookie-authenticated. Rotates the cookie. Single-flight wrapper prevents concurrent refreshes (rotation-reuse protection). Failure = normal guest state on public pages; redirect on protected pages. |
| `POST /api/auth/logout` | navbar / account | revokes the session server-side, clears in-memory state. |
| `GET /api/auth/me` | account page | re-verifies the profile instead of trusting the restored copy. |

## 2. Movies

| Endpoint | Used by | Notes |
| --- | --- | --- |
| `GET /api/movies?status=&page=&limit=` | home, movies page, admin (movies list, dashboard counts, showtime form) | `limit ≤ 50`. Renders `{ data, page, limit, total }` with server pagination; search filters the fetched window client-side (the API has no search parameter). |
| `GET /api/movies/:id` | movie details, admin edit modal | `404 NOT_FOUND` → friendly "movie not found" state. |
| `POST /api/movies` | admin | body: `title` (required), `durationMinutes` (1–600), optional `description, genre, rating, posterUrl (URL), releaseDate (YYYY-MM-DD), status`. Client validation mirrors zod schema; server `VALIDATION_ERROR` details paint the matching fields. |
| `PATCH /api/movies/:id` | admin | any subset, at least one field. |
| `DELETE /api/movies/:id` | admin | `204` success. When the movie has showtimes the backend currently answers `500` (see compatibility report) — the UI shows the documented guidance: archive instead of delete, with a one-click "Archive now" action. |

## 3. Screens

| Endpoint | Used by | Notes |
| --- | --- | --- |
| `GET /api/screens` | admin screens list, admin dashboard, showtime forms | items include `seatCount`. |
| `GET /api/screens/:id` | screen layout viewer | `rows: [{ label, seats: [{ id, number, type }] }]` — rendered as a seat-dot map with standard/premium/accessible legend. |
| `POST /api/screens` | admin | `{ name (1–50), rows (unique A–Z), seatsPerRow (1–40), premiumRows (⊆ rows) }`. The create modal enforces all of it with a live layout preview. `SCREEN_NAME_TAKEN` paints the name field. |
| `PATCH /api/screens/:id` | admin | rename only (`{ name }`) — the UI offers nothing else because the backend doesn't. |
| `DELETE /api/screens/:id` | admin | `IN_USE` (screens with showtimes) → guidance toast. |

## 4. Showtimes

| Endpoint | Used by | Notes |
| --- | --- | --- |
| `GET /api/showtimes?movieId=&screenId=&from=&to=&page=&limit=` | movie details (grouped by local date), admin list + filters | the backend only ever returns **upcoming** showtimes (`starts_at >= now()` unless `from` overrides). `from`/`to` accept ISO-with-timezone. |
| `GET /api/showtimes/:id` | seat-selection header, checkout | nested `movie` + `screen`. |
| `GET /api/showtimes/:id/seats` | seat selection, checkout validation | authoritative seat data: `{ id, number, type, price, status }` per seat with status `available/held/sold`. The frontend uses these prices verbatim and never invents availability. |
| `POST /api/showtimes` | admin | `{ movieId, screenId, startsAt (ISO with offset), priceStandard, pricePremium }`. End time is computed server-side (+15 min buffer) — no endsAt input exists. Past times and overlaps are rejected (`400`, `SHOWTIME_OVERLAP`). |
| `PATCH /api/showtimes/:id` | admin | prices only. |
| `DELETE /api/showtimes/:id` | admin | bookings block deletion (`IN_USE`, observed as `500` — same guidance approach). |

## 5. Bookings (all require login)

| Endpoint | Used by | Notes |
| --- | --- | --- |
| `POST /api/bookings` | checkout ("Reserve seats") | `{ showtimeId, seatIds[1..8] }`. Returns the held booking with the **server-computed** total and `expiresAt`; the countdown is derived only from `expiresAt`. `SEAT_UNAVAILABLE` → seat map refetch + reselect; `SHOWTIME_STARTED` → closed-for-booking message. |
| `GET /api/bookings?page=&limit=` | my-bookings (paginated), checkout (resume an existing unexpired hold for the same showtime) | |
| `GET /api/bookings/:id` | booking details / ticket, staff lookup | owner-only for customers; staff/admin may read any — the backend decides, the UI only renders what comes back (404 keeps other customers' bookings invisible). |
| `POST /api/bookings/:id/pay` | checkout + ticket "Pay now" | demo payment. Success is shown **only** after the backend returns `status: "confirmed"`. `HOLD_EXPIRED` → expired panel; `BOOKING_NOT_PAYABLE` → refetch current status. |
| `POST /api/bookings/:id/cancel` | ticket page | confirm dialog first; `SHOWTIME_STARTED` / `BOOKING_NOT_CANCELLABLE` mapped to clear messages. |

## 6. Health

`GET /api/health` — public. Not surfaced in the UI (the network error toast covers outages).

---

### Status chips & labels (frontend-only presentation)

- Movies: `now_showing` → "Now Showing", `coming_soon` → "Coming Soon", `archived` → "Archived"
- Bookings: `held / confirmed / used / cancelled / expired` → colour-coded chips; the ticket layout and action buttons adapt to each status
