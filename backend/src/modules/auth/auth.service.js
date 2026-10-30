import argon2 from "argon2";
import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/errors.js";

export async function registerUser({ email, password, fullName }) {
  const passwordHash = await argon2.hash(password);
  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING id, email, full_name, role, created_at`,
      [email, passwordHash, fullName],
    );
    return rows[0];
  } catch (err) {
    if (err.code === "23505") {
      throw new AppError(409, "Email already registered", "EMAIL_TAKEN");
    }
    throw err;
  }
}
