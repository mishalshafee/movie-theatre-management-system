import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/errors.js";

const COLS = `id, title, description, duration_minutes, genre, rating, poster_url,
  to_char(release_date, 'YYYY-MM-DD') AS release_date, status, created_at, updated_at`;

function toMovie(r) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    durationMinutes: r.duration_minutes,
    genre: r.genre,
    rating: r.rating,
    posterUrl: r.poster_url,
    releaseDate: r.release_date,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const notFound = () => new AppError(404, "Movie not found", "NOT_FOUND");

export async function listMovies({ status, page, limit }) {
  const where = status ? "WHERE status = $1" : "";
  const params = status ? [status] : [];

  const count = await pool.query(
    `SELECT count(*)::int AS total FROM movies ${where}`,
    params,
  );

  const { rows } = await pool.query(
    `SELECT ${COLS} FROM movies ${where}
     ORDER BY release_date DESC NULLS LAST, title
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit],
  );

  return { data: rows.map(toMovie), page, limit, total: count.rows[0].total };
}

export async function getMovie(id) {
  const { rows } = await pool.query(
    `SELECT ${COLS} FROM movies WHERE id = $1`,
    [id],
  );
  if (!rows[0]) throw notFound();
  return toMovie(rows[0]);
}

export async function createMovie(d) {
  const { rows } = await pool.query(
    `INSERT INTO movies
       (title, description, duration_minutes, genre, rating, poster_url, release_date, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLS}`,
    [
      d.title,
      d.description ?? "",
      d.durationMinutes,
      d.genre ?? null,
      d.rating ?? null,
      d.posterUrl ?? null,
      d.releaseDate ?? null,
      d.status ?? "coming_soon",
    ],
  );
  return toMovie(rows[0]);
}

const UPDATABLE = {
  title: "title",
  description: "description",
  durationMinutes: "duration_minutes",
  genre: "genre",
  rating: "rating",
  posterUrl: "poster_url",
  releaseDate: "release_date",
  status: "status",
};

export async function updateMovie(id, data) {
  const sets = [];
  const values = [];
  for (const [key, column] of Object.entries(UPDATABLE)) {
    if (data[key] !== undefined) {
      values.push(data[key]);
      sets.push(`${column} = $${values.length}`);
    }
  }
  values.push(id);

  const { rows } = await pool.query(
    `UPDATE movies SET ${sets.join(", ")}, updated_at = now()
     WHERE id = $${values.length}
     RETURNING ${COLS}`,
    values,
  );
  if (!rows[0]) throw notFound();
  return toMovie(rows[0]);
}

export async function deleteMovie(id) {
  const { rowCount } = await pool.query("DELETE FROM movies WHERE id = $1", [
    id,
  ]);
  if (!rowCount) throw notFound();
}
