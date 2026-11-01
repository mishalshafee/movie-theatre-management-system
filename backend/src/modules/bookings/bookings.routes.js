import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { create, list, getOne, pay, cancel } from "./bookings.controller.js";

export const bookingsRouter = Router();

bookingsRouter.use(requireAuth);

bookingsRouter.post("/", create);
bookingsRouter.get("/", list);
bookingsRouter.get("/:id", getOne);
bookingsRouter.post("/:id/pay", pay);
bookingsRouter.post("/:id/cancel", cancel);
