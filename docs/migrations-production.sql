-- ============================================
-- Production Migration Script for Ideas System
-- ============================================
-- 
-- IMPORTANT: Run these migrations ONE STEP AT A TIME
-- D1/SQLite will fail if a column already exists
--
-- Execute via:
--   wrangler d1 execute spark-ideas --remote --file=docs/migrations-production.sql
--
-- Or run individual statements:
--   wrangler d1 execute spark-ideas --remote --command="<SQL>"
--
-- Check existing schema first:
--   wrangler d1 execute spark-ideas --remote --command="SELECT sql FROM sqlite_master WHERE type='table' AND name='ideas';"
--
-- ============================================


-- ============================================
-- STEP 1: Add new columns to ideas table
-- ============================================
-- Run each ALTER TABLE separately. Skip if column already exists.

-- 1a. Add slug column
ALTER TABLE ideas ADD COLUMN slug TEXT;

-- 1b. Add author_twitter_id column  
ALTER TABLE ideas ADD COLUMN author_twitter_id TEXT;

-- 1c. Add estimated_price column
ALTER TABLE ideas ADD COLUMN estimated_price INTEGER DEFAULT 0;

-- 1d. Add raised_amount column (for investment tracking)
ALTER TABLE ideas ADD COLUMN raised_amount DECIMAL(20,6) DEFAULT 0;

-- 1e. Add tweet_url column (for Twitter-sourced ideas)
ALTER TABLE ideas ADD COLUMN tweet_url TEXT;

-- 1f. Add tweet_content column (for Twitter-sourced ideas)
ALTER TABLE ideas ADD COLUMN tweet_content TEXT;

-- 1g. Add generated_image_url column (for AI-generated idea images)
ALTER TABLE ideas ADD COLUMN generated_image_url TEXT;

-- 1h. Add generated_image_url column (for AI-generated idea images)
ALTER TABLE ideas ADD COLUMN generated_image_url TEXT;

-- 1i. Add market_analysis column (for AI market opportunity analysis)
ALTER TABLE ideas ADD COLUMN market_analysis TEXT;

-- 1j. Add wallet_address to twitter_users (for linking Twitter accounts to wallets)
ALTER TABLE twitter_users ADD COLUMN wallet_address TEXT;

-- 1k. Generate slugs for existing ideas (run after adding slug column)
UPDATE ideas 
SET slug = LOWER(REPLACE(REPLACE(REPLACE(title, ' ', '-'), '''', ''), '"', '')) || '-' || SUBSTR(id, 1, 8)
WHERE slug IS NULL;


-- ============================================
-- STEP 2: Update idea_votes table
-- ============================================

-- 2a. Add voter_twitter_id column
ALTER TABLE idea_votes ADD COLUMN voter_twitter_id TEXT;

-- 2b. Add voter_username column
ALTER TABLE idea_votes ADD COLUMN voter_username TEXT;

-- 2c. Add vote_type column (up/down)
ALTER TABLE idea_votes ADD COLUMN vote_type TEXT NOT NULL DEFAULT 'up';


-- ============================================
-- STEP 3: Update idea_comments table
-- ============================================

-- 3a. Add parent_comment_id column (for nested replies)
ALTER TABLE idea_comments ADD COLUMN parent_comment_id TEXT;

-- 3b. Add author_twitter_id column
ALTER TABLE idea_comments ADD COLUMN author_twitter_id TEXT;


-- ============================================
-- STEP 4: Create idea_comment_votes table
-- ============================================

CREATE TABLE IF NOT EXISTS idea_comment_votes (
    id TEXT NOT NULL PRIMARY KEY,
    comment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    voter_twitter_id TEXT,
    voter_username TEXT,
    vote_type TEXT NOT NULL DEFAULT 'up',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (comment_id) REFERENCES idea_comments(id) ON DELETE CASCADE,
    UNIQUE(comment_id, user_id)
);


-- ============================================
-- STEP 5: Create idea_investments table
-- ============================================

CREATE TABLE IF NOT EXISTS idea_investments (
    id TEXT NOT NULL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    investor_wallet TEXT NOT NULL,
    amount_usdc DECIMAL(20,6) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    transaction_signature TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
);


-- ============================================
-- STEP 6: Create indexes for performance
-- ============================================

-- Ideas indexes
CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at);
CREATE INDEX IF NOT EXISTS idx_ideas_author_username ON ideas(author_username);
CREATE INDEX IF NOT EXISTS idx_ideas_slug ON ideas(slug);

CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_votes_voter ON idea_votes(voter_twitter_id);

CREATE INDEX IF NOT EXISTS idx_idea_comments_idea_id ON idea_comments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_parent ON idea_comments(parent_comment_id);

CREATE INDEX IF NOT EXISTS idx_idea_comment_votes_comment_id ON idea_comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_idea_comment_votes_voter ON idea_comment_votes(voter_twitter_id);

CREATE INDEX IF NOT EXISTS idx_idea_investments_idea_id ON idea_investments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_investments_wallet ON idea_investments(investor_wallet);


-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- Check ideas table structure
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='ideas';

-- Check idea_votes table structure
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='idea_votes';

-- Check idea_comments table structure
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='idea_comments';

-- Check idea_comment_votes exists
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='idea_comment_votes';

-- Check idea_investments exists
-- SELECT sql FROM sqlite_master WHERE type='table' AND name='idea_investments';

-- Verify no NULL slugs
-- SELECT COUNT(*) FROM ideas WHERE slug IS NULL;

-- Count total records
-- SELECT 'ideas' as tbl, COUNT(*) as cnt FROM ideas
-- UNION SELECT 'idea_votes', COUNT(*) FROM idea_votes
-- UNION SELECT 'idea_comments', COUNT(*) FROM idea_comments
-- UNION SELECT 'idea_comment_votes', COUNT(*) FROM idea_comment_votes
-- UNION SELECT 'idea_investments', COUNT(*) FROM idea_investments;


-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- Note: SQLite doesn't support DROP COLUMN easily
-- To rollback, you'd need to:
-- 1. Create new table without the column
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table

-- Drop new tables (safe)
-- DROP TABLE IF EXISTS idea_investments;
-- DROP TABLE IF EXISTS idea_comment_votes;
