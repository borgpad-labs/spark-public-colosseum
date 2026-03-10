-- D1 Database doesn't support JSON, JSONB, nor TIMESTAMP type columns
-- Even though the creation works as expected, the driver returns JSONB and TIMESTAMP as plain string in javascript
-- DROP TABLE user, project, cache_store;

CREATE TABLE user (
    address TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE
);

CREATE TABLE tokens (
    mint TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    imageUrl TEXT,
    dao TEXT,
    dao_treasury TEXT,
    twitter_account TEXT,
    fees_claimed DECIMAL(20,8) DEFAULT 0,
    user_fees_claimed DECIMAL(20,8) DEFAULT 0,
    dbc_pool_address TEXT,
    damm_pool_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications (
    id TEXT NOT NULL PRIMARY KEY,
    project_id TEXT NOT NULL,
    github_username TEXT NOT NULL,
    github_id TEXT NOT NULL,
    deliverable_name TEXT NOT NULL,
    requested_price INTEGER NOT NULL,
    estimated_deadline TEXT NOT NULL,
    feature_description TEXT NOT NULL,
    solana_wallet_address TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    github_score INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE error (
    id TEXT NOT NULL PRIMARY KEY,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    json JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE api_key (
    id TEXT NOT NULL PRIMARY KEY,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    permissions TEXT NOT NULL,
    hash TEXT NOT NULL
);


-- Migration to add github_score column to existing applications table
-- ALTER TABLE applications ADD COLUMN github_score INTEGER;

-- Migration to add twitter_account column to existing tokens table
-- ALTER TABLE tokens ADD COLUMN twitter_account TEXT;

-- Migration to add fees_claimed column to existing tokens table
-- ALTER TABLE tokens ADD COLUMN fees_claimed DECIMAL(20,8) DEFAULT 0;

-- Migration to add dao_treasury column to existing tokens table
-- ALTER TABLE tokens ADD COLUMN dao_treasury TEXT;

-- Migration to add dbc_pool_address column to existing tokens table
-- ALTER TABLE tokens ADD COLUMN dbc_pool_address TEXT;

-- Migration to add damm_pool_address column to existing tokens table
-- ALTER TABLE tokens ADD COLUMN damm_pool_address TEXT;

-- Migration to add user_fees_claimed column to existing tokens table
-- ALTER TABLE tokens ADD COLUMN user_fees_claimed DECIMAL(20,8) DEFAULT 0;

-- Migration to add created_at column to existing tokens table
-- ALTER TABLE tokens ADD COLUMN created_at TIMESTAMP;
-- UPDATE tokens SET created_at = CURRENT_TIMESTAMP WHERE created_at IS NULL;

-- Create twitter_users table for OAuth data
CREATE TABLE twitter_users (
    twitter_id TEXT NOT NULL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    profile_image_url TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    wallet_address TEXT,
    fees_claimed DECIMAL(20,8) DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Migration to add UNIQUE constraint to username column (for existing databases)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_twitter_users_username ON twitter_users(username);

-- Ideas feedback system tables
CREATE TABLE ideas (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    author_username TEXT NOT NULL DEFAULT 'anonymous',
    author_avatar TEXT,
    author_twitter_id TEXT,
    source TEXT NOT NULL DEFAULT 'user',
    tweet_url TEXT,
    tweet_content TEXT,
    estimated_price INTEGER DEFAULT 0,
    raised_amount DECIMAL(20,6) DEFAULT 0,
    generated_image_url TEXT,
    market_analysis TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE idea_votes (
    id TEXT NOT NULL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    voter_twitter_id TEXT,
    voter_username TEXT,
    vote_type TEXT NOT NULL DEFAULT 'up',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    UNIQUE(idea_id, user_id)
);

CREATE TABLE idea_comments (
    id TEXT NOT NULL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    parent_comment_id TEXT,
    content TEXT NOT NULL,
    author_username TEXT NOT NULL DEFAULT 'anonymous',
    author_avatar TEXT,
    author_twitter_id TEXT,
    is_team INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_comment_id) REFERENCES idea_comments(id) ON DELETE CASCADE
);

CREATE TABLE idea_comment_votes (
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

-- Indexes for better query performance
CREATE INDEX idx_ideas_category ON ideas(category);
CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_created_at ON ideas(created_at);
CREATE INDEX idx_ideas_author_username ON ideas(author_username);
CREATE INDEX idx_ideas_slug ON ideas(slug);
CREATE INDEX idx_idea_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX idx_idea_votes_voter ON idea_votes(voter_twitter_id);
CREATE INDEX idx_idea_comments_idea_id ON idea_comments(idea_id);
CREATE INDEX idx_idea_comments_parent ON idea_comments(parent_comment_id);
CREATE INDEX idx_idea_comment_votes_comment_id ON idea_comment_votes(comment_id);
CREATE INDEX idx_idea_comment_votes_voter ON idea_comment_votes(voter_twitter_id);

-- Idea Investments table for funding
CREATE TABLE idea_investments (
    id TEXT NOT NULL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    investor_wallet TEXT NOT NULL,
    amount_usdc DECIMAL(20,6) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    transaction_signature TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
);

CREATE INDEX idx_idea_investments_idea_id ON idea_investments(idea_id);
CREATE INDEX idx_idea_investments_wallet ON idea_investments(investor_wallet);

-- Migration commands for existing databases:
-- ALTER TABLE ideas ADD COLUMN slug TEXT;
-- ALTER TABLE ideas ADD COLUMN author_twitter_id TEXT;
-- ALTER TABLE ideas ADD COLUMN tweet_url TEXT;
-- ALTER TABLE ideas ADD COLUMN tweet_content TEXT;
-- ALTER TABLE ideas ADD COLUMN estimated_price INTEGER DEFAULT 0;
-- ALTER TABLE ideas ADD COLUMN raised_amount DECIMAL(20,6) DEFAULT 0;
-- ALTER TABLE idea_votes ADD COLUMN voter_twitter_id TEXT;
-- ALTER TABLE idea_votes ADD COLUMN voter_username TEXT;
-- ALTER TABLE idea_votes ADD COLUMN vote_type TEXT NOT NULL DEFAULT 'up';
-- ALTER TABLE idea_comments ADD COLUMN parent_comment_id TEXT;
-- ALTER TABLE idea_comments ADD COLUMN author_twitter_id TEXT;
-- CREATE TABLE idea_comment_votes (...)
-- CREATE TABLE idea_investments (...)
-- Note: idea_investments table does NOT have UNIQUE(idea_id, investor_wallet) constraint
-- to allow multiple investments from the same user