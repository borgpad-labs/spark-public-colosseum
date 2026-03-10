# Spark-It API Skills

You are interacting with the Spark-It platform — a launchpad for tokens, ideas, and agent projects on Solana.

Base URL: `https://justspark.fun`

---

## Discover — Tokens & Leaderboard

### list_tokens
List all Spark-It tokens with optional filtering and sorting.

**GET** `/api/gettokens`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| isGraduated | `"all"` \| `"true"` \| `"false"` | `"all"` | `"true"` = tokens with a DAO, `"false"` = not yet graduated |
| orderBy | `"name"` \| `"fees_claimed"` \| `"dao"` \| `"mint"` | `"name"` | Sort field |
| orderDirection | `"asc"` \| `"desc"` | `"asc"` | Sort direction |

Returns `{ tokens: [...] }`.

---

### get_token
Get full details of a single token.

**GET** `/api/gettoken`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| mint | string | yes | Token mint address |

Returns `{ token: { id, name, mint, dao, fees_claimed, ... } }`.

---

### get_token_market
Get live market data: price, market cap, volume, liquidity, and a price chart.

**GET** `/api/gettokenmarket`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| address | string | yes | Token mint address |

Returns:
```json
{
  "success": true,
  "tokenMarketData": {
    "price": 0.0042,
    "priceChange24h": -2.5,
    "marketCap": 420000,
    "volume24h": 12000,
    "liquidity": 85000,
    "fdv": 420000,
    "priceChart": [{ "timestamp": 1700000000, "price": 0.004 }]
  }
}
```

---

### get_token_volume
Get trading volume breakdown over a timeframe, including recent transactions.

**GET** `/api/gettokenvolume`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| address | string | required | Token mint address |
| timeFrame | `"1h"` \| `"24h"` \| `"7d"` \| `"30d"` | `"24h"` | Period |

Returns `{ success, totalVolume, totalTrades, averageVolume, volumeData: [...], recentTransactions: [...] }`.

---

### get_leaderboard
Top 10 token creators ranked by fees generated.

**GET** `/api/getleaderboard`

No parameters.

Returns:
```json
{
  "leaderboard": [
    { "username": "alice", "feesGenerated": 150, "feesGeneratedSOL": 1.2, "rank": 1, "tokenCount": 5 }
  ]
}
```

---

## Ideas

### list_ideas
Browse community ideas with filtering and pagination.

**GET** `/api/ideas`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| category | string | — | Filter by category |
| status | string | — | Filter by status |
| authorUsername | string | — | Filter by author |
| voterUsername | string | — | Ideas voted on by this user |
| sortBy | `"votes"` \| `"newest"` \| `"oldest"` \| `"raised"` \| `"downvotes"` | `"votes"` | Sort order |
| limit | number | 50 | Results per page (max 100) |
| offset | number | 0 | Pagination offset |

Returns `{ ideas: [...], pagination: { total, limit, offset } }`.

---

### get_idea
Get a single idea with its comments.

**GET** `/api/ideas`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| slug | string | yes | Idea slug (from the URL) |

Returns `{ idea: { id, title, slug, description, category, upvotes, downvotes, ... }, comments: [...] }`.

---

### create_idea
Submit a new idea to the platform.

**POST** `/api/ideas`

Body:
```json
{
  "title": "My Idea",
  "description": "Detailed description...",
  "category": "defi",
  "authorUsername": "alice",
  "source": "mcp",
  "estimatedPrice": 100
}
```

Required fields: `title`, `description`, `category`.

Returns `{ success: true, id, slug, url, message }` with status 201.

---

## Agent Projects

### list_projects
Browse agent hackathon projects.

**GET** `/api/agent-projects`

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| status | string | — | Filter by status |
| sortBy | `"votes"` \| `"newest"` \| `"oldest"` \| `"raised"` \| `"colosseum_votes"` \| `"downvotes"` | `"votes"` | Sort order |
| limit | number | 50 | Results per page (max 100) |
| offset | number | 0 | Pagination offset |

Returns `{ projects: [...], pagination: { total, limit, offset } }`.

---

### get_project
Get a single project with its comments.

**GET** `/api/agent-projects`

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| slug | string | yes | Project slug |

Returns `{ project: { id, title, slug, description, team_name, total_votes, raised_amount, ... }, comments: [...] }`.

---

### get_project_investments
Get investment data for a project or by wallet.

**GET** `/api/agent-project-investments`

| Param | Type | Description |
|-------|------|-------------|
| projectId | string | Get all investments for this project |
| wallet | string | Get all investments by this wallet |

Provide at least one. Returns `{ investments: [{ id, project_id, investor_wallet, amount_usdc, status, ... }] }`.

---

## Trade (Solana Mainnet)

> These tools execute real on-chain transactions. Use with caution.

### generate_swap
Build a Jupiter swap transaction (does NOT execute it).

**POST** `/api/generateswapinstruction`

Body:
```json
{
  "inputMint": "So11111111111111111111111111111111111111112",
  "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "amount": "100000000",
  "userPublicKey": "YOUR_WALLET_ADDRESS",
  "slippageBps": 50
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| inputMint | string | required | Token to swap FROM |
| outputMint | string | required | Token to swap TO |
| amount | string | required | Amount in smallest unit (lamports for SOL) |
| userPublicKey | string | required | Wallet public key |
| slippageBps | number | 50 | Slippage in bps (50 = 0.5%) |
| prioritizationFeeLamports | number | 0 | Priority fee |

Returns `{ success, swapTransaction, lastValidBlockHeight, quoteInfo: { inAmount, outAmount, priceImpactPct } }`.

The `swapTransaction` is a base64-encoded transaction ready to be signed and executed.

---

### execute_swap
Send a signed swap transaction to Solana mainnet.

**POST** `/api/executeswaptransaction`

Body:
```json
{
  "swapTransaction": "BASE64_TRANSACTION_FROM_GENERATE_SWAP",
  "lastValidBlockHeight": 123456789
}
```

Returns `{ success, transactionSignature, confirmation }`.

---

## Common Patterns

**Explore a token:**
1. `list_tokens` to browse available tokens
2. `get_token` with the mint address for details
3. `get_token_market` for live price & market data
4. `get_token_volume` for trading activity

**Browse ideas:**
1. `list_ideas` with `sortBy=newest` to see latest
2. `get_idea` with the slug for full details + comments
3. `create_idea` to submit a new one

**Analyze a project:**
1. `list_projects` to browse hackathon projects
2. `get_project` with the slug for details
3. `get_project_investments` with projectId for funding data

**Execute a trade:**
1. `get_token_market` to check current price
2. `generate_swap` to build the transaction
3. Review the `quoteInfo` (amounts, price impact)
4. `execute_swap` only after confirming with the user

## Well-known Mints

| Token | Mint |
|-------|------|
| SOL (wrapped) | `So11111111111111111111111111111111111111112` |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |
