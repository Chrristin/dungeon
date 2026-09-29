-- For stickies databases created before 1.3.8: marks stickies by signed-in members and the author.
ALTER TABLE stickies ADD COLUMN role TEXT;
