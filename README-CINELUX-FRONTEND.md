# CineLux — Redesigned Frontend (Premium Cinema Booking Platform)

This package contains the **complete redesigned frontend** for the CineLux
Movie Theatre Management System: a premium, commercial-quality cinema ticket
booking website built with **pure HTML5, CSS3 and Vanilla JavaScript (ES
Modules)** — no frameworks, no build step — fully integrated with your
existing Node.js/Express + PostgreSQL backend (which is **unchanged**).

---

## 1. Required software

| Software | Version | Purpose |
|---|---|---|
| Node.js | 18+ (20+ recommended) | Runs the existing backend |
| npm | 9+ | Installs backend dependencies |
| Docker + Docker Compose | any recent | Starts PostgreSQL 17 |
| Python 3 | 3.8+ | Serves the frontend (`http.server`) |
| A modern browser | Chrome / Edge / Firefox / Safari | Uses ES Modules, `fetch`, `sessionStorage`, IntersectionObserver |

## 2. How to extract the ZIP

Extract `cinelux-frontend-redesigned.zip` **into the root of your existing
project** (the folder that already contains `backend/`). It contains a single
`frontend/` directory that replaces your old one, plus this README.

```bash
# from your project root (next to backend/)
unzip cinelux-frontend-redesigned.zip
# → frontend/           (the redesigned frontend)
# → README-CINELUX-FRONTEND.md
```

> Tip: rename your current frontend first if you want to keep it
> (`mv frontend frontend-old`), then extract.

## 3. How to configure the backend API URL

The frontend auto-detects the backend in `frontend/js/config.js`:

- Served by the Express backend itself (port **4000**) → uses relative URLs (same origin).
- Served by `python3 -m http.server 5500` (or any other port) → automatically
  targets `http://<same-host>:4000`.

To point the frontend at a different backend host/port, edit one line in
`frontend/js/config.js`:

```js
export const API_BASE_URL = "http://localhost:4000"; // ← your backend URL
```

There is exactly **one** API client (`frontend/js/core/api.js`); every page
and service goes through it, so no other file ever hardcodes a backend URL.

## 4. How to start PostgreSQL using Docker

```bash
cd backend
docker compose up -d        # starts postgres:17 on localhost:5432
# credentials are defined in backend/compose.yaml and backend/.env
```

## 5. How to start the Node.js backend

```bash
cd backend
npm install                 # first time only
npm run migrate             # creates the schema from backend/migrations
npm run seed                # admin account + demo movies/screens/showtimes
npm run dev                 # http://localhost:4000  (uses .env settings)
```

The seed script creates the admin account from `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD` in `backend/.env`, plus 6 movies, 2 screens and
upcoming showtimes so every page has real data.

## 6. How to start the frontend

```bash
cd frontend
python3 -m http.server 5500
```

## 7. Which browser URL to open

Open **http://localhost:5500** in your browser.

