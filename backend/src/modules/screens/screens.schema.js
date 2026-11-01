import { z } from "zod";

export const idParamSchema = z.object({ id: z.string().uuid() });

const name = z.string().trim().min(1).max(50);
const rowLabel = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]$/, "Use a single letter A-Z");

export const createScreenSchema = z
  .object({
    name,
    rows: z.array(rowLabel).min(1).max(26),
    seatsPerRow: z.number().int().min(1).max(40),
    premiumRows: z.array(rowLabel).default([]),
  })
  .superRefine((v, ctx) => {
    if (new Set(v.rows).size !== v.rows.length) {
      ctx.addIssue({
        code: "custom",
        path: ["rows"],
        message: "Rows must be unique",
      });
    }
    if (!v.premiumRows.every((r) => v.rows.includes(r))) {
      ctx.addIssue({
        code: "custom",
        path: ["premiumRows"],
        message: "Premium rows must be among rows",
      });
    }
  });

export const updateScreenSchema = z.object({ name });
