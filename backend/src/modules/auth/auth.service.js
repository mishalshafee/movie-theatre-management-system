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

export async function getUserById(id) {
  const { rows } = await pool.query(
    "SELECT id, email, full_name, role, created_at FROM users WHERE id = $1",
    [id],
  );
  return rows[0] ?? null;
}

export async function refreshSession(token) {
  const client = await pool.connect();
  let failure = null;
  let result = null;

  try {
    await client.query("BEGIN");

    const { rows } = await client.query(
      `SELECT rt.id, rt.family_id, rt.user_id, rt.expires_at, rt.revoked_at, u.role
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token_hash = $1
       FOR UPDATE OF rt`,
      [hashToken(token)],
    );
    const row = rows[0];

    if (!row) {
      failure = new AppError(401, "Invalid refresh token", "UNAUTHORIZED");
    } else if (row.revoked_at) {
      // A rotated or logged-out token came back: assume theft, kill the session.
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = now()
         WHERE family_id = $1 AND revoked_at IS NULL`,
        [row.family_id],
      );
      failure = new AppError(
        401,
        "Refresh token reuse detected",
        "REFRESH_REUSED",
      );
    } else if (new Date(row.expires_at) < new Date()) {
      failure = new AppError(401, "Refresh token expired", "UNAUTHORIZED");
    } else {
      const newToken = generateRefreshToken();
      await client.query(
        "UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1",
        [row.id],
      );
      await client.query(
        `INSERT INTO refresh_tokens (user_id, family_id, token_hash, expires_at)
         VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
        [row.user_id, row.family_id, hashToken(newToken), env.REFRESH_TTL_DAYS],
      );
      const user = { id: row.user_id, role: row.role };
      result = {
        user,
        accessToken: signAccessToken(user),
        refreshToken: newToken,
      };
    }

    // Commit even on failure so the family revocation above persists.
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  if (failure) throw failure;
  return result;
}

export async function logoutSession(token) {
  await pool.query(
    `UPDATE refresh_tokens SET revoked_at = now()
     WHERE token_hash = $1 AND revoked_at IS NULL`,
    [hashToken(token)],
  );
}
