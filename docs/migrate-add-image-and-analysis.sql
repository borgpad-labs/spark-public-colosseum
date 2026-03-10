-- Migration to add generated_image_url and market_analysis columns to ideas table
-- Also adds wallet_address to twitter_users for investment tracking
-- Date: 2025-01-XX

-- Add generated_image_url column to ideas
ALTER TABLE ideas ADD COLUMN generated_image_url TEXT;

-- Add market_analysis column to ideas
ALTER TABLE ideas ADD COLUMN market_analysis TEXT;

-- Add wallet_address column to twitter_users (for linking Twitter accounts to Solana wallets)
ALTER TABLE twitter_users ADD COLUMN wallet_address TEXT;

-- Create index for wallet lookups
CREATE INDEX IF NOT EXISTS idx_twitter_users_wallet ON twitter_users(wallet_address);
