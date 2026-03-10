// File: functions/user.ts or functions/api/user.ts (depending on your structure)

import { CreateUsernameRequestSchema } from "../../shared/models";
import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";

type ENV = {
  DB: D1Database
  VITE_ENVIRONMENT_TYPE: string
}

// Define a general handler function for applying CORS headers
function corsHeaders(request) {
  const origin = request.headers.get('Origin') || 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

// Handle all HTTP methods
export const onRequest: PagesFunction<ENV> = async (context) => {
  // Extract method and add CORS headers for all responses
  const request = context.request;
  const method = request.method.toUpperCase();
  
  // For OPTIONS requests, return just the CORS headers
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(request)
    });
  }
  
  // For POST requests, process the user creation
  if (method === 'POST') {
    return handlePostRequest(context);
  }
  // For POST requests, process the user creation
  if (method === 'GET') {
    return handleGetRequest(context);
  }
  
  // For any other methods, return 405 Method Not Allowed
  return new Response('Method Not Allowed', {
    status: 405,
    headers: {
      ...corsHeaders(request),
      'Allow': 'OPTIONS, POST'
    }
  });
};

// Handle GET requests
async function handleGetRequest(ctx) {
  const db = ctx.env.DB;
  const request = ctx.request;
  
  try {
    const { searchParams } = new URL(ctx.request.url)
    const address = searchParams.get("address")
    
    if (!address) {
      return jsonResponse({ message: "Address is required" }, 400)
    }

    const existingUser = await db
      .prepare("SELECT address, username FROM user WHERE address = ?")
      .bind(address)
      .first();

    if (!existingUser) {
      return jsonResponse({ message: "User not found" }, 404)
    }

    return jsonResponse(existingUser, 200)
  } catch (e) {
    await reportError(db, e);
    return jsonResponse({ message: "Something went wrong..." }, 500)
  }
}

// Handle POST requests
async function handlePostRequest(context) {
  const db = context.env.DB;
  const request = context.request;
  
  try {
    const requestJson = await request.json();

    const { error, data } = CreateUsernameRequestSchema.safeParse(requestJson);

    if (error) {
      return new Response(JSON.stringify({ message: "Invalid request data" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders(request)
        }
      });
    }

    const { publicKey, username } = data;

    // Check for existing user
    const existingUser = await db
      .prepare("SELECT * FROM user WHERE address = ?")
      .bind(publicKey)
      .first(); // Use .first() to get a single record or null

    if (!existingUser) {
      await db
        .prepare("INSERT INTO user (address, username) VALUES (?1, ?2)")
        .bind(publicKey, username)
        .run();
    } else {
      await db
        .prepare("UPDATE user SET username = ?2 WHERE address = ?1")
        .bind(publicKey, username)
        .run();
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request)
      }
    });
  } catch (e) {
    await reportError(db, e);
    return new Response(JSON.stringify({ message: "Something went wrong..." }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(request)
      }
    });
  }
}