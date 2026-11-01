import { pool } from "../../db/pool.js";
import { withTransaction } from "../../db/transaction.js";
import { AppError } from "../../utils/errors.js";

function toScreen(r) {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const notFound = () => new AppError(404, "Screen not found", "NOT_FOUND");
const nameTaken = () =>
  new AppError(
    409,
    "A screen with this name already exists",
    "SCREEN_NAME_TAKEN",
  );

export async function listScreens() {
  const { rows } = await pool.query(
    `SELECT s.id, s.name, s.created_at, s.updated_at, count(st.id)::int AS seat_count
     FROM screens s
     LEFT JOIN seats st ON st.screen_id = s.id
     GROUP BY s.id
     ORDER BY s.name`,
  );
  return {
    data: rows.map((r) => ({ ...toScreen(r), seatCount: r.seat_count })),
  };
}

export async function getScreen(id) {
  const screen = await pool.query(
    "SELECT id, name, created_at, updated_at FROM screens WHERE id = $1",
    [id],
  );
  if (!screen.rows[0]) throw notFound();

  const seats = await pool.query(
    `SELECT id, row_label, seat_number, seat_type
     FROM seats WHERE screen_id = $1
     ORDER BY row_label, seat_number`,
    [id],
  );

  const byRow = new Map();
  for (const s of seats.rows) {
    if (!byRow.has(s.row_label)) byRow.set(s.row_label, []);
    byRow
      .get(s.row_label)
      .push({ id: s.id, number: s.seat_number, type: s.seat_type });
  }

  return {
    ...toScreen(screen.rows[0]),
    rows: [...byRow].map(([label, rowSeats]) => ({ label, seats: rowSeats })),
  };
}

export async function createScreen({ name, rows, seatsPerRow, premiumRows }) {
  const screenId = await withTransaction(async (client) => {
    let screen;
    try {
      const res = await client.query(
        "INSERT INTO screens (name) VALUES ($1) RETURNING id",
        [name],
      );
      screen = res.rows[0];
    } catch (err) {
      if (err.code === "23505") throw nameTaken();
      throw err;
    }

    const premium = new Set(premiumRows);
    const labels = [];
    const numbers = [];
    const types = [];
    for (const row of rows) {
      for (let n = 1; n <= seatsPerRow; n++) {
        labels.push(row);
        numbers.push(n);
        types.push(premium.has(row) ? "premium" : "standard");
      }
    }

    await client.query(
      `INSERT INTO seats (screen_id, row_label, seat_number, seat_type)
       SELECT $1::uuid, * FROM unnest($2::text[], $3::int[], $4::text[])`,
      [screen.id, labels, numbers, types],
    );

    return screen.id;
  });

  return getScreen(screenId);
}

export async function renameScreen(id, { name }) {
  try {
    const { rows } = await pool.query(
      `UPDATE screens SET name = $1, updated_at = now()
       WHERE id = $2
       RETURNING id, name, created_at, updated_at`,
      [name, id],
    );
    if (!rows[0]) throw notFound();
    return toScreen(rows[0]);
  } catch (err) {
    if (err.code === "23505") throw nameTaken();
    throw err;
  }
}

export async function deleteScreen(id) {
  const { rowCount } = await pool.query("DELETE FROM screens WHERE id = $1", [
    id,
  ]);
  if (!rowCount) throw notFound();
}
