import {
  idParamSchema,
  listQuerySchema,
  createShowtimeSchema,
  updateShowtimeSchema,
} from "./showtimes.schema.js";
import {
  listShowtimes,
  getShowtime,
  createShowtime,
  updateShowtime,
  deleteShowtime,
} from "./showtimes.service.js";

export async function list(req, res) {
  const query = listQuerySchema.parse(req.query);
  res.json(await listShowtimes(query));
}

export async function getOne(req, res) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ showtime: await getShowtime(id) });
}

export async function create(req, res) {
  const data = createShowtimeSchema.parse(req.body);
  res.status(201).json({ showtime: await createShowtime(data) });
}

export async function update(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const data = updateShowtimeSchema.parse(req.body);
  res.json({ showtime: await updateShowtime(id, data) });
}

export async function remove(req, res) {
  const { id } = idParamSchema.parse(req.params);
  await deleteShowtime(id);
  res.status(204).end();
}
