-- Quick migration for local D1 database
-- Run these commands in your terminal:

-- 1. Add raised_amount column to ideas table
-- wrangler d1 execute DB --local --command="ALTER TABLE ideas ADD COLUMN raised_amount DECIMAL(20,6) DEFAULT 0;"

-- 2. Add tweet_url and tweet_content columns to ideas table
-- wrangler d1 execute DB --local --command="ALTER TABLE ideas ADD COLUMN tweet_url TEXT;"
-- wrangler d1 execute DB --local --command="ALTER TABLE ideas ADD COLUMN tweet_content TEXT;"

-- 3. Add transaction_signature to idea_investments (if table exists)
-- wrangler d1 execute DB --local --command="ALTER TABLE idea_investments ADD COLUMN transaction_signature TEXT;"

-- 4. Remove UNIQUE constraint to allow multiple investments (if table exists with constraint)
-- Run: wrangler d1 execute DB --local --file=../docs/migrate-remove-unique-constraint.sql

-- Or create the investments table if it doesn't exist:
-- wrangler d1 execute DB --local --file=../docs/migrations-production.sql

ALTER TABLE ideas ADD COLUMN raised_amount DECIMAL(20,6) DEFAULT 0;
ALTER TABLE ideas ADD COLUMN tweet_url TEXT;
ALTER TABLE ideas ADD COLUMN tweet_content TEXT;
ALTER TABLE ideas ADD COLUMN generated_image_url TEXT;
ALTER TABLE ideas ADD COLUMN market_analysis TEXT;
ALTER TABLE idea_investments ADD COLUMN transaction_signature TEXT;
