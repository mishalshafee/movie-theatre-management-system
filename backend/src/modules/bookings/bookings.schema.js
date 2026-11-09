import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });

export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createBookingSchema = z.object({
  showtimeId: z.string().uuid(),
  seatIds: z
    .array(z.string().uuid())
    .min(1)
    .max(8)
    .refine(
      (a) => new Set(a.map((s) => s.toLowerCase())).size === a.length,
      "Seats must be unique",
    ),
});
