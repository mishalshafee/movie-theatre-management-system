import { registerSchema } from "./auth.schema.js";
import { registerUser } from "./auth.service.js";

export async function register(req, res) {
  const data = registerSchema.parse(req.body);
  const user = await registerUser(data);
  res.status(201).json({ user });
}
