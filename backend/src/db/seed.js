import argon2 from "argon2";
import { z } from "zod";
import { pool } from "./pool.js";

const { SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = z
  .object({
    SEED_ADMIN_EMAIL: z.string().trim().toLowerCase().email(),
    SEED_ADMIN_PASSWORD: z.string().min(12),
  })
  .parse(process.env);

const hash = await argon2.hash(SEED_ADMIN_PASSWORD);

const { rowCount } = await pool.query(
  `INSERT INTO users (email, password_hash, full_name, role)
   VALUES ($1, $2, 'Administrator', 'admin')
   ON CONFLICT (lower(email)) DO NOTHING`,
  [SEED_ADMIN_EMAIL, hash],
);

console.log(
  rowCount
    ? `created admin ${SEED_ADMIN_EMAIL}`
    : "admin already exists, nothing changed",
);
await pool.end();
