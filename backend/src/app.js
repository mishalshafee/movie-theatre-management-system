import { authRouter } from "./modules/auth/auth.routes.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { moviesRouter } from "./modules/movies/movies.routes.js";
import { screensRouter } from "./modules/screens/screens.routes.js";

import express from "express";
import helmet from "helmet";
import cors from "cors";
import { env } from "./config/env.js";
import { pool } from "./db/pool.js";

import cookieParser from "cookie-parser";

export const app = express();

app.use(cookieParser());

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json());

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

app.use(notFound);
app.use(errorHandler);