(Alternative: the Express backend also serves this same frontend directly at
**http://localhost:4000** — both work identically.)

**Demo accounts** (after seeding): use the admin email/password from your
`backend/.env`. Register new customer accounts from the Register page.

## 8. Customer functionalities implemented

- **Homepage** — cinematic hero featuring a live now-showing movie (real
  artwork, title, genre, duration, rating, description), Now Showing and
  Coming Soon grids from the movies API, cinema experience band, promo CTA,
  responsive navigation with expanding search, loading skeletons, empty and
  error states.
- **Movies catalogue** — All / Now Showing / Coming Soon filters (backend
  `status` parameter) + client-side title search + pagination.
- **Movie details** — poster, facts, synopsis and **live showtimes grouped
  by date** with screen names and standard/premium prices.
- **Seat selection** — full interactive seat map from
  `GET /api/showtimes/:id/seats` (available/held/sold states, premium rows,
  row labels, animated selection, tooltips), **8-seat maximum**, sticky
  booking summary with real prices, availability refresh.
- **Reservation hold** — `POST /api/bookings` creates the hold; the
  **10-minute countdown runs from the backend's `expiresAt`**, with expiry
  warning, hold-expired recovery state and hold resumption after reload
  (no duplicate bookings).
- **Checkout with five DEMO payment methods**
  (see section 10) — order summary with per-seat prices, animated card
  preview with Luhn validation and brand detection (Visa/Mastercard/Amex),
  simulated PayPal authorization sheet, Google Pay wallet confirmation,
  Apple Pay authorization, and Cash-at-Counter demo reservation.
- **Digital ticket** — confirmed bookings render a premium two-part ticket
  (perforated stub, booking code, decorative QR-style pattern clearly marked
  as not-a-validation-token, seats, totals, payment method + demo status),
  with **Print** and **Save as PDF** (browser print dialog + dedicated
  print stylesheet).
- **My Bookings** — full history with status filter tabs, live hold
  countdowns, cancellation via the existing endpoint, pagination.
- **Account** — read-only profile from `/api/auth/me` (the backend exposes
  no profile-editing endpoint), session/security info, quick links.
- **Authentication** — registration (inline validation, password strength
  meter, visibility toggles; `confirmPassword` never sent to the backend)
  and login with role-based redirection: customer → homepage, admin →
  dashboard, staff → booking lookup. Sessions use the existing rotating
  refresh-token architecture.

## 9. Admin & staff functionalities implemented

**Admin dashboard** (`admin/dashboard.html`)
- Collapsible sidebar workspace with active-page highlight, breadcrumbs,
  top bar with admin menu; mobile burger + overlay.
- Live statistics from real endpoints only: total movies (with now-showing /
  coming-soon / archived split), screens + total seats, upcoming showtimes,
  catalogue status distribution bars, next screenings list.
- **No revenue, transaction or customer analytics are shown** — the backend
  does not expose them.

**Movie management** (`admin/movies.html`) — list with search + pagination,
create/edit modal with live poster preview and validation mirroring the
backend schema (title ≤ 200, duration 1–600, status enum, YYYY-MM-DD release,
poster URL or relative asset path), delete with `IN_USE` (409) protection.

**Screen management** (`admin/screens.html`) — list, create with interactive
**seat-layout preview** (rows A–Z, seats per row, premium-row toggles),
rename, delete with `IN_USE` protection, seat-layout viewer.

**Showtime management** (`admin/showtimes.html`) — create (movie + screen +
future date/time → timezone-aware ISO; overlap and past-time errors handled),
price-only editing (the only update the backend supports), delete with
`IN_USE` protection, filters by movie/screen/date range, pagination.

**Staff booking lookup** (`staff/booking-lookup.html`) — modern lookup by
booking ID (UUID) with paste helper, loading/error/empty states and a
detailed result card. No all-bookings search exists — the backend offers
none, so none is fabricated.

**System monitor** (`/monitor`) — live backend/database health from
`GET /api/health`.

## 10. All payment methods are demo simulations

**Every payment method is a simulation. DEMO PAYMENT MODE — no real money
will be charged or collected.**

| Method | What it does |
|---|---|
| Credit / Debit Card | Local-only form (Luhn check, brand detection, animated preview). Values are wiped after every attempt and never stored or transmitted. |
| PayPal | Simulated authorization sheet in a white panel. No PayPal account, credentials or redirects — labeled DEMO. |
| Google Pay | Simulated wallet card selection + confirmation. Google Pay is never contacted. |
| Apple Pay | Simulated payment sheet with authorization pulse. Apple Wallet / Face ID are never accessed. |
| Cash at Cinema Counter | Demo reservation confirmation; the ticket shows “Cash at Cinema Counter – Demo · no cash was collected”. |

All five call the **existing mock endpoint** `POST /api/bookings/:id/pay`
only after you explicitly confirm the demo method. The ticket is shown only
when the backend returns status `confirmed`. Payment-method labels (e.g.
“Google Pay – Demo”) are kept in `sessionStorage` for the current browser
session only — no payment secrets of any kind are ever stored.

---

## Project structure

```
frontend/
├── index.html movies.html movie-details.html seat-selection.html
├── checkout.html booking-details.html my-bookings.html account.html
├── login.html register.html backendshow.html (system monitor)
├── admin/    dashboard · movies · screens · showtimes
├── staff/    booking-lookup
├── css/      variables base components animations home movies booking
│             checkout ticket auth admin print responsive (13 files)
├── js/
│   ├── config.js               API base URL + rules + page map
│   ├── core/                   api · auth · session · guards · router-helpers
│   ├── services/               auth · movies · screens · showtimes · bookings
│   ├── components/             navbar footer cards toasts modals icons loader
│   ├── payments/               the five demo payment simulations
│   ├── pages/ admin/ staff/    page controllers
│   └── utils/                  dom · formatters · date-time · validators
└── images/ assets/             local poster artwork + favicon
```

## Known limitations (honest scope)

- The backend has no movie trailer field, so no trailer buttons are shown.
- The backend has no profile-update endpoint, so the account page is read-only.
- The backend exposes no revenue/transaction analytics, so the admin
  dashboard shows catalogue/screening statistics only.
- Title search filters the fetched catalogue client-side (the API has no
  search parameter).
- Showtime editing is price-only — that is all `PATCH /api/showtimes/:id`
  accepts.
