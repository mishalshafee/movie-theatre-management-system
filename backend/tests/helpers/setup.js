import dotenv from "dotenv";
dotenv.config({ path: ".env.test", quiet: true });

const { default: request } = await import("supertest");
const { app } = await import("../../src/app.js");
const { pool } = await import("../../src/db/pool.js");

export { app, pool, request };

export async function migrate() {
  // reuses the real migration runner against the test database
  await import(`../../src/db/migrate.js?run=${Date.now()}`);
}

export async function resetDb() {
  await pool.query(
    "TRUNCATE users, refresh_tokens, movies, screens, seats, showtimes RESTART IDENTITY CASCADE",
  );
}

export async function createUser(
  role = "customer",
  email = `${role}@test.com`,
) {
  const password = "correct-horse-battery";
  const reg = await request(app)
    .post("/api/auth/register")
    .send({ email, password, fullName: `${role} user` });
  if (role !== "customer") {
    await pool.query("UPDATE users SET role = $1 WHERE id = $2", [
      role,
      reg.body.user.id,
    ]);
  }
  const login = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  return {
    id: reg.body.user.id,
    accessToken: login.body.accessToken,
    cookie: login.headers["set-cookie"],
  };
}

export const bearer = (token) => ({ Authorization: `Bearer ${token}` });
