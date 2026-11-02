# CineLux — Cinema Ticket Booking System

A complete, premium cinema ticket booking platform: an **existing Node.js + Express + PostgreSQL backend** with a brand-new **pure HTML5 / CSS3 / Vanilla JavaScript frontend** (no React, no Vue, no TypeScript, no build step, no frameworks).

```
Browser (localhost:5500)  ──HTTP/REST──▶  Express API (localhost:4000)  ──▶  PostgreSQL
```

The frontend renders **only** data returned by the backend. Where a feature is not backed by an API, the UI says so instead of faking it.

---

## Repository layout

```
cinema-booking-system/
├── frontend/                 # the complete static frontend (see frontend/README.md)
│   ├── *.html                # 10 customer pages
│   ├── admin/                # 4 admin pages
│   ├── staff/                # booking lookup
│   ├── css/ · js/ · assets/
│   └── README.md             # frontend-specific setup + architecture
├── docs/
│   ├── API-INTEGRATION.md            # every endpoint the frontend uses and how
│   ├── API-COMPATIBILITY-REPORT.md   # documented vs. actual backend, runtime-verified
│   └── TEST-REPORT.md                # test matrix incl. what was and wasn't tested
├── README.md                 # this file
└── .gitignore
```

The backend project is **not included** in this archive — it was supplied separately and must remain untouched.

---

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Node.js | 18+ (tested on 24) | backend runtime |
| PostgreSQL | 14+ | database |
| A static file server | any | Live Server, `python3 -m http.server`, `serve`, nginx… |

## 1. Backend setup

```bash
cd backend
npm install

cp .env.example .env
```

Edit `.env` (values stay on the server — never in the frontend):

```env
NODE_ENV=development
PORT=4000
CORS_ORIGIN=http://localhost:5500        # the frontend origin
DATABASE_URL=postgres://user:pass@localhost:5432/theatre
JWT_ACCESS_SECRET=<at-least-32-characters>
JWT_ACCESS_TTL=15m
REFRESH_TTL_DAYS=7
```

Create the database, run migrations, seed the admin:

```bash
createdb theatre                          # or use your own tooling
npm run migrate                           # applies migrations/001…007

SEED_ADMIN_EMAIL=admin@example.com \
SEED_ADMIN_PASSWORD='change-me-please-12' \
npm run seed                              # admin password: minimum 12 chars
```

Start the API:

```bash
npm run dev        # development (auto-reload)
# npm start        # production-style
```

Health check: `curl http://localhost:4000/api/health` → `{"status":"ok","db":"ok"}`

## 2. Frontend setup

```bash
cd frontend
python3 -m http.server 5500
```

Open **http://localhost:5500**. Serve on **port 5500** (matches the backend's default
`CORS_ORIGIN=http://localhost:5500`). Any other origin requires updating `CORS_ORIGIN`
in the backend `.env` and restarting the API.

The API base URL is configured once in `frontend/js/config.js` (`API_BASE_URL = "http://localhost:4000"`).

> Always use HTTP — `file://` breaks ES modules and cookie-based auth.

## 3. Login & roles

| Role | How it's created | Where it lands after sign-in |
| --- | --- | --- |
| `admin` | `npm run seed` (email + ≥12-char password from env) | `/admin/dashboard.html` |
| `customer` | self-registration (public page) | homepage, bookings, checkout |
| `staff` | promote a user in the DB (e.g. `UPDATE users SET role='staff' WHERE email='…'`) — the backend exposes no role-management API | `/staff/booking-lookup.html` |

All pages share cookie-based session restoration; access tokens live in JS memory only (never localStorage/sessionStorage).

## 4. Workflows

**Customer:** browse → movie details → pick a showtime → pick up to 8 seats on the live map → checkout creates a 10-minute hold (countdown from the backend's `expiresAt`) → demo payment → digital ticket (printable) → history under *My Bookings*.

**Admin:** dashboard (real counts only) → manage movies (CRUD, archive instead of delete when in use) → screens (row picker + live seat-layout preview; rename only after creation) → showtimes (filters, create with timezone-aware start, price-only edits, overlap protection).

**Staff:** look up any booking by its exact UUID — nothing more, by design.

## 5. Known payment limitations

`POST /api/bookings/:id/pay` is a **mock**. No gateway, no card collection, no real money. The UI labels this ("Demo payment — no real money will be charged") and only reports success after the backend returns a `confirmed` booking.

## 6. Troubleshooting

| Symptom | Cause / fix |
| --- | --- |
| `Cannot reach the cinema server` toast | backend not running on `:4000`, or wrong `API_BASE_URL` in `frontend/js/config.js` |
| CORS errors in the console | frontend origin ≠ backend `CORS_ORIGIN` — align them |
| Login works but pages forget the session | frontend opened via `file://` or cookies blocked — serve over HTTP on the same site (`localhost`) |
| `401 UNAUTHORIZED` on admin actions | signed in without the admin role |
| DELETE returns an error toast "Something went wrong…" | known backend quirk (in-use entities return `500` instead of `409 IN_USE`) — see `docs/API-COMPATIBILITY-REPORT.md` |
| Posters missing | `posterUrl` empty or unreachable — the UI shows a styled fallback |

## 7. Documentation

- `docs/API-INTEGRATION.md` — endpoint usage map
- `docs/API-COMPATIBILITY-REPORT.md` — documented vs. actual backend, runtime-verified against a live server
- `docs/TEST-REPORT.md` — full test matrix
- `frontend/README.md` — frontend architecture and error-handling contract
