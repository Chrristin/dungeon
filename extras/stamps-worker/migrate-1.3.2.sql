-- For stickies databases created before 1.3.2: remembers the colour each sticky was written on.
ALTER TABLE stickies ADD COLUMN colour INTEGER;
