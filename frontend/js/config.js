/**
 * CineLux — Central Application Configuration.
 *
 * Backend base URL:
 * - If running from Express (port 4000), uses relative ''
 * - If running from Live Server, uses matching hostname on port 4000 (prevents cross-site cookie blocks)
 */
export const API_BASE_URL =
  window.location.protocol === "file:"
    ? "http://localhost:4000"
    : window.location.port === "4000"
      ? ""
      : `${window.location.protocol}//${window.location.hostname || "localhost"}:4000`;

export const APP_NAME = "CineLux";
export const SITE_NAME = "CineLux";
export const APP_TAGLINE = "Premium Cinema Experience";
export const CURRENCY = "USD";

export const RULES = {
  MOVIES_MAX_LIMIT: 50,
  MAX_SEATS_PER_BOOKING: 8,
  HOLD_MINUTES: 10,
};

export const PAGES = {
  home: "index.html",
  movies: "movies.html",
  movieDetails: "movie-details.html",
  seatSelection: "seat-selection.html",
  checkout: "checkout.html",
  bookingDetails: "booking-details.html",
  myBookings: "my-bookings.html",
  login: "login.html",
  register: "register.html",
  account: "account.html",
  adminDashboard: "admin/dashboard.html",
  adminMovies: "admin/movies.html",
  adminScreens: "admin/screens.html",
  adminShowtimes: "admin/showtimes.html",
  staffLookup: "staff/booking-lookup.html",
};
