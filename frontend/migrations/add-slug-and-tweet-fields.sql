-- Migration to add slug, tweet_url, and tweet_content fields to existing ideas table
-- Run this if the ideas table already exists

ALTER TABLE ideas ADD COLUMN slug TEXT;
ALTER TABLE ideas ADD COLUMN tweet_url TEXT;
ALTER TABLE ideas ADD COLUMN tweet_content TEXT;


CREATE UNIQUE INDEX IF NOT EXISTS idx_ideas_slug ON ideas(slug);

-- Generate slugs for existing ideas (if any)
-- UPDATE ideas SET slug = LOWER(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '''', ''), '"', '')) WHERE slug IS NULL;
