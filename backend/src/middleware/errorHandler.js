import { ZodError } from "zod";
import { AppError } from "../utils/errors.js";

export function notFound(req, res) {
  res
    .status(404)
    .json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

export function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request body",
        details: err.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
    });
  }
  if (err instanceof AppError) {
    return res
      .status(err.status)
      .json({ error: { code: err.code, message: err.message } });
  }
  console.error(err);
  res
    .status(500)
    .json({ error: { code: "INTERNAL", message: "Something went wrong" } });
}
