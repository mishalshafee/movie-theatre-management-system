import { Router } from "express";
import { requireAuth, requireRole } from "../../middleware/auth.js";
import { list, getOne, create, rename, remove } from "./screens.controller.js";

export const screensRouter = Router();

screensRouter.get("/", list);
screensRouter.get("/:id", getOne);

screensRouter.post("/", requireAuth, requireRole("admin"), create);
screensRouter.patch("/:id", requireAuth, requireRole("admin"), rename);
screensRouter.delete("/:id", requireAuth, requireRole("admin"), remove);
