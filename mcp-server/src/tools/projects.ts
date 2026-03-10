import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiGet } from "../api-client.js";

export function registerProjectsTools(server: McpServer) {
  // ── list_projects ────────────────────────────────────────────
  server.tool(
    "list_projects",
    "List agent hackathon projects with filtering, sorting, and pagination.",
    {
      status: z.string().optional().describe("Filter by project status"),
      sortBy: z
        .enum(["votes", "newest", "oldest", "raised", "colosseum_votes", "downvotes"])
        .default("votes")
        .describe("Sort order"),
      limit: z.number().int().min(1).max(100).default(50).describe("Results per page"),
      offset: z.number().int().min(0).default(0).describe("Pagination offset"),
    },
    async ({ status, sortBy, limit, offset }) => {
      const data = await apiGet("/api/agent-projects", {
        status,
        sortBy,
        limit: String(limit),
        offset: String(offset),
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── get_project ──────────────────────────────────────────────
  server.tool(
    "get_project",
    "Get details of a specific agent project by slug, including comments.",
    {
      slug: z.string().describe("Project slug (URL-friendly identifier)"),
    },
    async ({ slug }) => {
      const data = await apiGet("/api/agent-projects", { slug });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );

  // ── get_project_investments ──────────────────────────────────
  server.tool(
    "get_project_investments",
    "Get investments for a specific project or by a specific wallet.",
    {
      projectId: z.string().optional().describe("Project ID to get investments for"),
      wallet: z
        .string()
        .optional()
        .describe("Wallet address to get investments by"),
    },
    async ({ projectId, wallet }) => {
      const data = await apiGet("/api/agent-project-investments", {
        projectId,
        wallet,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    },
  );
}
