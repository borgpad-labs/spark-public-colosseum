-- Migration to remove UNIQUE constraint from idea_investments
-- This allows users to invest multiple times in the same idea
-- Run this if you already have the idea_investments table with the UNIQUE constraint

-- Note: SQLite doesn't support DROP CONSTRAINT directly
-- You'll need to recreate the table without the UNIQUE constraint

-- Step 1: Create new table without UNIQUE constraint
CREATE TABLE idea_investments_new (
    id TEXT NOT NULL PRIMARY KEY,
    idea_id TEXT NOT NULL,
    investor_wallet TEXT NOT NULL,
    amount_usdc DECIMAL(20,6) NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    transaction_signature TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (idea_id) REFERENCES ideas(id) ON DELETE CASCADE
);

-- Step 2: Copy data from old table
-- Handle case where transaction_signature might not exist in old table
-- and ensure created_at is never NULL
INSERT INTO idea_investments_new (id, idea_id, investor_wallet, amount_usdc, status, transaction_signature, created_at)
SELECT 
    id, 
    idea_id, 
    investor_wallet, 
    amount_usdc, 
    COALESCE(status, 'active') as status,
    NULL as transaction_signature,  -- Will be added later if needed
    COALESCE(created_at, CURRENT_TIMESTAMP) as created_at
FROM idea_investments;

-- Step 3: Drop old table
DROP TABLE idea_investments;

-- Step 4: Rename new table
ALTER TABLE idea_investments_new RENAME TO idea_investments;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS idx_idea_investments_idea_id ON idea_investments(idea_id);
CREATE INDEX IF NOT EXISTS idx_idea_investments_wallet ON idea_investments(investor_wallet);
