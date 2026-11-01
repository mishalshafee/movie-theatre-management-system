import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  app,
  pool,
  request,
  migrate,
  resetDb,
  createUser,
  bearer,
} from "./helpers/setup.js";

before(migrate);
beforeEach(resetDb);
after(() => pool.end());

const creds = {
  email: "a@test.com",
  password: "correct-horse-battery",
  fullName: "A User",
};

test("register creates a customer and never returns the hash", async () => {
  const res = await request(app).post("/api/auth/register").send(creds);
  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, "customer");
  assert.equal(res.body.user.passwordHash, undefined);
  assert.equal(res.body.user.password_hash, undefined);
});

test("register ignores a client-supplied role", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ ...creds, role: "admin" });
  assert.equal(res.body.user.role, "customer");
});

test("register rejects duplicate email, case-insensitively", async () => {
  await request(app).post("/api/auth/register").send(creds);
  const res = await request(app)
    .post("/api/auth/register")
    .send({ ...creds, email: "A@TEST.com" });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "EMAIL_TAKEN");
});

test("register validates input", async () => {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email: "nope", password: "x" });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "VALIDATION_ERROR");
});

test("login succeeds and sets an httpOnly refresh cookie", async () => {
  await request(app).post("/api/auth/register").send(creds);
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email: creds.email, password: creds.password });
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
  assert.match(res.headers["set-cookie"][0], /refresh_token=.+HttpOnly/);
});

test("wrong password and unknown email give identical errors", async () => {
  await request(app).post("/api/auth/register").send(creds);
  const wrong = await request(app)
    .post("/api/auth/login")
    .send({ email: creds.email, password: "wrong-password" });
  const unknown = await request(app)
    .post("/api/auth/login")
    .send({ email: "x@test.com", password: "wrong-password" });
  assert.equal(wrong.status, 401);
  assert.equal(unknown.status, 401);
  assert.deepEqual(wrong.body, unknown.body);
});

test("/me requires a valid token", async () => {
  const none = await request(app).get("/api/auth/me");
  assert.equal(none.status, 401);
  const bad = await request(app).get("/api/auth/me").set(bearer("garbage"));
  assert.equal(bad.status, 401);
  const user = await createUser();
  const ok = await request(app)
    .get("/api/auth/me")
    .set(bearer(user.accessToken));
  assert.equal(ok.status, 200);
  assert.equal(ok.body.user.id, user.id);
});

test("refresh rotates the token and returns a new access token", async () => {
  const user = await createUser();
  const res = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", user.cookie);
  assert.equal(res.status, 200);
  assert.ok(res.body.accessToken);
  assert.notEqual(res.headers["set-cookie"][0], user.cookie[0]);
});

test("reusing a rotated refresh token kills the whole session", async () => {
  const user = await createUser();
  const first = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", user.cookie);
  assert.equal(first.status, 200);

  const replay = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", user.cookie);
  assert.equal(replay.status, 401);
  assert.equal(replay.body.error.code, "REFRESH_REUSED");

  const newest = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", first.headers["set-cookie"]);
  assert.equal(newest.status, 401);
});

test("logout revokes the refresh token", async () => {
  const user = await createUser();
  const out = await request(app)
    .post("/api/auth/logout")
    .set("Cookie", user.cookie);
  assert.equal(out.status, 204);
  const res = await request(app)
    .post("/api/auth/refresh")
    .set("Cookie", user.cookie);
  assert.equal(res.status, 401);
});

test("requireRole: customer gets 403, admin gets through", async () => {
  const customer = await createUser("customer");
  const admin = await createUser("admin");
  const body = { title: "Film", durationMinutes: 100 };

  const denied = await request(app)
    .post("/api/movies")
    .set(bearer(customer.accessToken))
    .send(body);
  assert.equal(denied.status, 403);
  assert.equal(denied.body.error.code, "FORBIDDEN");

  const allowed = await request(app)
    .post("/api/movies")
    .set(bearer(admin.accessToken))
    .send(body);
  assert.equal(allowed.status, 201);

  const anon = await request(app).post("/api/movies").send(body);
  assert.equal(anon.status, 401);
});
