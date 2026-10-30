import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(8).max(128),
  fullName: z.string().trim().min(1).max(100),
});
