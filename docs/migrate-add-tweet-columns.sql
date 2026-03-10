-- Quick migration to add tweet_url and tweet_content columns
-- Run this in production:
-- wrangler d1 execute <DATABASE_NAME> --remote --file=docs/migrate-add-tweet-columns.sql

-- Add tweet_url column to ideas table
ALTER TABLE ideas ADD COLUMN tweet_url TEXT;

-- Add tweet_content column to ideas table
ALTER TABLE ideas ADD COLUMN tweet_content TEXT;
