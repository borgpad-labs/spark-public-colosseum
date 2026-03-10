# sparkit-mcp

MCP Server for the [Spark-It](https://justspark.fun) platform. Gives AI agents access to Spark-It tokens, ideas, agent projects, and trading on Solana.

## Quick Start

Add to your AI client config:

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "spark-it": {
      "command": "npx",
      "args": ["-y", "sparkit-mcp"]
    }
  }
}
```

**Cursor** (`.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "spark-it": {
      "command": "npx",
      "args": ["-y", "sparkit-mcp"]
    }
  }
}
```

Restart your client. The 13 tools are now available.

## Tools

### Discover
| Tool | Description |
|------|-------------|
| `list_tokens` | List tokens, filter by graduation, sort by name/fees |
| `get_token` | Get token details by mint address |
| `get_token_market` | Price, market cap, volume, liquidity, price chart |
| `get_token_volume` | Trading volume over 1h/24h/7d/30d |
| `get_leaderboard` | Top 10 creators by fees generated |

### Ideas
| Tool | Description |
|------|-------------|
| `list_ideas` | Browse ideas with filters and pagination |
| `get_idea` | Idea details + comments by slug |
| `create_idea` | Submit a new idea |

### Agent Projects
| Tool | Description |
|------|-------------|
| `list_projects` | Browse hackathon projects |
| `get_project` | Project details + comments by slug |
| `get_project_investments` | Investment data by project or wallet |

### Trade
| Tool | Description |
|------|-------------|
| `generate_swap` | Build a Jupiter swap transaction (does not execute) |
| `execute_swap` | Execute a swap on Solana mainnet |

## Resources

The server exposes a `sparkit://skills` resource containing full API documentation with parameters, response shapes, and usage patterns.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `SPARKIT_API_BASE_URL` | `https://justspark.fun` | API base URL |
| `SPARKIT_API_TIMEOUT` | `30000` | Request timeout (ms) |

## Links

- [Spark-It Platform](https://justspark.fun)
- [npm package](https://www.npmjs.com/package/sparkit-mcp)
