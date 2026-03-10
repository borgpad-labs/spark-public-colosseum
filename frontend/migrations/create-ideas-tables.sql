-- Create ideas table
CREATE TABLE IF NOT EXISTS ideas (
    id TEXT NOT NULL PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    author_username TEXT NOT NULL DEFAULT 'anonymous',
    author_avatar TEXT,
    source TEXT NOT NULL DEFAULT 'user',
    tweet_url TEXT,
    tweet_content TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS idea_votes (
    id TEXT NOT NULL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(idea_id, user_id)
);


CREATE TABLE IF NOT EXISTS idea_comments (
    id TEXT NOT NULL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    content TEXT NOT NULL,
    author_username TEXT NOT NULL DEFAULT 'anonymous',
    author_avatar TEXT,
    is_team INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);


CREATE INDEX IF NOT EXISTS idx_ideas_category ON ideas(category);
CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at);
CREATE INDEX IF NOT EXISTS idx_ideas_slug ON ideas(slug);
CREATE INDEX IF NOT EXISTS idx_idea_votes_idea_id ON idea_votes(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_comments_idea_id ON idea_comments(idea_id);
