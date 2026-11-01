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
after(() => pool.end());

let admin, movieId, screenId;

beforeEach(async () => {
  await resetDb();
  admin = await createUser("admin");
  const movie = await request(app)
    .post("/api/movies")
    .set(bearer(admin.accessToken))
    .send({ title: "Film", durationMinutes: 120, status: "now_showing" });
  movieId = movie.body.movie.id;
  const screen = await request(app)
    .post("/api/screens")
    .set(bearer(admin.accessToken))
    .send({
      name: "Hall 1",
      rows: ["A", "B"],
      seatsPerRow: 5,
      premiumRows: ["B"],
    });
  screenId = screen.body.screen.id;
});

const future = (hours) => new Date(Date.now() + hours * 3600_000).toISOString();

const create = (startsAt, extra = {}) =>
  request(app)
    .post("/api/showtimes")
    .set(bearer(admin.accessToken))
    .send({
      movieId,
      screenId,
      startsAt,
      priceStandard: 10,
      pricePremium: 15,
      ...extra,
    });

test("screen creation generates the right seats", async () => {
  const res = await request(app).get(`/api/screens/${screenId}`);
  assert.equal(res.body.screen.rows.length, 2);
  assert.equal(res.body.screen.rows[0].seats.length, 5);
  assert.equal(res.body.screen.rows[1].seats[0].type, "premium");
});

test("showtime computes endsAt as duration plus 15 minute buffer", async () => {
  const start = future(48);
  const res = await create(start);
  assert.equal(res.status, 201);
  const minutes =
    (new Date(res.body.showtime.endsAt) - new Date(start)) / 60000;
  assert.equal(minutes, 135);
});

test("overlapping showtime on the same screen is rejected", async () => {
  await create(future(48));
  const res = await create(future(49));
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "SHOWTIME_OVERLAP");
});

test("back-to-back showtime is allowed", async () => {
  const start = new Date(Date.now() + 48 * 3600_000);
  await create(start.toISOString());
  const next = new Date(start.getTime() + 135 * 60_000).toISOString();
  const res = await create(next);
  assert.equal(res.status, 201);
});

test("simultaneous overlapping creates: exactly one wins", async () => {
  const start = future(72);
  const results = await Promise.all([
    create(start),
    create(start),
    create(start),
  ]);
  const statuses = results.map((r) => r.status).sort();
  assert.deepEqual(statuses, [201, 409, 409]);
});

test("past start time is rejected", async () => {
  const res = await create("2020-01-01T10:00:00Z");
  assert.equal(res.status, 400);
});

test("movie and screen with showtimes cannot be deleted", async () => {
  await create(future(48));
  const m = await request(app)
    .delete(`/api/movies/${movieId}`)
    .set(bearer(admin.accessToken));
  const s = await request(app)
    .delete(`/api/screens/${screenId}`)
    .set(bearer(admin.accessToken));
  assert.equal(m.status, 409);
  assert.equal(s.status, 409);
});

test("movie list paginates and filters by status", async () => {
  await request(app)
    .post("/api/movies")
    .set(bearer(admin.accessToken))
    .send({ title: "Later", durationMinutes: 90, status: "coming_soon" });
  const res = await request(app).get("/api/movies?status=now_showing&limit=5");
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data[0].title, "Film");
});
