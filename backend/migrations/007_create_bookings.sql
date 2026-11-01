CREATE TABLE bookings (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code         TEXT NOT NULL UNIQUE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    showtime_id  UUID NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    status       TEXT NOT NULL DEFAULT 'held'
                CHECK (status IN ('held', 'confirmed', 'used', 'cancelled', 'expired')),
    total        NUMERIC(10,2) NOT NULL CHECK (total >= 0),
    expires_at   TIMESTAMPTZ NOT NULL,
    paid_at      TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX bookings_user_idx ON bookings (user_id, created_at DESC);
CREATE INDEX bookings_showtime_idx ON bookings (showtime_id);

CREATE TABLE booking_seats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    showtime_id UUID NOT NULL REFERENCES showtimes(id) ON DELETE RESTRICT,
    seat_id     UUID NOT NULL REFERENCES seats(id) ON DELETE RESTRICT,
    price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    active      BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX booking_seats_active_unique ON booking_seats (showtime_id, seat_id) WHERE active;
CREATE INDEX booking_seats_booking_idx ON booking_seats (booking_id);