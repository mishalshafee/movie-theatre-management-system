import {
  idParamSchema,
  listQuerySchema,
  createBookingSchema,
} from "./bookings.schema.js";
import {
  createBooking,
  listMyBookings,
  getBookingFor,
  payBooking,
  cancelBooking,
} from "./bookings.service.js";

export async function create(req, res) {
  const data = createBookingSchema.parse(req.body);
  res.status(201).json({ booking: await createBooking(req.user.id, data) });
}

export async function list(req, res) {
  const query = listQuerySchema.parse(req.query);
  res.json(await listMyBookings(req.user.id, query));
}

export async function getOne(req, res) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ booking: await getBookingFor(id, req.user) });
}

export async function pay(req, res) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ booking: await payBooking(id, req.user.id) });
}

export async function cancel(req, res) {
  const { id } = idParamSchema.parse(req.params);
  res.json({ booking: await cancelBooking(id, req.user) });
}
