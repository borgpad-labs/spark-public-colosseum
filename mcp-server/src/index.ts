#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerDiscoverTools } from "./tools/discover.js";
import { registerIdeasTools } from "./tools/ideas.js";
import { registerProjectsTools } from "./tools/projects.js";
import { registerTradeTools } from "./tools/trade.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const skillsPath = join(__dirname, "..", "skills.md");

const server = new McpServer({
  name: "spark-it",
  version: "1.0.0",
});

// Resource: skills.md — API documentation for AI agents
server.resource(
  "skills",
  "sparkit://skills",
  { description: "Spark-It API documentation — all available tools, parameters, response shapes, and usage patterns", mimeType: "text/markdown" },
  async () => ({
    contents: [{
      uri: "sparkit://skills",
      mimeType: "text/markdown",
      text: readFileSync(skillsPath, "utf-8"),
    }],
  }),
);

registerDiscoverTools(server);
registerIdeasTools(server);
registerProjectsTools(server);
registerTradeTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
