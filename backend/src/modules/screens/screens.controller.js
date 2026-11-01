import {
  idParamSchema,
  createScreenSchema,
  updateScreenSchema,
} from "./screens.schema.js";
import {
  listScreens,
  getScreen,
  createScreen,
  renameScreen,
  deleteScreen,
} from "./screens.service.js";

export async function list(req, res) {
  res.json(await listScreens());
}

export async function getOne(req, res) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ screen: await getScreen(id) });
}

export async function create(req, res) {
  const data = createScreenSchema.parse(req.body);
  res.status(201).json({ screen: await createScreen(data) });
}

export async function rename(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const data = updateScreenSchema.parse(req.body);
  res.json({ screen: await renameScreen(id, data) });
}

export async function remove(req, res) {
  const { id } = idParamSchema.parse(req.params);
  await deleteScreen(id);
  res.status(204).end();
}
