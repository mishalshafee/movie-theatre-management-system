import { registerSchema, loginSchema } from "./auth.schema.js";
import {
  registerUser,
  loginUser,
  getUserById,
  refreshSession,
  logoutSession,
} from "./auth.service.js";
import { env } from "../../config/env.js";
import { AppError } from "../../utils/errors.js";

export const REFRESH_COOKIE = "refresh_token";

export const refreshCookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/api/auth",
  maxAge: env.REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
};

const { maxAge, ...clearCookieOptions } = refreshCookieOptions;

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

export async function me(req, res) {
  const user = await getUserById(req.user.id);
  if (!user) throw new AppError(401, "User no longer exists", "UNAUTHORIZED");
  res.json({ user });
}

export async function refresh(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw new AppError(401, "No refresh token", "UNAUTHORIZED");

  try {
    const { user, accessToken, refreshToken } = await refreshSession(token);
    res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
    res.json({ user, accessToken });
  } catch (err) {
    if (err instanceof AppError)
      res.clearCookie(REFRESH_COOKIE, clearCookieOptions);
    throw err;
  }
}

export async function logout(req, res) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) await logoutSession(token);
  res.clearCookie(REFRESH_COOKIE, clearCookieOptions);
  res.status(204).end();
}
