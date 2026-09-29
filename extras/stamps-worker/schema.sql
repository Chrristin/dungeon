-- Stamps: one row per "I was here". Run once in the D1 console.
CREATE TABLE IF NOT EXISTS stamps (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post       TEXT    NOT NULL,             -- post or Now-month slug
  name       TEXT,                         -- optional, added after stamping
  token_hash TEXT    NOT NULL,             -- lets the stamper (only) add their name
  hidden     INTEGER NOT NULL DEFAULT 0,   -- set by you to remove a name or stamp
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);
CREATE INDEX IF NOT EXISTS stamps_by_post ON stamps (post, id DESC);
