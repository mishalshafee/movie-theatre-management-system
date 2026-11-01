import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/errors.js";

const BUFFER_MINUTES = 15;

const SELECT = `
  SELECT s.id, s.starts_at, s.ends_at, s.price_standard, s.price_premium,
         m.id AS movie_id, m.title, m.duration_minutes, m.poster_url, m.rating,
         sc.id AS screen_id, sc.name AS screen_name
  FROM showtimes s
  JOIN movies m ON m.id = s.movie_id
  JOIN screens sc ON sc.id = s.screen_id`;

function toShowtime(r) {
  return {
    id: r.id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    priceStandard: Number(r.price_standard),
    pricePremium: Number(r.price_premium),
    movie: {
      id: r.movie_id,
      title: r.title,
      durationMinutes: r.duration_minutes,
      posterUrl: r.poster_url,
      rating: r.rating,
    },
    screen: { id: r.screen_id, name: r.screen_name },
  };
}

const notFound = () => new AppError(404, "Showtime not found", "NOT_FOUND");

export async function listShowtimes({
  movieId,
  screenId,
  from,
  to,
  page,
  limit,
}) {
  const conds = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    conds.push(sql.replace("?", `$${params.length}`));
  };

  if (movieId) add("s.movie_id = ?", movieId);
  if (screenId) add("s.screen_id = ?", screenId);
  add("s.starts_at >= ?", from ?? new Date().toISOString());
  if (to) add("s.starts_at < ?", to);

  const where = `WHERE ${conds.join(" AND ")}`;

  const count = await pool.query(
    `SELECT count(*)::int AS total FROM showtimes s ${where}`,
    params,
  );

  const { rows } = await pool.query(
    `${SELECT} ${where}
     ORDER BY s.starts_at
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit],
  );

  return {
    data: rows.map(toShowtime),
    page,
    limit,
    total: count.rows[0].total,
  };
}

export async function getShowtime(id) {
  const { rows } = await pool.query(`${SELECT} WHERE s.id = $1`, [id]);
  if (!rows[0]) throw notFound();
  return toShowtime(rows[0]);
}

export async function createShowtime({
  movieId,
  screenId,
  startsAt,
  priceStandard,
  pricePremium,
}) {
  let id;
  try {
    const { rows } = await pool.query(
      `INSERT INTO showtimes (movie_id, screen_id, starts_at, ends_at, price_standard, price_premium)
       SELECT m.id, $2::uuid, $3::timestamptz,
              $3::timestamptz + make_interval(mins => m.duration_minutes + $4::int),
              $5::numeric, $6::numeric
       FROM movies m WHERE m.id = $1
       RETURNING id`,
      [
        movieId,
        screenId,
        startsAt,
        BUFFER_MINUTES,
        priceStandard,
        pricePremium,
      ],
    );
    if (!rows[0]) throw new AppError(404, "Movie not found", "NOT_FOUND");
    id = rows[0].id;
  } catch (err) {
    if (err.code === "23P01") {
      throw new AppError(
        409,
        "This screen is already booked at that time",
        "SHOWTIME_OVERLAP",
      );
    }
    if (err.code === "23503")
      throw new AppError(404, "Screen not found", "NOT_FOUND");
    throw err;
  }
  return getShowtime(id);
}

export async function updateShowtime(id, { priceStandard, pricePremium }) {
  const { rowCount } = await pool.query(
    `UPDATE showtimes
     SET price_standard = COALESCE($1::numeric, price_standard),
         price_premium  = COALESCE($2::numeric, price_premium)
     WHERE id = $3`,
    [priceStandard ?? null, pricePremium ?? null, id],
  );
  if (!rowCount) throw notFound();
  return getShowtime(id);
}

export async function deleteShowtime(id) {
  const { rowCount } = await pool.query("DELETE FROM showtimes WHERE id = $1", [
    id,
  ]);
  if (!rowCount) throw notFound();
}
