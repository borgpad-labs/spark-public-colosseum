import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../api-client.js";

export function registerDiscoverTools(server: McpServer) {
  // ── list_tokens ──────────────────────────────────────────────
  server.tool(
    "list_tokens",
    "List Spark-It tokens. Filter by graduation status and sort by name, fees, etc.",
    {
      isGraduated: z
        .enum(["all", "true", "false"])
        .default("all")
        .describe('Filter by graduation status ("all", "true", "false")'),
      orderBy: z
        .enum(["name", "fees_claimed", "dao", "mint"])
        .default("name")
        .describe("Field to sort by"),
      orderDirection: z
        .enum(["asc", "desc"])
        .default("asc")
        .describe("Sort direction"),
    },
    async ({ isGraduated, orderBy, orderDirection }) => {
      const data = await apiGet("/api/gettokens", {
        isGraduated,
        orderBy,
        orderDirection,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── get_token ────────────────────────────────────────────────
  server.tool(
    "get_token",
    "Get details of a specific Spark-It token by its mint address.",
    {
      mint: z.string().describe("Token mint address"),
    },
    async ({ mint }) => {
      const data = await apiGet("/api/gettoken", { mint });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── get_token_market ─────────────────────────────────────────
  server.tool(
    "get_token_market",
    "Get market data for a token: price, market cap, volume, liquidity, price chart.",
    {
      address: z.string().describe("Token address / mint"),
    },
    async ({ address }) => {
      const data = await apiGet("/api/gettokenmarket", { address });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── get_token_volume ─────────────────────────────────────────
  server.tool(
    "get_token_volume",
    "Get trading volume data for a token over a specific timeframe.",
    {
      address: z.string().describe("Token address / mint"),
      timeFrame: z
        .enum(["1h", "24h", "7d", "30d"])
        .default("24h")
        .describe("Time period for volume data"),
    },
    async ({ address, timeFrame }) => {
      const data = await apiGet("/api/gettokenvolume", {
        address,
        timeFrame,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── get_leaderboard ──────────────────────────────────────────
  server.tool(
    "get_leaderboard",
    "Get the top 10 Spark-It token creators ranked by fees generated.",
    {},
    async () => {
      const data = await apiGet("/api/getleaderboard");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
