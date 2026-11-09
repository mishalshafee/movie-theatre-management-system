import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { list, getOne, create, update, remove } from "./movies.controller.js";

export const moviesRouter = Router();

moviesRouter.get("/", list);
moviesRouter.get("/:id", getOne);

moviesRouter.post("/", requireAuth, requireRole("admin"), create);
moviesRouter.patch("/:id", requireAuth, requireRole("admin"), update);
moviesRouter.delete("/:id", requireAuth, requireRole("admin"), remove);
