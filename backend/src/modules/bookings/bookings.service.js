import { pool } from "../../db/pool.js";
import { withTransaction } from "../../db/transaction.js";
import { AppError } from "../../utils/errors.js";
import { generateBookingCode } from "../../utils/tokens.js";

const HOLD_MINUTES = 10;

const notFound = () => new AppError(404, "Booking not found", "NOT_FOUND");

// A held booking past its expiry is reported as expired even before cleanup runs.
const SELECT = `
  SELECT b.id, b.code, b.user_id,
         CASE WHEN b.status = 'held' AND b.expires_at <= now() THEN 'expired' ELSE b.status END AS status,
         b.total, b.expires_at, b.paid_at, b.cancelled_at, b.created_at,
         s.id AS showtime_id, s.starts_at, s.ends_at,
         m.id AS movie_id, m.title, m.poster_url,
         sc.id AS screen_id, sc.name AS screen_name
  FROM bookings b
  JOIN showtimes s ON s.id = b.showtime_id
  JOIN movies m ON m.id = s.movie_id
  JOIN screens sc ON sc.id = s.screen_id`;

async function loadBookings(where, params, tail = "") {
  const { rows } = await pool.query(`${SELECT} ${where} ${tail}`, params);
  if (!rows.length) return [];

  const seatRows = await pool.query(
    `SELECT bs.booking_id, bs.price, st.id, st.row_label, st.seat_number, st.seat_type
     FROM booking_seats bs
     JOIN seats st ON st.id = bs.seat_id
     WHERE bs.booking_id = ANY($1::uuid[])
     ORDER BY st.row_label, st.seat_number`,
    [rows.map((r) => r.id)],
  );

  const seatsByBooking = new Map();
  for (const s of seatRows.rows) {
    if (!seatsByBooking.has(s.booking_id)) seatsByBooking.set(s.booking_id, []);
    seatsByBooking.get(s.booking_id).push({
      id: s.id,
      row: s.row_label,
      number: s.seat_number,
      type: s.seat_type,
      price: Number(s.price),
    });
  }

  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    userId: r.user_id,
    status: r.status,
    total: Number(r.total),
    expiresAt: r.expires_at,
    paidAt: r.paid_at,
    cancelledAt: r.cancelled_at,
    createdAt: r.created_at,
    showtime: {
      id: r.showtime_id,
      startsAt: r.starts_at,
      endsAt: r.ends_at,
      movie: { id: r.movie_id, title: r.title, posterUrl: r.poster_url },
      screen: { id: r.screen_id, name: r.screen_name },
    },
    seats: seatsByBooking.get(r.id) ?? [],
  }));
}

// Frees a booking's seats and records why. Runs inside a caller's transaction.
async function releaseBooking(client, id, status) {
  await client.query(
    `UPDATE bookings
     SET status = $2::text,
         cancelled_at = CASE WHEN $2::text = 'cancelled' THEN now() ELSE cancelled_at END,
         updated_at = now()
     WHERE id = $1`,
    [id, status],
  );
  await client.query(
    "UPDATE booking_seats SET active = false WHERE booking_id = $1",
    [id],
  );
}

