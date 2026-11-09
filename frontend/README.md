# CineLux — Frontend (Premium Cinema Booking UI)

Pure **HTML5 + CSS3 + Vanilla JavaScript (ES Modules)** customer website, booking
journey, demo checkout and admin dashboard for the CineLux Movie Theatre
Management System. No frameworks, no build step — every page runs directly in
the browser and talks to the existing Node.js/Express + PostgreSQL backend.

## Quick start

```bash
# 1. Start PostgreSQL (from backend/)
cd backend && docker compose up -d

# 2. Migrate + seed + run the API (from backend/)
npm install
npm run migrate && npm run seed
npm run dev            # http://localhost:4000

# 3. Serve this frontend (from frontend/)
python3 -m http.server 5500
# open http://localhost:5500
```

The backend API base URL is auto-detected in `js/config.js`
(`http://<host>:4000` when served on another port, relative `''` when served
by Express on port 4000).

## Structure

```
frontend/
├── index.html                 # cinematic homepage (hero from live data)
├── movies.html                # catalogue + status filter + title search
├── movie-details.html         # details + showtimes grouped by date
├── seat-selection.html        # interactive seat map (8-seat max)
├── checkout.html              # reservation hold + 5 DEMO payment methods
├── booking-details.html       # digital ticket (print / save-as-PDF)
├── my-bookings.html           # booking history + cancellation
├── account.html               # read-only profile (/api/auth/me)
├── login.html / register.html # auth with validation + strength meter
├── backendshow.html           # system monitor (served at /monitor)
├── admin/                     # dashboard, movies, screens, showtimes
├── staff/                     # booking lookup
├── css/                       # design system + page styles + print
├── js/
│   ├── config.js              # API URL, rules, page map
│   ├── core/                  # api client, auth, session, guards, routing
│   ├── services/              # movies/screens/showtimes/bookings/auth
│   ├── components/            # navbar, footer, cards, toasts, modals, icons
│   ├── payments/              # the five DEMO payment method simulations
│   ├── pages/  admin/  staff/ # page controllers
│   └── utils/                 # dom, formatters, date-time, validators
└── images/ assets/            # local posters, hero art, favicon
```

## Payments — DEMO ONLY

All five payment methods (Card, PayPal, Google Pay, Apple Pay, Cash at
Cinema Counter) are **simulated end-to-end**. The only backend call is the
existing mock endpoint `POST /api/bookings/:id/pay`. No card numbers, CVVs,
wallet tokens or credentials are stored or transmitted anywhere.

## Notes

- Max 8 seats per booking; seat holds last 10 minutes (`expiresAt` from the API).
- Revenue/analytics are intentionally absent — the backend does not expose them.
- Profile editing is intentionally absent — the backend has no such endpoint.
