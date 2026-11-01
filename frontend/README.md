# CinePremiere — Frontend (Phase 01) · Pure HTML / CSS / JavaScript

The **exact same** premium cinema frontend (Home, Login, Register), rebuilt with
**vanilla HTML, CSS, and JavaScript** — no React, no Vite, no build step,
no npm install required to run.

Everything that was done with libraries in the React version is done natively
here:

| Concern (React version)        | Pure-JS version                        |
| ------------------------------ | -------------------------------------- |
| React + Vite                   | Plain `.html` / `.css` / `.js` files   |
| React Router                   | Multi-page (separate HTML files)       |
| Axios                          | Native `fetch`                         |
| React Context                  | Tiny pub/sub module (`js/auth.js`)     |
| Framer Motion                  | CSS keyframes + `IntersectionObserver` |
| Lucide React                   | Inline SVG icons                       |
| Build step                     | **None** — serve the folder as-is      |

---

## Pages

- **Home** — `index.html` (route `/`)
- **Login** — `login.html` (route `/login`)
- **Register** — `register.html` (route `/register`)

The Home page uses **fictional demonstration movies** (`data/movies.js`).
Login & Register are wired to the **real backend**.

---

## File structure

```
frontend-static/
├── index.html              # Home page
├── login.html              # Login page
├── register.html           # Register page
├── css/
│   ├── global.css          # Tokens, reset, navbar, footer, toast, buttons
│   ├── animations.css      # Keyframes + scroll-reveal + page entrance
│   ├── home.css            # Home page styles
│   └── auth.css            # Login/Register styles
├── js/
│   ├── config.js           # API base URL (single place to change)
│   ├── api.js              # fetch client + silent refresh logic
│   ├── auth.js             # global auth state (pub/sub) + actions
│   ├── toast.js            # toast notifications
│   ├── validation.js       # form validators + error extraction
│   ├── navbar.js           # navbar behaviour (scroll, mobile menu, auth)
│   ├── reveal.js           # IntersectionObserver scroll animations
│   ├── home.js             # home page logic (render movies, filter)
│   ├── login.js            # login page logic
│   └── register.js         # register page logic
├── data/
│   └── movies.js           # 6 fictional demo movies (home only)
└── images/
    ├── favicon.svg
    ├── hero/hero-cinema.svg
    └── movies/movie-1..6.svg
```

---

## Setup

### 1. Configure the backend URL

Open `js/config.js` and set the base URL to your existing backend:

```js
export const API_BASE_URL = 'http://localhost:4000';
```

> The backend must be running and reachable. Ensure the backend's
> `CORS_ORIGIN` includes the origin you serve this folder from (e.g.
> `http://localhost:8000`) **and** that it sends credentials-enabled CORS
> (`Access-Control-Allow-Credentials: true`) so the HTTP-only refresh cookie
> works cross-origin.

### 2. Serve the folder over HTTP

ES modules (`import`/`export`) require an HTTP server — opening
`index.html` directly via `file://` will **not** work. Use any static server:

**Option A — Python (already installed almost everywhere):**
```bash
cd frontend-static
python3 -m http.server 8000
```

**Option B — Node (no install):**
```bash
cd frontend-static
npx serve -p 8000
```

Then open **http://localhost:8000**.

---

## Backend API contract used

| Endpoint             | Method | Body                            | Response                                              |
| -------------------- | ------ | ------------------------------- | ----------------------------------------------------- |
| `/api/auth/register` | POST   | `{ fullName, email, password }` | `{ user: { id, email, fullName, role, createdAt } }` |
| `/api/auth/login`    | POST   | `{ email, password }`           | `{ user, accessToken }`                               |
| `/api/auth/refresh`  | POST   | _(cookie only)_                 | `{ accessToken }`                                     |
| `/api/auth/me`       | GET    | _(Bearer token)_                | `{ user }`                                            |
| `/api/auth/logout`   | POST   | _(cookie only)_                 | `204` / empty                                         |

### Validation rules (enforced on the frontend)

- **Full name** — 1–100 characters.
- **Email** — valid email format.
- **Password** — 8–128 characters.
- **Confirm password** — frontend-only equality check (never sent).
- **Role** — never sent; backend assigns `customer` automatically.

---

## Authentication design

- **Access token** kept **in memory only** (module variable in `js/api.js`).
  Never written to `localStorage` / `sessionStorage`.
- **Refresh token** lives in an **HTTP-only cookie** managed by the backend.
  `fetch` uses `credentials: 'include'` so the cookie travels automatically.
- **Silent refresh**: on any `401`, `api.js` calls `/api/auth/refresh`
  **once**, replays the original request, and guards against:
  - concurrent refresh requests (single shared promise),
  - infinite loops (the refresh endpoint itself is excluded),
  - the login/register endpoints (so invalid credentials surface normally).
- **Session restore on startup**: `js/auth.js` calls `/api/auth/refresh` once
  on load. If it returns `401` (no valid cookie), the user stays a **guest
  silently** — no error toast.
- **Logout**: calls `/api/auth/logout` (clears the cookie) and drops the
  in-memory token, returning to a guest state. The navbar updates instantly
  via the pub/sub.

---

## Animations & accessibility

- Page-load fade/slide entrance, scroll-reveal (`IntersectionObserver` +
  `[data-reveal]`), staggered form fields, button hover lifts, card hover
  lifts, image zoom, floating hero orbs, light sweep, toast slide-in,
  password toggle.
- All motion **respects `prefers-reduced-motion`**.
- Fully responsive down to mobile, with an animated hamburger menu and a
  single-column auth layout on small screens.

---

## What is intentionally NOT here (later phases)

- Movie detail pages, seat selection, booking, payments.
- Admin dashboard.
- Any fake/mock authentication — every login/register call hits the real
  backend.

---

## Troubleshooting

- **"Unable to reach the server…"** — backend isn't running on the URL in
  `js/config.js`, or CORS is blocking the request. Confirm the backend is up
  and that `CORS_ORIGIN` includes your static-server origin.
- **Blank page / module errors in console** — you opened the file via
  `file://`. Serve the folder over HTTP (see Setup step 2).
- **Refresh doesn't restore the session** — the refresh cookie isn't being
  sent. Ensure the backend sets the cookie with `SameSite=Lax` (or `None` +
  `Secure` over HTTPS) and that CORS allows credentials.
