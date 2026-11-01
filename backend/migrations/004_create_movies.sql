CREATE TABLE movies (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    genre            TEXT,
    rating           TEXT,
    poster_url       TEXT,
    release_date     DATE,
    status           TEXT NOT NULL DEFAULT 'coming_soon'
                    CHECK (status IN ('now_showing', 'coming_soon', 'archived')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX movies_status_idx ON movies (status);