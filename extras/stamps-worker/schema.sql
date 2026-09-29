-- Stamps: one row per "I was here". Run once in the D1 console.
CREATE TABLE IF NOT EXISTS stamps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post       TEXT    NOT NULL,             -- post or Now-month slug
  name       TEXT,                         -- optional, added after stamping
  token_hash TEXT    NOT NULL,             -- lets the stamper (only) add their name
  hidden     INTEGER NOT NULL DEFAULT 0,   -- set by you to remove a name or stamp
  named_at   TEXT,                         -- when the name was added (it can be removed within a day)
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS stamps_by_post ON stamps (post, id DESC);
-- Stickies: short notes readers leave under posts, pinned once approved. Run once in the D1 console.
CREATE TABLE IF NOT EXISTS stickies (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  post        TEXT    NOT NULL,                 -- post slug
  body        TEXT    NOT NULL,                 -- up to 200 characters, shown as plain text
  name        TEXT,                             -- optional
  token_hash  TEXT    NOT NULL,                 -- lets the writer (only) take it back
  status      TEXT    NOT NULL DEFAULT 'pending', -- pending, approved, deleted (by you), removed (by the writer)
  member_hash TEXT,                             -- for the members layer, later
  colour      INTEGER,                          -- 0 to 5: the paper it was written on
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  decided_at  TEXT
);
CREATE INDEX IF NOT EXISTS stickies_by_post ON stickies (post, status, id DESC);
