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

let admin, showtimeId, screenId, seats;

const future = (hours) => new Date(Date.now() + hours * 3600_000).toISOString();

beforeEach(async () => {
  await resetDb();
  admin = await createUser("admin");

  const movie = await request(app)
    .post("/api/movies")
    .set(bearer(admin.accessToken))
    .send({ title: "Film", durationMinutes: 120, status: "now_showing" });
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
  seats = screen.body.screen.rows.flatMap((r) => r.seats); // A1..A5 standard, B1..B5 premium

  const showtime = await request(app)
    .post("/api/showtimes")
    .set(bearer(admin.accessToken))
    .send({
      movieId: movie.body.movie.id,
      screenId,
      startsAt: future(48),
      priceStandard: 10,
      pricePremium: 15,
    });
  showtimeId = showtime.body.showtime.id;
});

const book = (user, seatIds, id = showtimeId) =>
  request(app)
    .post("/api/bookings")
    .set(bearer(user.accessToken))
    .send({ showtimeId: id, seatIds });

const seatMap = async () =>
  (
    await request(app).get(`/api/showtimes/${showtimeId}/seats`)
  ).body.rows.flatMap((r) => r.seats);

const customer = (name) => createUser("customer", `${name}@test.com`);

test("seat map starts fully available with prices by seat type", async () => {
  const map = await seatMap();
  assert.equal(map.length, 10);
  assert.ok(map.every((s) => s.status === "available"));
  assert.equal(map[0].price, 10);
  assert.equal(map[5].price, 15);
});

test("booking holds the seats, computes the total and shows as held", async () => {
  const alice = await customer("alice");
  const res = await book(alice, [seats[0].id, seats[5].id]);
  assert.equal(res.status, 201);
  assert.equal(res.body.booking.status, "held");
  assert.equal(res.body.booking.total, 25);
  assert.equal(res.body.booking.seats.length, 2);
  assert.match(res.body.booking.code, /^[A-Z2-9]{8}$/);

  const map = await seatMap();
  assert.equal(map[0].status, "held");
  assert.equal(map[5].status, "held");
  assert.equal(map[1].status, "available");
});

test("a taken seat is rejected and nothing is partially booked", async () => {
  const alice = await customer("alice");
  const bob = await customer("bob");
  await book(alice, [seats[0].id]);

  const res = await book(bob, [seats[1].id, seats[0].id]);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "SEAT_UNAVAILABLE");

  const map = await seatMap();
  assert.equal(map[1].status, "available");
});

test("8 users fight for one seat: exactly one wins", async () => {
  const users = [];
  for (let i = 0; i < 8; i++) users.push(await customer(`u${i}`));

  const results = await Promise.all(users.map((u) => book(u, [seats[0].id])));
  assert.deepEqual(
    results.map((r) => r.status).sort(),
    [201, 409, 409, 409, 409, 409, 409, 409],
  );

  const { rows } = await pool.query(
    "SELECT count(*)::int AS n FROM booking_seats WHERE active",
  );
  assert.equal(rows[0].n, 1);
});

