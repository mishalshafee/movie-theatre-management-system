import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });

const price = z.number().min(0).max(100000);
const isoDateTime = z.string().datetime({ offset: true });

export const listQuerySchema = z.object({
  movieId: z.string().uuid().optional(),
  screenId: z.string().uuid().optional(),
  from: isoDateTime.optional(),
  to: isoDateTime.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createShowtimeSchema = z.object({
  movieId: z.string().uuid(),
  screenId: z.string().uuid(),
  startsAt: isoDateTime.refine(
    (v) => new Date(v) > new Date(),
    "Start time must be in the future",
  ),
  priceStandard: price,
  pricePremium: price,
});

export const updateShowtimeSchema = z
  .object({ priceStandard: price.optional(), pricePremium: price.optional() })
  .refine((o) => Object.keys(o).length > 0, {
    message: "Send at least one price to update",
  });
