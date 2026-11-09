import { authRouter } from "./modules/auth/auth.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { moviesRouter } from "./modules/movies/movies.routes.js";
import { screensRouter } from "./modules/screens/screens.routes.js";
import { showtimesRouter } from "./modules/showtimes/showtimes.routes.js";
import { bookingsRouter } from "./modules/bookings/bookings.routes.js";

import express from "express";
import helmet from "helmet";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";

import cookieParser from "cookie-parser";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendPath = path.join(__dirname, "../../frontend");

export const app = express();

app.use(cookieParser());

// Configure Helmet to allow cross-origin assets, Google Fonts, and inline scripts
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  }),
);

app.use(express.json());

// Serve frontend static files
app.use(express.static(frontendPath));

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "ok" });
  } catch {
    res.status(503).json({ status: "error", db: "down" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/movies", moviesRouter);
app.use("/api/screens", screensRouter);
app.use("/api/showtimes", showtimesRouter);
app.use("/api/bookings", bookingsRouter);

// Fallback for html pages (for friendly URLs)
app.get("/login", (req, res) => {
  res.sendFile(path.join(frontendPath, "login.html"));
});
app.get("/register", (req, res) => {
  res.sendFile(path.join(frontendPath, "register.html"));
});
app.get("/monitor", (req, res) => {
  res.sendFile(path.join(frontendPath, "backendshow.html"));
});

app.use(notFound);
app.use(errorHandler);