test("overlapping multi-seat bookings: one wins, no deadlock", async () => {
  const alice = await customer("alice");
  const bob = await customer("bob");
  const [a, b] = await Promise.all([
    book(alice, [seats[0].id, seats[1].id]),
    book(bob, [seats[1].id, seats[0].id]),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
});

test("an expired hold frees the seat for someone else", async () => {
  const alice = await customer("alice");
  const bob = await customer("bob");
  const held = await book(alice, [seats[0].id]);
  await pool.query(
    `UPDATE bookings SET expires_at = now() - interval '1 minute' WHERE id = $1`,
    [held.body.booking.id],
  );

  assert.equal((await seatMap())[0].status, "available");

  const res = await book(bob, [seats[0].id]);
  assert.equal(res.status, 201);

  const old = await request(app)
    .get(`/api/bookings/${held.body.booking.id}`)
    .set(bearer(alice.accessToken));
  assert.equal(old.body.booking.status, "expired");
});

test("paying an expired hold fails with HOLD_EXPIRED", async () => {
  const alice = await customer("alice");
  const held = await book(alice, [seats[0].id]);
  await pool.query(
    `UPDATE bookings SET expires_at = now() - interval '1 minute' WHERE id = $1`,
    [held.body.booking.id],
  );

  const res = await request(app)
    .post(`/api/bookings/${held.body.booking.id}/pay`)
    .set(bearer(alice.accessToken));
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "HOLD_EXPIRED");
  assert.equal((await seatMap())[0].status, "available");
});

test("paying confirms the booking and marks seats sold", async () => {
  const alice = await customer("alice");
  const held = await book(alice, [seats[0].id]);
  const id = held.body.booking.id;

  const pay = await request(app)
    .post(`/api/bookings/${id}/pay`)
    .set(bearer(alice.accessToken));
  assert.equal(pay.status, 200);
  assert.equal(pay.body.booking.status, "confirmed");
  assert.ok(pay.body.booking.paidAt);
  assert.equal((await seatMap())[0].status, "sold");

  const again = await request(app)
    .post(`/api/bookings/${id}/pay`)
    .set(bearer(alice.accessToken));
  assert.equal(again.status, 200);
});

test("cancelling releases the seats and allows rebooking", async () => {
  const alice = await customer("alice");
  const bob = await customer("bob");
  const held = await book(alice, [seats[0].id]);
  const id = held.body.booking.id;

  const cancel = await request(app)
    .post(`/api/bookings/${id}/cancel`)
    .set(bearer(alice.accessToken));
  assert.equal(cancel.status, 200);
  assert.equal(cancel.body.booking.status, "cancelled");

  const twice = await request(app)
    .post(`/api/bookings/${id}/cancel`)
    .set(bearer(alice.accessToken));
  assert.equal(twice.status, 409);

  assert.equal((await book(bob, [seats[0].id])).status, 201);
});

test("users cannot see, pay or cancel each other's bookings, but admins can read them", async () => {
  const alice = await customer("alice");
  const bob = await customer("bob");
  const id = (await book(alice, [seats[0].id])).body.booking.id;

  const get = await request(app)
    .get(`/api/bookings/${id}`)
    .set(bearer(bob.accessToken));
  const pay = await request(app)
    .post(`/api/bookings/${id}/pay`)
    .set(bearer(bob.accessToken));
  const cancel = await request(app)
    .post(`/api/bookings/${id}/cancel`)
    .set(bearer(bob.accessToken));
  assert.deepEqual([get.status, pay.status, cancel.status], [404, 404, 404]);

  const asAdmin = await request(app)
    .get(`/api/bookings/${id}`)
    .set(bearer(admin.accessToken));
  assert.equal(asAdmin.status, 200);
});

test("listing returns only my bookings", async () => {
  const alice = await customer("alice");
  const bob = await customer("bob");
  await book(alice, [seats[0].id]);
  await book(bob, [seats[1].id]);

  const res = await request(app)
    .get("/api/bookings")
    .set(bearer(alice.accessToken));
  assert.equal(res.body.total, 1);
  assert.equal(res.body.data[0].seats[0].number, 1);
});

test("seats from another screen are rejected", async () => {
  const alice = await customer("alice");
  const other = await request(app)
    .post("/api/screens")
    .set(bearer(admin.accessToken))
    .send({ name: "Hall 2", rows: ["A"], seatsPerRow: 3 });
  const foreignSeat = other.body.screen.rows[0].seats[0].id;

  const res = await book(alice, [foreignSeat]);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, "INVALID_SEATS");
});

test("a showtime that already started cannot be booked", async () => {
  const alice = await customer("alice");
  const { rows } = await pool.query(
    `INSERT INTO showtimes (movie_id, screen_id, starts_at, ends_at, price_standard, price_premium)
     SELECT movie_id, screen_id, now() - interval '5 hours', now() - interval '3 hours', 10, 15
     FROM showtimes WHERE id = $1 RETURNING id`,
    [showtimeId],
  );
  const res = await book(alice, [seats[0].id], rows[0].id);
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, "SHOWTIME_STARTED");
});

test("booking requires login, and a showtime with bookings cannot be deleted", async () => {
  const anon = await request(app)
    .post("/api/bookings")
    .send({ showtimeId, seatIds: [seats[0].id] });
  assert.equal(anon.status, 401);

  const alice = await customer("alice");
  await book(alice, [seats[0].id]);
  const del = await request(app)
    .delete(`/api/showtimes/${showtimeId}`)
    .set(bearer(admin.accessToken));
  assert.equal(del.status, 409);
  assert.equal(del.body.error.code, "IN_USE");
});
