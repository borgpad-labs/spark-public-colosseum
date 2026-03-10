-- Migration to add wallet_address column to twitter_users table
-- This allows linking Twitter accounts to Solana wallets for investment tracking

ALTER TABLE twitter_users ADD COLUMN wallet_address TEXT;

CREATE INDEX IF NOT EXISTS idx_twitter_users_wallet ON twitter_users(wallet_address);
