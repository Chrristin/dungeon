-- Ratings (theme 1.10.0): readers' star ratings, one per visitor or member per post. Run once in the D1 console.
CREATE TABLE IF NOT EXISTS ratings (
  post       TEXT    NOT NULL,              -- post slug
  voter_hash TEXT    NOT NULL,              -- 'v:' + hashed rater id kept by the visitor's browser, or 'm:' + hashed member email
  stars      INTEGER NOT NULL,              -- 1 to 10: halves of 5 stars
  role       TEXT,                          -- 'member' or 'author' for signed-in ratings
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  updated_at TEXT,
  PRIMARY KEY (post, voter_hash)
);
