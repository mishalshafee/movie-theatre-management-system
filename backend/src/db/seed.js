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

const initialMovies = [
  {
    title: "Avatar: The Way of Water",
    description:
      "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Na'vi race to protect their home.",
    durationMinutes: 192,
    genre: "Sci-Fi / Adventure",
    rating: "8.8",
    posterUrl: "images/movies/avatar.jpg",
    releaseDate: "2026-03-15",
    status: "now_showing",
  },
  {
    title: "Dune: Part Three",
    description:
      "The epic conclusion of Paul Atreides' mythic journey as he unites with Chani and the Fremen while seeking revenge against the conspirators who destroyed his family.",
    durationMinutes: 165,
    genre: "Sci-Fi / Action",
    rating: "9.0",
    posterUrl: "images/movies/dune.jpg",
    releaseDate: "2026-04-10",
    status: "now_showing",
  },
  {
    title: "Redemption",
    description:
      "Every ending has a beginning. When a seasoned operative is pulled back into the shadows of the city, truth becomes the only weapon capable of breaking the cycle of betrayal.",
    durationMinutes: 135,
    genre: "Action / Thriller",
    rating: "8.4",
    posterUrl: "images/movies/redemption.jpg",
    releaseDate: "2026-04-22",
    status: "now_showing",
  },
  {
    title: "Frozen",
    description:
      "When the newly-crowned Queen Elsa accidentally uses her power to curse her home in infinite winter, her sister Anna teams up with a mountain man, his playful reindeer, and a snowman to change the weather condition.",
    durationMinutes: 102,
    genre: "Animation / Family",
    rating: "8.5",
    posterUrl: "images/movies/frozen.jpg",
    releaseDate: "2026-06-01",
    status: "coming_soon",
  },
];

if (existingMovies[0].count === 0) {
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
} else {
  // Update legacy seed titles/posters if they exist
  await pool.query(
    `UPDATE movies SET title = $1, description = $2, duration_minutes = $3, genre = $4, rating = $5, poster_url = $6, status = $7
     WHERE title = 'Stellar Horizon' OR poster_url LIKE '%movie-1%'`,
    [initialMovies[0].title, initialMovies[0].description, initialMovies[0].durationMinutes, initialMovies[0].genre, initialMovies[0].rating, initialMovies[0].posterUrl, initialMovies[0].status]
  );
  await pool.query(
    `UPDATE movies SET title = $1, description = $2, duration_minutes = $3, genre = $4, rating = $5, poster_url = $6, status = $7
     WHERE title = 'Midnight Reverie' OR poster_url LIKE '%movie-2%'`,
    [initialMovies[1].title, initialMovies[1].description, initialMovies[1].durationMinutes, initialMovies[1].genre, initialMovies[1].rating, initialMovies[1].posterUrl, initialMovies[1].status]
  );
  await pool.query(
    `UPDATE movies SET title = $1, description = $2, duration_minutes = $3, genre = $4, rating = $5, poster_url = $6, status = $7
     WHERE title = 'Crimson Vale' OR poster_url LIKE '%movie-3%'`,
    [initialMovies[2].title, initialMovies[2].description, initialMovies[2].durationMinutes, initialMovies[2].genre, initialMovies[2].rating, initialMovies[2].posterUrl, initialMovies[2].status]
  );
  await pool.query(
    `UPDATE movies SET title = $1, description = $2, duration_minutes = $3, genre = $4, rating = $5, poster_url = $6, status = $7
     WHERE title = 'Echoes of Tomorrow' OR poster_url LIKE '%movie-4%'`,
    [initialMovies[3].title, initialMovies[3].description, initialMovies[3].durationMinutes, initialMovies[3].genre, initialMovies[3].rating, initialMovies[3].posterUrl, initialMovies[3].status]
  );
  console.log("updated existing movie records to current posters & titles");
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
