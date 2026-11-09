import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AppError(
      401,
      "Missing or malformed Authorization header",
      "UNAUTHORIZED",
    );
  }

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ["HS256"],
    });
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new AppError(401, "Access token expired", "TOKEN_EXPIRED");
    }
    throw new AppError(401, "Invalid access token", "UNAUTHORIZED");
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      throw new AppError(
        403,
        "You do not have permission to do this",
        "FORBIDDEN",
      );
    }
    next();
  };
}
