# Populate Agent Projects from Colosseum

## Quick Start

### Step 1: Run Database Migration
```bash
cd /Users/ewanhamon/Documents/Code/BorgPad/spark-it/frontend

# Create tables in local D1 database
wrangler d1 execute sparkit-database --local \
  --file=./migrations/create-agent-projects-tables.sql

# Or for staging
wrangler d1 execute sparkit-database-staging \
  --file=./migrations/create-agent-projects-tables.sql
```

### Step 2: Start Dev Server
```bash
npm run dev
```

### Step 3: Trigger Scraper
Open a new terminal and run:

```bash
# Trigger the scraper to fetch projects from Colosseum
curl -X POST http://localhost:5173/api/admin/refresh-agent-projects

# You should see response like:
# {"success":true,"updated":0,"new":24,"message":"Refresh complete: 24 new projects, 0 updated"}
```

### Step 4: View Projects
Open your browser and navigate to:
- http://localhost:5173/agents

You should now see the scraped projects!

---

## What Gets Scraped

The scraper currently fetches:
- ✅ ~24-30 projects from the initial HTML (first page)
- ✅ Project titles and descriptions
- ✅ Team names
- ✅ Vote counts (human, agent, total)
- ✅ Project status (Draft/Published)
- ✅ Project URLs and slugs

**Note:** To get all 118 projects, you would need to implement infinite scroll handling with a headless browser (Puppeteer/Playwright). The current implementation uses simple HTTP fetch + regex parsing.

---

## Verification

Check if projects were imported:

```bash
# Using wrangler
wrangler d1 execute sparkit-database --local \
  --command="SELECT COUNT(*) as total FROM agent_projects;"

# Expected output: total > 0

# View some projects
wrangler d1 execute sparkit-database --local \
  --command="SELECT title, team_name, total_votes FROM agent_projects LIMIT 5;"
```

---

## Re-run Scraper (Update Votes)

To update vote counts from Colosseum:

```bash
curl -X POST http://localhost:5173/api/admin/refresh-agent-projects

# This will:
# - Fetch latest data from Colosseum
# - Update vote counts for existing projects
# - Add any new projects found
```

---

## Troubleshooting

### No projects found
1. Check scraper logs in terminal where `npm run dev` is running
2. Verify Colosseum website is accessible: https://colosseum.com/agent-hackathon/projects
3. Check database has the tables: `wrangler d1 execute sparkit-database --local --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'agent%';"`

### Scraper fails
- Check if Colosseum changed their HTML structure
- Check network connectivity
- Look for error messages in console

### Projects show but have no data
- Vote parsing might have failed (regex issue)
- Check logs for "Could not extract data for project" warnings
- Manually verify a project in database:
  ```bash
  wrangler d1 execute sparkit-database --local \
    --command="SELECT * FROM agent_projects LIMIT 1;"
  ```

---

## Production Deployment

For production, schedule automatic updates:

### Option 1: Cloudflare Cron (Every 6 hours)
Already configured in `functions/scheduled/update-agent-projects.ts`

Add to `wrangler.toml`:
```toml
[triggers]
crons = ["0 */6 * * *"]
```

### Option 2: Manual Admin Trigger
```bash
curl -X POST https://yourdomain.com/api/admin/refresh-agent-projects \
  -H "Authorization: Bearer <admin-token>"
```

---

## Next Steps

1. **Get all 118 projects**: Implement Puppeteer-based scraper with infinite scroll
2. **Add images**: Scrape or generate project images
3. **Enhance data**: Get more metadata from individual project pages
4. **Admin UI**: Add scraper control to back office dashboard
