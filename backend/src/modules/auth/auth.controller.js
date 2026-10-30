import { registerSchema, loginSchema } from "./auth.schema.js";
import { registerUser, loginUser } from "./auth.service.js";
import { env } from "../../config/env.js";

export const REFRESH_COOKIE = "refresh_token";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
};

export async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const user = await registerUser(data);
  res.status(201).json({ user });
}

export async function login(req, res) {
  const data = loginSchema.parse(req.body);
  const { user, accessToken, refreshToken } = await loginUser(data);
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
  res.json({ user, accessToken });
}
