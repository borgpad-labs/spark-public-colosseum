-- Create agent_projects table (adapted from ideas)
CREATE TABLE IF NOT EXISTS agent_projects (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL, 
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    team_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',

    human_votes INTEGER DEFAULT 0,
    agent_votes INTEGER DEFAULT 0,
    total_votes INTEGER DEFAULT 0,

    colosseum_url TEXT NOT NULL,
    colosseum_project_id TEXT NOT NULL UNIQUE,

    estimated_price INTEGER DEFAULT 0,
    raised_amount DECIMAL(20,6) DEFAULT 0,
    treasury_wallet TEXT,
    generated_image_url TEXT,
    market_analysis TEXT,

    categories TEXT,
    repository_url TEXT,
    demo_url TEXT,
    team_members TEXT,

    scraped_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS agent_project_votes (
    id TEXT NOT NULL PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    voter_twitter_id TEXT,
    voter_username TEXT,
    vote_type TEXT NOT NULL DEFAULT 'up',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, user_id)
);


CREATE TABLE IF NOT EXISTS agent_project_comments (
    id TEXT NOT NULL PRIMARY KEY,
    project_id TEXT NOT NULL,
    parent_comment_id TEXT,
    content TEXT NOT NULL,
    author_username TEXT NOT NULL DEFAULT 'anonymous',
    author_avatar TEXT,
    author_twitter_id TEXT,
    is_team INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS agent_project_comment_votes (
    id TEXT NOT NULL PRIMARY KEY,
    comment_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    voter_twitter_id TEXT,
    voter_username TEXT,
    vote_type TEXT NOT NULL DEFAULT 'up',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(comment_id, user_id)
);


CREATE TABLE IF NOT EXISTS agent_project_investments (
    id TEXT NOT NULL PRIMARY KEY,
    project_id TEXT NOT NULL,
    investor_wallet TEXT NOT NULL,
    amount_usdc DECIMAL(20,6) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    transaction_signature TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agent_projects_created_at ON agent_projects(created_at);
CREATE INDEX IF NOT EXISTS idx_agent_projects_slug ON agent_projects(slug);
CREATE INDEX IF NOT EXISTS idx_agent_projects_colosseum_id ON agent_projects(colosseum_project_id);
CREATE INDEX IF NOT EXISTS idx_agent_project_votes_project_id ON agent_project_votes(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_project_comments_project_id ON agent_project_comments(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_project_comment_votes_comment_id ON agent_project_comment_votes(comment_id);
CREATE INDEX IF NOT EXISTS idx_agent_project_investments_project_id ON agent_project_investments(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_project_investments_wallet ON agent_project_investments(investor_wallet);
