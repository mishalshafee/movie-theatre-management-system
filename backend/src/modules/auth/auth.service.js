import argon2 from "argon2";
import { pool } from "../../db/pool.js";
import { AppError } from "../../utils/errors.js";
import { env } from "../../config/env.js";
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
} from "../../utils/tokens.js";

const dummyHash = await argon2.hash("dummy-password-for-timing");

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

export async function loginUser({ email, password }) {
  const { rows } = await pool.query(
    `SELECT id, email, full_name, role, password_hash
     FROM users WHERE lower(email) = $1`,
    [email],
  );
  const row = rows[0];

  const valid = await argon2.verify(
    row ? row.password_hash : dummyHash,
    password,
  );
  if (!row || !valid) {
    throw new AppError(401, "Invalid email or password", "INVALID_CREDENTIALS");
  }

  const refreshToken = generateRefreshToken();
  await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, now() + make_interval(days => $3))`,
    [row.id, hashToken(refreshToken), env.REFRESH_TTL_DAYS],
  );

  const { password_hash, ...user } = row;
  return { user, accessToken: signAccessToken(user), refreshToken };
}
