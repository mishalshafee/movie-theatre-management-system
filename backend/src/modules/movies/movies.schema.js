import { z } from "zod";

const statusEnum = z.enum(["now_showing", "coming_soon", "archived"]);

export const idParamSchema = z.object({ id: z.string().uuid() });

export const listQuerySchema = z.object({
  status: statusEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const fields = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000),
  durationMinutes: z.number().int().min(1).max(600),
  genre: z.string().trim().max(100).nullable(),
  rating: z.string().trim().max(20).nullable(),
  posterUrl: z.string().trim().max(2048).nullable(),
  releaseDate: z.string().date().nullable(),
  status: statusEnum,
});

export const createMovieSchema = fields.partial({
  description: true,
  genre: true,
  rating: true,
  posterUrl: true,
  releaseDate: true,
  status: true,
});

export const updateMovieSchema = fields
  .partial()
  .refine((o) => Object.keys(o).length > 0, {
    message: "Send at least one field to update",
  });
