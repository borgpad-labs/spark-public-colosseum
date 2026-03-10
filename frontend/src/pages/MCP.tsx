const codeBlockClass = "bg-[#1a1a2e] text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto border border-border"

const MCP = () => {
  return (
    <div className="min-h-screen bg-accent">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary">AI Agent Integration</h1>
          <p className="text-sm text-fg-secondary">Connect your AI agent to Spark-It via MCP</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-3xl space-y-8">
        {/* What is MCP */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-fg-primary mb-3">What is MCP?</h2>
          <p className="text-fg-secondary leading-relaxed">
            The <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" className="text-brand-primary hover:underline">Model Context Protocol</a> (MCP) lets AI agents interact with external platforms.
            Our MCP server gives your agent access to Spark-It tokens, ideas, projects, and trading — all through a standard interface supported by Claude, Cursor, and other AI clients.
          </p>
        </section>

        {/* Quick Setup */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-fg-primary mb-4">Setup</h2>
          <p className="text-fg-secondary mb-4">
            Add this to your AI client configuration. No API key needed.
          </p>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-fg-secondary mb-2">Claude Desktop</h3>
              <p className="text-xs text-fg-secondary mb-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-fg-primary">~/Library/Application Support/Claude/claude_desktop_config.json</code>
              </p>
              <pre className={codeBlockClass}>{`{
  "mcpServers": {
    "spark-it": {
      "command": "npx",
      "args": ["-y", "sparkit-mcp"]
    }
  }
}`}</pre>
            </div>

            <div>
              <h3 className="text-sm font-medium text-fg-secondary mb-2">Cursor</h3>
              <p className="text-xs text-fg-secondary mb-2">
                <code className="bg-background px-1.5 py-0.5 rounded text-fg-primary">.cursor/mcp.json</code>
              </p>
              <pre className={codeBlockClass}>{`{
  "mcpServers": {
    "spark-it": {
      "command": "npx",
      "args": ["-y", "sparkit-mcp"]
    }
  }
}`}</pre>
            </div>
          </div>

          <p className="text-fg-secondary text-sm mt-4">
            Restart your AI client after adding the config. The agent will automatically discover all 13 tools.
          </p>
        </section>

        {/* Available Tools */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-fg-primary mb-4">Available Tools</h2>

          <div className="space-y-6">
            <ToolGroup title="Discover" tools={[
              { name: "list_tokens", desc: "List tokens, filter by graduation, sort by name/fees" },
              { name: "get_token", desc: "Get token details by mint address" },
              { name: "get_token_market", desc: "Price, market cap, volume, liquidity" },
              { name: "get_token_volume", desc: "Trading volume over 1h/24h/7d/30d" },
              { name: "get_leaderboard", desc: "Top 10 creators by fees generated" },
            ]} />

            <ToolGroup title="Ideas" tools={[
              { name: "list_ideas", desc: "Browse ideas with filters and pagination" },
              { name: "get_idea", desc: "Idea details + comments by slug" },
              { name: "create_idea", desc: "Submit a new idea" },
            ]} />

            <ToolGroup title="Agent Projects" tools={[
              { name: "list_projects", desc: "Browse hackathon projects" },
              { name: "get_project", desc: "Project details + comments by slug" },
              { name: "get_project_investments", desc: "Investment data by project or wallet" },
            ]} />

            <ToolGroup title="Trade" tools={[
              { name: "generate_swap", desc: "Build a Jupiter swap transaction" },
              { name: "execute_swap", desc: "Execute a swap on Solana mainnet" },
            ]} />
          </div>
        </section>

        {/* Example */}
        <section className="bg-card border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold text-fg-primary mb-3">Example Prompts</h2>
          <p className="text-fg-secondary mb-4">Once connected, you can ask your AI agent things like:</p>
          <div className="space-y-2">
            {[
              "Show me the top tokens by fees on Spark-It",
              "What's the market data for token [mint address]?",
              "List the newest ideas on the platform",
              "Show me the most voted agent projects",
              "What's the 24h trading volume for this token?",
            ].map((prompt) => (
              <div key={prompt} className="flex items-start gap-2 bg-background rounded-lg p-3 border border-border">
                <span className="text-brand-primary font-mono text-sm shrink-0">&gt;</span>
                <span className="text-fg-primary text-sm">{prompt}</span>
              </div>
            ))}
          </div>
        </section>

        {/* npm link */}
        <div className="text-center pb-8">
          <a
            href="https://www.npmjs.com/package/sparkit-mcp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-primary hover:underline text-sm"
          >
            View on npm &rarr;
          </a>
        </div>
      </div>
    </div>
  )
}

const ToolGroup = ({ title, tools }: { title: string; tools: { name: string; desc: string }[] }) => (
  <div>
    <h3 className="text-sm font-semibold text-brand-primary uppercase tracking-wide mb-2">{title}</h3>
    <div className="space-y-1">
      {tools.map((tool) => (
        <div key={tool.name} className="flex items-start gap-3 py-1.5">
          <code className="text-sm font-mono text-fg-primary bg-background px-2 py-0.5 rounded shrink-0">{tool.name}</code>
          <span className="text-sm text-fg-secondary">{tool.desc}</span>
        </div>
      ))}
    </div>
  </div>
)

export default MCP
