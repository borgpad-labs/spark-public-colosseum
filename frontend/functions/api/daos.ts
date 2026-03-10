import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"
import { drizzle } from "drizzle-orm/d1"
import { tokensTable } from "../../shared/drizzle-schema"
import { and, ne, isNotNull } from "drizzle-orm"

type ENV = {
  DB: D1Database
  VITE_ENVIRONMENT_TYPE?: string
}

export const onRequestGet: PagesFunction<ENV> = async (ctx) => {
  const db = drizzle(ctx.env.DB, { logger: true })
  try {
    // Get all tokens that have DAOs (non-null, non-empty dao field)
    const tokens = await db
      .select()
      .from(tokensTable)
      .where(and(
        isNotNull(tokensTable.dao),
        ne(tokensTable.dao, "")
      ))
      .all()

    // Transform tokens to match the expected DaoResponse format
    const daos = tokens.map(token => ({
      id: token.mint,
      name: token.name,
      imageUrl: token.imageUrl,
      dao: token.dao,
      tokenMint: token.mint,
    }))

    return jsonResponse({ daos }, 200)
  } catch (e) {
    await reportError(ctx.env.DB, e)
    return jsonResponse({ message: "Something went wrong..." }, 500)
  }
}

export const onRequestOptions: PagesFunction<ENV> = async (ctx) => {
  try {
    if (ctx.env.VITE_ENVIRONMENT_TYPE !== "develop") return
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    return jsonResponse({ message: error }, 500)
  }
} 