# API Compatibility Report

Comparison of the **documented API contract** (`Cinema Booking API Documentation.md`)
against the **actual supplied backend source** (`backend/src/...`) and its **runtime
behaviour**, verified live on 2026-11-02.

**Verification environment**

- Backend: unmodified source from the supplied archive, `npm install`, all 7 migrations applied, admin seeded.
- Database: real PostgreSQL 16 (embedded binary), local.
- Method: scripted HTTP requests (curl / Node fetch) covering success and error paths for every endpoint, plus full browser E2E of the frontend flows.

**Summary: every endpoint documented in the contract exists in the supplied backend and works.**
One runtime discrepancy was found (delete-with-dependants error code) and is handled
gracefully by the frontend. Nothing had to be built against a missing endpoint, so no
"API-unavailable" placeholder states were required — the customer journey is fully
database-connected.

---

## Legend

- Implemented: route exists in `src/modules/**` route files (verified by reading source)
- Runtime ✅: exercised against the running backend and returned the documented shape
- Frontend: page(s)/module(s) that consume it

## 1. Auth

| Method | Endpoint | Access | Implemented | Runtime | Frontend | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/auth/register` | public | ✅ `auth.routes.js` | ✅ 201 `{user}`; dup → 409 `EMAIL_TAKEN`; weak password → 400 `VALIDATION_ERROR` (details per field) | register page | contract matches implementation |
| POST | `/api/auth/login` | public | ✅ | ✅ 200 `{user, accessToken}` + `Set-Cookie refresh_token` (HttpOnly, `Path=/api/auth`, SameSite=Lax) | login page | works cross-origin from `:5500` (same-site, credentials include) |
| POST | `/api/auth/refresh` | cookie | ✅ | ✅ 200 `{user, accessToken}` with rotation; reuse → 401 `REFRESH_REUSED`; missing → 401 `UNAUTHORIZED` | every page load (session restore), 401 handler | rotation confirmed live |
| POST | `/api/auth/logout` | cookie | ✅ | ✅ 204, cookie cleared, token revoked | navbar/account | |
| GET | `/api/auth/me` | logged in | ✅ | ✅ 200 `{user}`; expired token → 401 `TOKEN_EXPIRED` (verified with a 3-second JWT) | account page, 401 retry path | |

## 2. Movies

| Method | Endpoint | Access | Implemented | Runtime | Frontend | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/movies` | public | ✅ | ✅ `{data,page,limit,total}`; `status` filter; `limit ≤ 50` (51 → 400) | home, movies, admin | ordering: `release_date DESC NULLS LAST, title` |
| GET | `/api/movies/:id` | public | ✅ | ✅ `{movie}`; unknown → 404 `NOT_FOUND` | movie details | |
| POST | `/api/movies` | admin | ✅ | ✅ 201 `{movie}`; customer token → 403 `FORBIDDEN`; defaults `status=coming_soon` | admin movies | zod validation identical to docs |
| PATCH | `/api/movies/:id` | admin | ✅ | ✅ 200 `{movie}`; empty body → 400 | admin movies | |
| DELETE | `/api/movies/:id` | admin | ✅ | ⚠️ **discrepancy** — free movie → 204 ✅; movie **with showtimes → 500 `INTERNAL`** instead of documented 409 `IN_USE` | admin movies | see §Discrepancy |

## 3. Screens

