import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import {
  list,
  getOne,
  create,
  update,
  remove,
} from "./showtimes.controller.js";

export const showtimesRouter = Router();

showtimesRouter.get("/", list);
showtimesRouter.get("/:id", getOne);

showtimesRouter.post("/", requireAuth, requireRole("admin"), create);
showtimesRouter.patch("/:id", requireAuth, requireRole("admin"), update);
showtimesRouter.delete("/:id", requireAuth, requireRole("admin"), remove);
