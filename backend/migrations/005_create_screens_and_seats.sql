CREATE TABLE screens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX screens_name_unique ON screens (lower(name));

CREATE TABLE seats (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    screen_id   UUID NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
    row_label   TEXT NOT NULL,
    seat_number INTEGER NOT NULL CHECK (seat_number > 0),
    seat_type   TEXT NOT NULL DEFAULT 'standard'
                CHECK (seat_type IN ('standard', 'premium', 'accessible')),
    UNIQUE (screen_id, row_label, seat_number)
);