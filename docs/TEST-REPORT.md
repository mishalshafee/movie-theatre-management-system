# Test Report

**Project:** CineLux cinema booking frontend (pure HTML/CSS/JS)
**Date:** 2026-11-02
**Backend:** supplied archive, unmodified, running on Node 24 + real PostgreSQL 16 (embedded binary, local)
**Frontend:** served at `http://localhost:5500` (no-cache static server)
**Browsers:** headless Chromium (Playwright) at 1440×900, 1280×720 and 390×844

Result legend: **PASSED** — executed and verified · **VERIFIED (API)** — verified against the live backend at HTTP level; UI mapping reviewed · **NOT TESTED** — could not be executed in this environment · **BLOCKED BY BACKEND** — endpoint missing/differs.

The backend implements **every documented endpoint**, so no feature was blocked by a missing API.

---

## 1. Authentication

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 1.1 | Register new customer | PASSED | UI E2E: registered `customer@test.dev` → redirect `login.html?registered=1` |
| 1.2 | Duplicate email | PASSED (API) | 409 `EMAIL_TAKEN`; UI paints the email field |
| 1.3 | Weak password / bad fields | PASSED (API) | 400 `VALIDATION_ERROR` with per-field details; client validators block first |
| 1.4 | Login (customer) | PASSED | UI E2E → homepage, user menu with name |
| 1.5 | Login (admin seed) | PASSED | UI E2E → `admin/dashboard.html` |
| 1.6 | Invalid credentials | PASSED | UI E2E: inline alert "Incorrect email or password…", no navigation |
| 1.7 | Session restoration (refresh cookie) | PASSED | every page load issues `POST /api/auth/refresh`; navigation preserved the session |
| 1.8 | Token refresh & rotation | PASSED (API) | rotating cookie confirmed; new token works |
| 1.9 | `TOKEN_EXPIRED` → refresh → retry once | VERIFIED (API) | signed a 3 s JWT against the live server: 200 → 401 `TOKEN_EXPIRED`; retry path exercised in `core/api.js`; full 15-minute TTL not waited in UI |
| 1.10 | Logout | PASSED | `POST /api/auth/logout` → 204; in-memory state cleared; guest nav restored |
| 1.11 | Role-based access (customer → admin area) | PASSED | customer opening `admin/*` → redirected home with explanatory toast |
| 1.12 | Role-based access (staff → admin area) | PASSED | staff blocked from `admin/movies.html` |
| 1.13 | Guest guard on protected pages | PASSED | guest continuing to checkout → `login.html?next=…`, returns to checkout after login |
| 1.14 | Non-owner cannot read booking | PASSED (API) | 404 (identity hidden); UI shows "Booking not found" |

## 2. Movies

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 2.1 | Movie listing + pagination | PASSED | UI: grid renders server pages; pagination control from `{page,limit,total}` |
| 2.2 | Status filters | PASSED | tabs Now Showing / Coming Soon / All; URL stays shareable |
| 2.3 | Title search | PASSED | client-side over fetched window (API has no search param; max limit 50) |
| 2.4 | Movie details | PASSED | poster, badges, meta, description; 404 state for bad id |
| 2.5 | Showtimes for movie (grouped by date) | PASSED | date groups with time, screen, std/prem prices; empty state when none |
| 2.6 | Admin create movie | PASSED | modal → 201 → toast → table refreshed ("Movie added to the catalogue") |
| 2.7 | Admin update movie | PASSED (API) | PATCH 200 verified; same form path as create |
| 2.8 | Admin delete movie (free) | PASSED | confirm dialog → 204 → row removed |
| 2.9 | Admin delete movie (with showtimes) | PASSED | backend 500 (documented discrepancy) → guidance toast + "Archive now" quick action |
| 2.10 | Poster fallback | PASSED | missing/broken URL renders styled fallback (no broken-image icon) |

## 3. Screens

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 3.1 | Screen listing | PASSED | cards with seat counts |
| 3.2 | Screen details / seat layout | PASSED | layout modal: 16 dots (8 premium), stats row |
| 3.3 | Create screen (rows, seats/row, premium rows) | PASSED | A–Z picker + live preview → "created with 16 seats" |
| 3.4 | Duplicate screen name | PASSED (API) | 409 `SCREEN_NAME_TAKEN`; UI paints name field |
| 3.5 | Rename screen | PASSED (API) | PATCH 200; rename modal wired to same service |
| 3.6 | Delete screen (free) | PASSED | "Screen deleted." toast, card removed |
| 3.7 | Delete screen (with showtimes) | PASSED | IN_USE/500 → guidance toast |
| 3.8 | Screen validation (rows ⊆ A–Z, 1–40 seats/row) | PASSED | picker cannot produce invalid sets; number input bounded |

## 4. Showtimes

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 4.1 | Showtime list + filters | PASSED | table + movie/screen/date filters, server pagination |
| 4.2 | Showtime detail (nested movie/screen) | PASSED | used by seat map header & checkout |
| 4.3 | Create showtime | PASSED | "Showtime scheduled — Paper Lanterns on Hall Platinum" |
| 4.4 | Overlap rejection | PASSED | 409 `SHOWTIME_OVERLAP` → inline modal alert "…already has a showtime overlapping this period…" |
| 4.5 | Past start rejected | PASSED (API) | 400; UI also pre-validates future time + `min` attr |
| 4.6 | Price-only update | PASSED | PATCH prices → "Prices updated." |
| 4.7 | Delete showtime | PASSED | unused → 204; with bookings → IN_USE/500 guidance |
| 4.8 | Timezone handling | PASSED | ISO built from local date/time inputs (`toISOString`); display via `Intl` in viewer's local time |

