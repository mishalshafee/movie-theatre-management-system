CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE showtimes (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movie_id       UUID NOT NULL REFERENCES movies(id) ON DELETE RESTRICT,
    screen_id      UUID NOT NULL REFERENCES screens(id) ON DELETE RESTRICT,
    starts_at      TIMESTAMPTZ NOT NULL,
    ends_at        TIMESTAMPTZ NOT NULL,
    price_standard NUMERIC(10,2) NOT NULL CHECK (price_standard >= 0),
    price_premium  NUMERIC(10,2) NOT NULL CHECK (price_premium >= 0),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (ends_at > starts_at),
    EXCLUDE USING gist (screen_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
);

CREATE INDEX showtimes_movie_starts_idx ON showtimes (movie_id, starts_at);
CREATE INDEX showtimes_starts_idx ON showtimes (starts_at);