export async function createBooking(userId, { showtimeId, seatIds }) {
  const bookingId = await withTransaction(async (client) => {
    const st = await client.query(
      `SELECT id, screen_id, price_standard, price_premium, starts_at <= now() AS started
       FROM showtimes WHERE id = $1`,
      [showtimeId],
    );
    const showtime = st.rows[0];
    if (!showtime) throw new AppError(404, "Showtime not found", "NOT_FOUND");
    if (showtime.started) {
      throw new AppError(
        409,
        "This showtime has already started",
        "SHOWTIME_STARTED",
      );
    }

    // Release expired holds on this showtime so their seats can be taken again.
    await client.query(
      `WITH expired AS (
         UPDATE bookings SET status = 'expired', updated_at = now()
         WHERE showtime_id = $1 AND status = 'held' AND expires_at <= now()
         RETURNING id
       )
       UPDATE booking_seats SET active = false
       WHERE booking_id IN (SELECT id FROM expired)`,
      [showtimeId],
    );

    // ORDER BY id gives every transaction the same insert order, which avoids deadlocks
    // when two bookings overlap on several seats.
    const seats = await client.query(
      `SELECT id, seat_type FROM seats
       WHERE screen_id = $1 AND id = ANY($2::uuid[])
       ORDER BY id`,
      [showtime.screen_id, seatIds],
    );
    if (seats.rows.length !== seatIds.length) {
      throw new AppError(
        400,
        "One or more seats do not belong to this screen",
        "INVALID_SEATS",
      );
    }

    const ids = seats.rows.map((s) => s.id);
    const prices = seats.rows.map((s) =>
      s.seat_type === "premium"
        ? showtime.price_premium
        : showtime.price_standard,
    );
    const cents = prices.reduce(
      (sum, p) => sum + Math.round(Number(p) * 100),
      0,
    );

    const booking = await client.query(
      `INSERT INTO bookings (code, user_id, showtime_id, total, expires_at)
       VALUES ($1, $2, $3, $4::numeric, now() + make_interval(mins => $5::int))
       RETURNING id`,
      [
        generateBookingCode(),
        userId,
        showtimeId,
        (cents / 100).toFixed(2),
        HOLD_MINUTES,
      ],
    );
    const id = booking.rows[0].id;

    try {
      await client.query(
        `INSERT INTO booking_seats (booking_id, showtime_id, seat_id, price)
         SELECT $1::uuid, $2::uuid, * FROM unnest($3::uuid[], $4::numeric[])`,
        [id, showtimeId, ids, prices],
      );
    } catch (err) {
      if (
        err.code === "23505" &&
        err.constraint === "booking_seats_active_unique"
      ) {
        throw new AppError(
          409,
          "One or more seats are no longer available",
          "SEAT_UNAVAILABLE",
        );
      }
      throw err;
    }

    return id;
  });

  const [booking] = await loadBookings("WHERE b.id = $1", [bookingId]);
  return booking;
}

export async function listMyBookings(userId, { page, limit }) {
  const count = await pool.query(
    "SELECT count(*)::int AS total FROM bookings WHERE user_id = $1",
    [userId],
  );
  const data = await loadBookings(
    "WHERE b.user_id = $1",
    [userId, limit, (page - 1) * limit],
    "ORDER BY b.created_at DESC LIMIT $2 OFFSET $3",
  );
  return { data, page, limit, total: count.rows[0].total };
}

export async function getBookingFor(id, user) {
  const [booking] = await loadBookings("WHERE b.id = $1", [id]);
  const privileged = user.role === "staff" || user.role === "admin";
  // Hide other people's bookings behind a 404 instead of revealing they exist.
  if (!booking || (booking.userId !== user.id && !privileged)) throw notFound();
  return booking;
}

// Mock payment: no money moves. A real gateway would replace this function.
export async function payBooking(id, userId) {
  const outcome = await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT user_id, status, expires_at <= now() AS is_expired
       FROM bookings WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const b = rows[0];
    if (!b || b.user_id !== userId) throw notFound();

    if (b.status === "confirmed") return "ok"; // paying twice is harmless
    if (b.status !== "held") {
      throw new AppError(
        409,
        `Booking is ${b.status} and cannot be paid`,
        "BOOKING_NOT_PAYABLE",
      );
    }
    if (b.is_expired) {
      await releaseBooking(client, id, "expired");
      return "expired";
    }

    await client.query(
      `UPDATE bookings SET status = 'confirmed', paid_at = now(), updated_at = now() WHERE id = $1`,
      [id],
    );
    return "ok";
  });

  // The expiry is committed first, then reported, like the refresh-token reuse case.
  if (outcome === "expired") {
    throw new AppError(
      409,
      "Your hold expired. Please choose your seats again.",
      "HOLD_EXPIRED",
    );
  }
  return getBookingFor(id, { id: userId, role: "customer" });
}

export async function cancelBooking(id, user) {
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT b.user_id, b.status, s.starts_at <= now() AS started
       FROM bookings b JOIN showtimes s ON s.id = b.showtime_id
       WHERE b.id = $1 FOR UPDATE OF b`,
      [id],
    );
    const b = rows[0];
    const privileged = user.role === "staff" || user.role === "admin";
    if (!b || (b.user_id !== user.id && !privileged)) throw notFound();

    if (b.status !== "held" && b.status !== "confirmed") {
      throw new AppError(
        409,
        `Booking is ${b.status} and cannot be cancelled`,
        "BOOKING_NOT_CANCELLABLE",
      );
    }
    if (b.status === "confirmed" && b.started) {
      throw new AppError(
        409,
        "This showtime has already started",
        "SHOWTIME_STARTED",
      );
    }

    await releaseBooking(client, id, "cancelled");
  });

  return getBookingFor(id, user);
}
