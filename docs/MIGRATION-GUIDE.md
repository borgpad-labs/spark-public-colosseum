# Production Migration Guide

This guide outlines all the database migrations needed to deploy the Ideas system features to production.

## Prerequisites

- Access to your Cloudflare D1 database
- `wrangler` CLI installed and configured
- Database backup (recommended before running migrations)

## Migration Steps

### 1. Backup Your Database

Before running any migrations, create a backup:

```bash
wrangler d1 export <DATABASE_NAME> --output=backup-$(date +%Y%m%d).sql
```

### 2. Run the Migration Script

Execute the migration script:

```bash
wrangler d1 execute <DATABASE_NAME> --file=docs/migrations-production.sql
```

Or run migrations interactively:

```bash
wrangler d1 execute <DATABASE_NAME> --remote
# Then paste the SQL commands from migrations-production.sql
```

### 3. Verify Migrations

After running migrations, verify the changes:

```sql
-- Check ideas table has new columns
PRAGMA table_info(ideas);

-- Check idea_votes table has new columns
PRAGMA table_info(idea_votes);

-- Check idea_comments table has new columns
PRAGMA table_info(idea_comments);

-- Verify idea_comment_votes table exists
SELECT name FROM sqlite_master WHERE type='table' AND name='idea_comment_votes';

-- Check indexes
SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';
```

## What Gets Migrated

### Ideas Table
- ✅ `slug` column (unique identifier for URLs)
- ✅ `author_twitter_id` column (Twitter/X user ID)
- ✅ `estimated_price` column (estimated cost in dollars)

### Idea Votes Table
- ✅ `voter_twitter_id` column (Twitter/X user ID of voter)
- ✅ `voter_username` column (Twitter/X username of voter)
- ✅ `vote_type` column ('up' or 'down' for upvote/downvote)

### Idea Comments Table
- ✅ `parent_comment_id` column (for nested replies)
- ✅ `author_twitter_id` column (Twitter/X user ID)

### New Table: idea_comment_votes
- ✅ Complete table for voting on comments
- ✅ Supports upvote/downvote on comments
- ✅ Links to Twitter/X users

### Indexes
- ✅ Performance indexes on all key columns
- ✅ Foreign key indexes for relationships

## Data Migration Notes

### Existing Ideas
- If you have existing ideas without slugs, the migration script will generate slugs automatically
- Format: `lowercase-title-with-dashes-{first-8-chars-of-id}`
- You may want to customize the slug generation logic based on your needs

### Existing Votes
- All existing votes will be set to `vote_type = 'up'` by default
- `voter_twitter_id` and `voter_username` will be NULL for existing votes
- These will be populated as users vote going forward

### Existing Comments
- Existing comments will have `parent_comment_id = NULL` (they're all top-level)
- `author_twitter_id` will be NULL for existing comments
- These will be populated as users comment going forward

## Rollback Plan

If you need to rollback, you can:

1. Restore from backup:
   ```bash
   wrangler d1 execute <DATABASE_NAME> --file=backup-YYYYMMDD.sql
   ```

2. Or manually remove columns (if needed):
   ```sql
   -- Note: SQLite doesn't support DROP COLUMN directly
   -- You would need to recreate the table without the columns
   ```

## Troubleshooting

### Error: "duplicate column name"
- The column already exists, skip that ALTER TABLE command
- Check existing columns with: `PRAGMA table_info(table_name);`

### Error: "UNIQUE constraint failed" on slug
- Some existing ideas may have duplicate titles
- Update the slug generation to include more of the ID or add a random suffix

### Error: "no such table: idea_comment_votes"
- The CREATE TABLE command failed
- Check if the table exists: `SELECT name FROM sqlite_master WHERE type='table' AND name='idea_comment_votes';`
- Re-run just the CREATE TABLE command

## Post-Migration Checklist

- [ ] All columns added successfully
- [ ] idea_comment_votes table created
- [ ] All indexes created
- [ ] Existing ideas have slugs
- [ ] Test creating a new idea
- [ ] Test voting on an idea (upvote/downvote)
- [ ] Test commenting on an idea
- [ ] Test replying to a comment
- [ ] Test voting on a comment
- [ ] Test nested replies (reply to reply)

## Support

If you encounter issues during migration, check:
1. Cloudflare D1 documentation: https://developers.cloudflare.com/d1/
2. SQLite documentation (D1 is based on SQLite): https://www.sqlite.org/docs.html
