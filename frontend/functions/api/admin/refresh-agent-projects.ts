// File: functions/api/admin/refresh-agent-projects.ts
// Manual refresh endpoint for admins to trigger scraping

import { ColosseumScraper } from '../../scraper/colosseum-scraper';
import { jsonResponse, reportError } from '../cfPagesFunctionsUtils';

type ENV = {
  DB: D1Database;
  VITE_ENVIRONMENT_TYPE: string;
  ADMIN_ADDRESSES?: string;
};

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "http://localhost:5173";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export const onRequest: PagesFunction<ENV> = async (context) => {
  const request = context.request;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request),
    });
  }

  if (method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        ...corsHeaders(request),
        Allow: "OPTIONS, POST",
      },
    });
  }

  return handlePostRequest(context);
};

async function handlePostRequest(ctx: EventContext<ENV, string, unknown>) {
  const db = ctx.env.DB;
  const request = ctx.request;
  const url = new URL(ctx.request.url);
  const slug = url.searchParams.get("slug")?.trim(); // optional: scrape only this project

  try {
    console.log("=" .repeat(60));
    console.log("🔄 [ADMIN] Manual refresh triggered");
    console.log("🔄 [ADMIN] Request URL:", ctx.request.url);
    if (slug) console.log("🔄 [ADMIN] Single project mode, slug:", slug);
    console.log("🔄 [ADMIN] Timestamp:", new Date().toISOString());
    console.log("=" .repeat(60));

    const scraper = new ColosseumScraper(db);

    if (slug) {
      // Scrape only one project (for testing description, links, etc.)
      const project = await scraper.scrapeOneProject(slug);
      if (!project) {
        return jsonResponse({ success: false, message: "Project not found or failed to scrape", slug }, 404);
      }
      const { updated, new: newCount } = await scraper.upsertProjects([project]);
      return jsonResponse({
        success: true,
        message: "Single project refreshed",
        slug,
        new: newCount,
        updated,
        project: {
          title: project.title,
          description: project.description,
          teamName: project.teamName,
          status: project.status,
          humanVotes: project.humanVotes,
          agentVotes: project.agentVotes,
          totalVotes: project.totalVotes,
          categories: project.categories,
          repositoryUrl: project.repositoryUrl,
          demoUrl: project.demoUrl,
          teamMembers: project.teamMembers,
          tokenAddress: project.tokenAddress,
          colosseumUrl: project.colosseumUrl,
          colosseumProjectId: project.colosseumProjectId,
        },
      }, 200);
    }

    const projects = await scraper.scrapeProjects();
    const { updated, new: newCount } = await scraper.upsertProjects(projects);
    console.log("🔄 [ADMIN] Scraper completed:", newCount, "new,", updated, "updated");
    return jsonResponse({ success: true, message: "Refresh complete", new: newCount, updated }, 200);
  } catch (e) {
    await reportError(db, e);
    return jsonResponse({ success: false, message: "Something went wrong..." }, 500);
  }
}
