import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet, apiPost } from "../api-client.js";

export function registerIdeasTools(server: McpServer) {
  // ── list_ideas ───────────────────────────────────────────────
  server.tool(
    "list_ideas",
    "List Spark-It ideas with filtering, sorting, and pagination.",
    {
      category: z.string().optional().describe("Filter by category"),
      status: z.string().optional().describe("Filter by status"),
      authorUsername: z.string().optional().describe("Filter by author username"),
      voterUsername: z
        .string()
        .optional()
        .describe("Get ideas voted on by this user"),
      sortBy: z
        .enum(["votes", "newest", "oldest", "raised", "downvotes"])
        .default("votes")
        .describe("Sort order"),
      limit: z.number().int().min(1).max(100).default(50).describe("Results per page"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    },
    async ({ category, status, authorUsername, voterUsername, sortBy, limit, offset }) => {
      const data = await apiGet("/api/ideas", {
        category,
        status,
        authorUsername,
        voterUsername,
        sortBy,
        limit: String(limit),
        offset: String(offset),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── get_idea ─────────────────────────────────────────────────
  server.tool(
    "get_idea",
    "Get details of a specific idea by slug, including comments.",
    {
      slug: z.string().describe("Idea slug (URL-friendly identifier)"),
    },
    async ({ slug }) => {
      const data = await apiGet("/api/ideas", { slug });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── create_idea ──────────────────────────────────────────────
  server.tool(
    "create_idea",
    "Submit a new idea to Spark-It.",
    {
      title: z.string().describe("Idea title"),
      description: z.string().describe("Detailed description of the idea"),
      category: z.string().describe("Idea category"),
      authorUsername: z.string().optional().describe("Author username"),
      authorAvatar: z.string().optional().describe("Author avatar URL"),
      authorTwitterId: z.string().optional().describe("Author Twitter/X ID"),
      source: z.string().default("mcp").describe('Source of the idea (default: "mcp")'),
      tweetUrl: z.string().optional().describe("Related tweet URL"),
      tweetContent: z.string().optional().describe("Related tweet content"),
      estimatedPrice: z.number().optional().describe("Estimated price for the idea"),
    },
    async (args) => {
      const data = await apiPost("/api/ideas", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
