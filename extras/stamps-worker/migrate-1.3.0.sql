-- Stickies: short notes readers leave under posts, pinned once approved. Run once in the D1 console.
CREATE TABLE IF NOT EXISTS stickies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post        TEXT    NOT NULL,                 -- post slug
  body        TEXT    NOT NULL,                 -- up to 200 characters, shown as plain text
  name        TEXT,                             -- optional
  token_hash  TEXT    NOT NULL,                 -- lets the writer (only) take it back
  status      TEXT    NOT NULL DEFAULT 'pending', -- pending, approved, deleted (by you), removed (by the writer)
  member_hash TEXT,                             -- for the members layer, later
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  decided_at  TEXT
);
CREATE INDEX IF NOT EXISTS stickies_by_post ON stickies (post, status, id DESC);
