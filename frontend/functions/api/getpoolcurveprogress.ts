import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"
import { drizzle } from "drizzle-orm/d1"
import { Connection, PublicKey } from "@solana/web3.js"
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk"

type ENV = {
  DB: D1Database
  RPC_URL: string
}

export const onRequestGet: PagesFunction<ENV> = async (ctx) => {
  const db = drizzle(ctx.env.DB, { logger: true })
  try {
    // parse request
    const { searchParams } = new URL(ctx.request.url)
    const poolAddress = searchParams.get("poolAddress")

    // validate request
    if (!poolAddress) {
      return jsonResponse({
        message: "Must provide poolAddress parameter!"
      }, 400)
    }

    // validate pool address format
    let poolPubKey: PublicKey
    try {
      poolPubKey = new PublicKey(poolAddress)
    } catch (error) {
      return jsonResponse({
        message: "Invalid pool address format!"
      }, 400)
    }

    // initialize Solana connection and DBC client
    const connection = new Connection(ctx.env.RPC_URL, "confirmed")
    const client = new DynamicBondingCurveClient(connection, "confirmed")

    // call the getPoolCurveProgress method
    const progress = await client.state.getPoolCurveProgress(poolPubKey)

    // return the progress value (number between 0 and 1)
    return jsonResponse({
      poolAddress,
      curveProgress: progress
    }, 200)

  } catch (e) {
    await reportError(ctx.env.DB, e)
    return jsonResponse({ message: "Something went wrong..." }, 500)
  }
}
