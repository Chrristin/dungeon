-- For stamps databases created before 1.2.3: lets readers remove their own name within a day.
ALTER TABLE stamps ADD COLUMN named_at TEXT;
