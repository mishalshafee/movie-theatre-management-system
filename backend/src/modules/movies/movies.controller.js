import {
  idParamSchema,
  listQuerySchema,
  createMovieSchema,
  updateMovieSchema,
} from "./movies.schema.js";
import {
  listMovies,
  getMovie,
  createMovie,
  updateMovie,
  deleteMovie,
} from "./movies.service.js";

export async function list(req, res) {
  const query = listQuerySchema.parse(req.query);
  res.json(await listMovies(query));
}

export async function getOne(req, res) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ movie: await getMovie(id) });
}

export async function create(req, res) {
  const data = createMovieSchema.parse(req.body);
  res.status(201).json({ movie: await createMovie(data) });
}

export async function update(req, res) {
  const { id } = idParamSchema.parse(req.params);
  const data = updateMovieSchema.parse(req.body);
  res.json({ movie: await updateMovie(id, data) });
}

export async function remove(req, res) {
  const { id } = idParamSchema.parse(req.params);
  await deleteMovie(id);
  res.status(204).end();
}
