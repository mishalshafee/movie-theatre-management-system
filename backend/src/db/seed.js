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

const { rowCount: userCount } = await pool.query(
  `INSERT INTO users (email, password_hash, full_name, role)
   VALUES ($1, $2, 'Administrator', 'admin')
   ON CONFLICT (lower(email)) DO NOTHING`,
  [SEED_ADMIN_EMAIL, hash],
);

console.log(
  userCount
    ? `created admin ${SEED_ADMIN_EMAIL}`
    : "admin already exists, nothing changed",
);

// 1. Seed initial movie catalog if empty
const { rows: existingMovies } = await pool.query(
  "SELECT count(*)::int AS count FROM movies",
);

if (existingMovies[0].count === 0) {
  const initialMovies = [
    {
      title: "Stellar Horizon",
      description:
        "A lone navigator drifts toward the edge of charted space in search of a signal that could rewrite humanity.",
      durationMinutes: 138,
      genre: "Sci-Fi",
      rating: "8.7",
      posterUrl: "images/movies/movie-1.svg",
      releaseDate: "2026-03-15",
      status: "now_showing",
    },
    {
      title: "Midnight Reverie",
      description:
        "A sleep researcher discovers her dreams are being broadcast to strangers across the city.",
      durationMinutes: 116,
      genre: "Thriller",
      rating: "8.2",
      posterUrl: "images/movies/movie-2.svg",
      releaseDate: "2026-04-10",
      status: "now_showing",
    },
    {
      title: "Crimson Vale",
      description:
        "Three generations of a family confront a long-buried secret in a valley that never forgets.",
      durationMinutes: 124,
      genre: "Drama",
      rating: "8.9",
      posterUrl: "images/movies/movie-3.svg",
      releaseDate: "2026-04-22",
      status: "now_showing",
    },
    {
      title: "Echoes of Tomorrow",
      description:
        "When the future starts leaving voicemails, a historian must decide which one to answer.",
      durationMinutes: 151,
      genre: "Sci-Fi",
      rating: "8.5",
      posterUrl: "images/movies/movie-4.svg",
      releaseDate: "2026-06-01",
      status: "coming_soon",
    },
    {
      title: "The Last Cartographer",
      description:
        "The final mapmaker embarks on one last expedition to chart a forest that keeps moving.",
      durationMinutes: 129,
      genre: "Adventure",
      rating: "8.0",
      posterUrl: "images/movies/movie-5.svg",
      releaseDate: "2026-06-18",
      status: "coming_soon",
    },
    {
      title: "Paper Moon Boulevard",
      description:
        "Two strangers keep meeting on the same neon street at the same impossible hour every night.",
      durationMinutes: 108,
      genre: "Romance",
      rating: "7.8",
      posterUrl: "images/movies/movie-6.svg",
      releaseDate: "2026-07-04",
      status: "coming_soon",
    },
  ];

  for (const m of initialMovies) {
    await pool.query(
      `INSERT INTO movies
        (title, description, duration_minutes, genre, rating, poster_url, release_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        m.title,
        m.description,
        m.durationMinutes,
        m.genre,
        m.rating,
        m.posterUrl,
        m.releaseDate,
        m.status,
      ],
    );
  }
  console.log(`seeded ${initialMovies.length} movies into database`);
}

// 2. Seed screens and seats if empty
const { rows: screenCount } = await pool.query(
  "SELECT count(*)::int AS count FROM screens",
);

if (screenCount[0].count === 0) {
  const screensData = [
    {
      name: "Screen 1 - Grand Dolby",
      rows: ["A", "B", "C", "D", "E"],
      seatsPerRow: 8,
      premiumRows: ["D", "E"],
    },
    {
      name: "Screen 2 - Atmos Lounge",
      rows: ["A", "B", "C", "D"],
      seatsPerRow: 6,
      premiumRows: ["C", "D"],
    },
  ];

  for (const s of screensData) {
    const { rows: inserted } = await pool.query(
      "INSERT INTO screens (name) VALUES ($1) RETURNING id",
      [s.name],
    );
    const screenId = inserted[0].id;
    const premium = new Set(s.premiumRows);

    for (const r of s.rows) {
      for (let n = 1; n <= s.seatsPerRow; n++) {
        const type = premium.has(r) ? "premium" : "standard";
        await pool.query(
          `INSERT INTO seats (screen_id, row_label, seat_number, seat_type)
           VALUES ($1, $2, $3, $4)`,
          [screenId, r, n, type],
        );
      }
    }
  }
  console.log("seeded screens and seats into database");
}

// 3. Seed upcoming showtimes if empty
const { rows: showtimeCount } = await pool.query(
  "SELECT count(*)::int AS count FROM showtimes WHERE starts_at >= now()",
);

if (showtimeCount[0].count === 0) {
  const { rows: nowShowingMovies } = await pool.query(
    "SELECT id, duration_minutes FROM movies WHERE status = 'now_showing'",
  );
  const { rows: allScreens } = await pool.query(
    "SELECT id FROM screens ORDER BY name",
  );

  if (nowShowingMovies.length > 0 && allScreens.length > 0) {
    const now = new Date();
    // Schedule for Today, Tomorrow, and Day after tomorrow
    const offsets = [
      { day: 0, hour: 17, minute: 30 },
      { day: 0, hour: 20, minute: 30 },
      { day: 1, hour: 14, minute: 0 },
      { day: 1, hour: 17, minute: 30 },
      { day: 1, hour: 20, minute: 45 },
      { day: 2, hour: 14, minute: 30 },
      { day: 2, hour: 18, minute: 0 },
      { day: 2, hour: 21, minute: 0 },
    ];

    let scheduled = 0;
    for (let i = 0; i < offsets.length; i++) {
      const movie = nowShowingMovies[i % nowShowingMovies.length];
      const screen = allScreens[i % allScreens.length];
      const { day, hour, minute } = offsets[i];

      const start = new Date(now);
      start.setDate(now.getDate() + day);
      start.setHours(hour, minute, 0, 0);

      // If already past today, advance by 24h
      if (start <= now) {
        start.setDate(start.getDate() + 1);
      }

      const durationMinutes = movie.duration_minutes || 120;
      const end = new Date(start.getTime() + (durationMinutes + 15) * 60_000);

      try {
        await pool.query(
          `INSERT INTO showtimes
            (movie_id, screen_id, starts_at, ends_at, price_standard, price_premium)
           VALUES ($1, $2, $3, $4, 12.50, 18.00)`,
          [movie.id, screen.id, start.toISOString(), end.toISOString()],
        );
        scheduled++;
      } catch (err) {
        // Skip on duplicate/overlap
      }
    }
    console.log(`seeded ${scheduled} upcoming showtimes into database`);
  }
}

await pool.end();