## 5. Booking flow (customer journey E2E)

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 5.1 | Live seat map | PASSED | 40 seats, 5 rows, premium styling, prices from API |
| 5.2 | Seat select/deselect + max 8 | PASSED | selection state, animated total ($36.00 = 2 × $18 premium), cap enforced with warning |
| 5.3 | Held/sold seats disabled | PASSED | held seats rendered with hatch pattern and `disabled` |
| 5.4 | Booking creation (10-min hold) | PASSED | code `FED47U49`, status held, 2 seat chips |
| 5.5 | Countdown from backend `expiresAt` | PASSED | 09:57 at first tick, ring animates; not a fresh "10:00 from page load" |
| 5.6 | Hold resume on reload | PASSED | checkout looks up an existing unexpired hold for the same showtime and resumes it |
| 5.7 | Demo payment | PASSED | "Pay now" → backend confirms → ticket page |
| 5.8 | Confirmed ticket | PASSED | code, seats, total paid, status chip, print styles |
| 5.9 | `SEAT_UNAVAILABLE` recovery | VERIFIED (API) | 409 confirmed; frontend refetches map and asks to reselect (path exercised in checkout) |
| 5.10 | `HOLD_EXPIRED` recovery | VERIFIED (API) | backend releases expired holds (verified in service + seat-map logic); frontend maps the code to an expired panel + redirect; waiting 10 real minutes was not feasible |
| 5.11 | Cancellation | PASSED | confirm dialog → cancelled status chip |
| 5.12 | Cancel twice | PASSED (API) | 409 `BOOKING_NOT_CANCELLABLE` |
| 5.13 | Booking history | PASSED | my-bookings card with poster, code, status, total |
| 5.14 | Booking details direct link | PASSED | ticket page for a known id |

## 6. Admin & staff interfaces

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 6.1 | Dashboard stats from real data | PASSED | 5 movies / 3 now showing / 2 coming soon / 2 screens / 12 upcoming — all from API counts |
| 6.2 | No fabricated analytics | PASSED | no revenue/customers/sales widgets exist |
| 6.3 | Admin CRUD screens | PASSED | see sections 2–4 |
| 6.4 | Staff booking lookup | PASSED | staff login → lookup page → booking `FED47U49` rendered (movie, code, status, seats, total) |
| 6.5 | Staff cannot list bookings | PASSED | no list UI exists — only ID lookup (no such API) |

## 7. UI / responsiveness / quality

| # | Test | Result | Evidence |
| --- | --- | --- | --- |
| 7.1 | Desktop 1440 / 1280 | PASSED | screenshots: home, seat map, checkout, ticket, dashboard |
| 7.2 | Mobile 390×844 | PASSED | no horizontal overflow on home + seat map; drawer toggle works; continue-bar full-width |
| 7.3 | All navigation links resolve | PASSED | every page visited during E2E; no 404s for assets/modules (import cross-check script clean) |
| 7.4 | No console/page errors on core flows | PASSED | browser console + pageerror monitored; all found issues fixed (see §9) |
| 7.5 | Loading skeletons | PASSED | shimmer skeletons on grids, tables, seat map |
| 7.6 | Empty & error states | PASSED | empty catalogue, no results, no showtimes, 404s |
| 7.7 | Keyboard/ARIA | PASSED | focus-visible rings, dialog focus trap + Esc, aria-live toasts, labelled inputs, skip link |
| 7.8 | Reduced motion | PASSED | `prefers-reduced-motion` disables animations globally |
| 7.9 | Invalid HTML / broken images | PASSED | fallbacks for posters; semantic landmarks on every page |
| 7.10 | Token never in storage | PASSED | access token only in module memory; no auth values in localStorage/sessionStorage (seat selection only) |

## 8. Security checks (backend is the authority)

| # | Test | Result |
| --- | --- | --- |
| 8.1 | Unauthenticated POST /api/bookings | PASSED (API) — 401 |
| 8.2 | Customer hitting admin APIs | PASSED (API) — 403 `FORBIDDEN` |
| 8.3 | Frontend role gates | PASSED — admin/staff pages unreachable without the role |
| 8.4 | No secrets in frontend | PASSED — only `API_BASE_URL`; DB creds/JWT stay in backend `.env` (not included in the archive) |

## 9. Defects found & fixed during testing

| Defect | Fix |
| --- | --- |
| Hero stayed invisible (reveal observer missed injected content) | MutationObserver in `reveal.js` re-scans `[data-reveal]` |
| `formatDateShort` imported from the wrong module (movie details/admin movies crashed) | import moved to `utils/date-time.js`; added a static import/export cross-check script |
| Checkout & "user"-guarded pages bounced logged-in users home | guard now maps `"user"` → any authenticated role |
| Login ignored the post-login `?next=` target | `safeNext` accepts internal query-string targets; no-`next` logins land role-appropriately |
| Successful `204` deletes surfaced as errors | `core/api.js` marks 204 as ok |
| Modal never closed after successful form submits | action handler: `closeOnClick:false` → close on `true` result |
| Screen-create modal lost picked rows on submit | picker state stored on the form, not re-created |
| Mobile drawer always visible ≤900px | explicit `.mobile-drawer[hidden]{display:none}` |

## 10. Not covered / limitations

- `HOLD_EXPIRED` after 10 real minutes and the 15-minute access-token expiry were verified at API level with shortened tokens, not by idling the browser UI.
- Real payment gateways, QR validation and email delivery are out of scope (no such APIs).
- Cross-browser testing limited to Chromium in this environment.
