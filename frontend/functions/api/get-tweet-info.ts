// File: functions/api/get-tweet-info.ts
// API endpoint to get tweet info from Sorsa API

import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";

type ENV = {
  DB: D1Database;
  SORSA_API_KEY?: string;
  VITE_ENVIRONMENT_TYPE: string;
};

function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "http://localhost:5173";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

// POST - Get tweet info from Sorsa API
async function handlePostRequest(ctx: EventContext<ENV, string, unknown>) {
  const db = ctx.env.DB;
  const request = ctx.request;

  try {
    const body = await request.json() as {
      tweet_link?: string;
    };

    const { tweet_link } = body;

    if (!tweet_link) {
      return jsonResponse({ message: "tweet_link is required" }, 400);
    }

    if (!ctx.env.SORSA_API_KEY) {
      return jsonResponse({ message: "SORSA_API_KEY not configured" }, 500);
    }

    console.log("🔍 [TWEET INFO] Fetching tweet info from Sorsa:", tweet_link);

    // Call Sorsa API
    const sorsaResponse = await fetch("https://api.sorsa.io/v2/tweet-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ApiKey": ctx.env.SORSA_API_KEY,
      },
      body: JSON.stringify({
        tweet_link: tweet_link,
      }),
    });

    if (!sorsaResponse.ok) {
      const errorText = await sorsaResponse.text();
      console.error("❌ [TWEET INFO] Sorsa API error:", sorsaResponse.status, errorText);
      return jsonResponse({ 
        message: "Failed to fetch tweet info from Sorsa",
        error: errorText.substring(0, 500)
      }, sorsaResponse.status);
    }

    const sorsaData = await sorsaResponse.json() as {
      full_text?: string;
      user?: {
        screen_name?: string;
        name?: string;
        avatar?: string;
        id_str?: string;
      };
      id_str?: string;
      created_at?: string;
    };

    console.log("✅ [TWEET INFO] Tweet info fetched:", {
      hasText: !!sorsaData.full_text,
      username: sorsaData.user?.screen_name,
      tweetId: sorsaData.id_str,
    });

    return jsonResponse({
      success: true,
      tweetContent: sorsaData.full_text || "",
      username: sorsaData.user?.screen_name || "",
      userDisplayName: sorsaData.user?.name || "",
      userAvatar: sorsaData.user?.avatar || "",
      userId: sorsaData.user?.id_str || "",
      tweetId: sorsaData.id_str || "",
      createdAt: sorsaData.created_at || "",
    }, 200);
  } catch (e) {
    await reportError(db, e);
    return jsonResponse({ message: "Something went wrong fetching tweet info..." }, 500);
  }
}