| Method | Endpoint | Access | Implemented | Runtime | Frontend | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/screens` | public | ✅ | ✅ `{data:[…seatCount]}` | admin screens, dashboard, forms | no pagination in backend (documented as `{data}` only — matches) |
| GET | `/api/screens/:id` | public | ✅ | ✅ `{screen}` with `rows[].seats[{id,number,type}]` | layout viewer | |
| POST | `/api/screens` | admin | ✅ | ✅ 201 `{screen}`; dup name → 409 `SCREEN_NAME_TAKEN`; premium ⊄ rows → 400 | admin screens | seats created per row × seatsPerRow |
| PATCH | `/api/screens/:id` | admin | ✅ | ✅ 200 rename only | admin screens | docs agree: rename-only |
| DELETE | `/api/screens/:id` | admin | ✅ | ⚠️ free screen → 204 ✅; screen with showtimes → **500** instead of 409 `IN_USE` | admin screens | see §Discrepancy |

## 4. Showtimes

| Method | Endpoint | Access | Implemented | Runtime | Frontend | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| GET | `/api/showtimes` | public | ✅ | ✅ filters `movieId/screenId/from/to`; **always upcoming-only** (`starts_at >= now()` by default) — past shows can't be listed | movie details, admin | `from/to` verified live |
| GET | `/api/showtimes/:id` | public | ✅ | ✅ `{showtime}` with nested `movie`, `screen` | seat map header, checkout | |
| GET | `/api/showtimes/:id/seats` | public | ✅ | ✅ `{showtime, rows[{label, seats[{id,number,type,price,status}]}]}`; held/sold states reflected immediately | seat selection, checkout | prices per seat come from showtime prices |
| POST | `/api/showtimes` | admin | ✅ | ✅ 201; overlap → 409 `SHOWTIME_OVERLAP`; past start → 400; endsAt computed (+15 min) | admin showtimes | ISO-with-offset required (`Z` accepted) |
| PATCH | `/api/showtimes/:id` | admin | ✅ | ✅ prices only; at least one required | admin showtimes | |
| DELETE | `/api/showtimes/:id` | admin | ✅ | ⚠️ unused → 204 ✅; with booking history → **500** instead of 409 `IN_USE` | admin showtimes | see §Discrepancy |

## 5. Bookings

| Method | Endpoint | Access | Implemented | Runtime | Frontend | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| POST | `/api/bookings` | customer+ | ✅ | ✅ 201 hold; 401 unauthenticated; `SEAT_UNAVAILABLE` on conflict; `INVALID_SEATS`; hold visible on seat map; expired holds auto-released | checkout | 10-min hold, server-computed total & `expiresAt` |
| GET | `/api/bookings` | customer+ | ✅ | ✅ `{data,page,limit,total}` (own bookings only) | my-bookings, checkout resume | |
| GET | `/api/bookings/:id` | owner / staff / admin | ✅ | ✅ owner 200; other customer → **404** (identity hidden); staff can read any | ticket page, staff lookup | |
| POST | `/api/bookings/:id/pay` | owner | ✅ | ✅ 200 `status:"confirmed"`, `paidAt` set; double-pay harmless; expired hold → 409 `HOLD_EXPIRED` | checkout, ticket | mock payment — confirmed |
| POST | `/api/bookings/:id/cancel` | owner/staff/admin | ✅ | ✅ 200 `cancelled`; again → 409 `BOOKING_NOT_CANCELLABLE`; started showtime → 409 `SHOWTIME_STARTED` | ticket page | |

## 6. Other

| Method | Endpoint | Implemented | Runtime | Notes |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | ✅ | ✅ `{status:"ok", db:"ok"}` | used implicitly (network-failure toasts) |
| any unknown route | — | ✅ | ✅ 404 `{error:{code:"NOT_FOUND"}}` | frontend renders friendly not-found states |

---

## ⚠️ Discrepancy: delete-with-dependants returns 500 instead of 409 IN_USE

**Documented:** `DELETE /api/movies/:id`, `/api/screens/:id`, `/api/showtimes/:id`
return `409 IN_USE` when the entity is referenced.

**Actual:** migrations define the foreign keys as `ON DELETE RESTRICT`
(`migrations/006_create_showtimes.sql`, `007_create_bookings.sql`). PostgreSQL raises
SQLSTATE **23001** (`restrict_violation`) for RESTRICT violations, but the services
catch **23503** (`foreign_key_violation`):

```js
// movies.service.js — same pattern in screens/showtimes services
} catch (err) {
  if (err.code === "23503") {          // never matches: RESTRICT raises "23001"
    throw new AppError(409, "Movie has showtimes. Archive it instead.", "IN_USE");
  }
```

**Result:** deleting a referenced entity returns `500 { code: "INTERNAL" }`.

**Frontend handling (no backend changes were made, per instructions):** the admin UI
treats `IN_USE` **and** a 500 on these delete calls as "in use" and shows the documented
guidance — for movies with a one-click "Archive now" action, for screens/showtimes an
explanation that dependent records block deletion.

**Suggested backend fix (not applied):** also catch `err.code === "23001"` in the three
delete services. That is a 3-line change restoring the documented contract.

---

## Data-shape notes (documented vs actual)

- `GET /api/movies` ordering is `release_date DESC NULLS LAST, title` (undocumented but sensible; UI relies on it for the hero pick).
- Booking objects additionally include `cancelledAt` and `userId` (not in the doc example) — harmless; the UI ignores `userId` and uses `cancelledAt` implicitly via status.
- Seat `type` can be `standard | premium | accessible` in the schema; the screen builder only produces `standard | premium`. The UI renders `accessible` styling whenever the type appears.
- The seat map prices are recalculated per showtime prices (premium → `pricePremium`, else `priceStandard`) — matches the booking service's own pricing.
