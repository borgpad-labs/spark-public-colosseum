import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"
import { Connection, PublicKey } from "@solana/web3.js"
import { CpAmm } from "@meteora-ag/cp-amm-sdk"

type ENV = {
  DB: D1Database
  RPC_URL: string
}

interface GetPositionsByUserRequest {
  userAddress: string  // The wallet address to get positions for
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // Parse request body
    const requestBody: GetPositionsByUserRequest = await ctx.request.json()
    const { userAddress } = requestBody

    // Validate required fields
    if (!userAddress) {
      return jsonResponse({
        message: "userAddress parameter is required!",
        example: {
          "userAddress": "EWbQAr2ETAZ6DERgBU9v5PzPCdDDAch1LKKuJwp4jTDN"
        }
      }, 400)
    }

    // Validate address format
    let userAddressPubKey: PublicKey
    try {
      userAddressPubKey = new PublicKey(userAddress)
    } catch (error) {
      return jsonResponse({
        message: "Invalid wallet address format!",
        providedAddress: userAddress,
        error: error instanceof Error ? error.message : String(error)
      }, 400)
    }

    // Initialize Solana connection and CP-AMM SDK
    const connection = new Connection(ctx.env.RPC_URL, "confirmed")
    const cpAmm = new CpAmm(connection)

    console.log(`Fetching positions for user: ${userAddress}`)

    // Get all positions for the user
    let userPositions
    try {
      userPositions = await cpAmm.getPositionsByUser(userAddressPubKey)
      console.log(`Found ${userPositions.length} positions for user`)
    } catch (error) {
      console.error("Error fetching user positions:", error)
      return jsonResponse({
        message: "Failed to fetch user positions",
        error: error instanceof Error ? error.message : String(error),
        userAddress: userAddress
      }, 500)
    }

    // Format the response to include readable data with null checks
    const formattedPositions = userPositions.map((pos, index) => ({
      index: index + 1,
      positionNftAccount: pos.positionNftAccount?.toString() || 'N/A',
      position: pos.position?.toString() || 'N/A',
      positionState: {
        // Position basic info
        poolId: pos.positionState?.poolId?.toString() || 'N/A',
        owner: pos.positionState?.owner?.toString() || 'N/A',
        liquidity: pos.positionState?.liquidity?.toString() || '0',
        
        // Price range
        lowerBinId: pos.positionState?.lowerBinId ?? null,
        upperBinId: pos.positionState?.upperBinId ?? null,
        width: pos.positionState?.width ?? null,
        
        // Fee tracking
        feeOwed: {
          tokenA: pos.positionState?.feeOwed?.tokenA?.toString() || '0',
          tokenB: pos.positionState?.feeOwed?.tokenB?.toString() || '0'
        },
        
        // Reward tracking (if any rewards exist)
        rewardOwed: pos.positionState?.rewardOwed?.map(reward => reward?.toString() || '0') || [],
        
        // Lock status
        lockReleaseSlot: pos.positionState?.lockReleaseSlot?.toString() || '0',
        
        // Creation info
        createdAt: pos.positionState?.createdAt?.toString() || '0',
        
        // Full position state for advanced usage
        rawPositionState: pos.positionState
      }
    }))

    // Return the formatted positions
    return jsonResponse({
      success: true,
      userAddress: userAddress,
      totalPositions: userPositions.length,
      positions: formattedPositions,
      message: userPositions.length > 0 
        ? `Found ${userPositions.length} position(s) for user ${userAddress}`
        : `No positions found for user ${userAddress}`,
      note: "Positions are sorted by liquidity in descending order"
    }, 200)

  } catch (error) {
    console.error('Get positions by user error:', error)
    await reportError(ctx.env.DB, error)
    
    return jsonResponse({ 
      message: "Something went wrong while fetching user positions",
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
}

// Also support GET request for simple queries
export const onRequestGet: PagesFunction<ENV> = async (ctx) => {
  try {
    // Get userAddress from URL parameters
    const url = new URL(ctx.request.url)
    const userAddress = url.searchParams.get('userAddress')

    if (!userAddress) {
      return jsonResponse({
        message: "userAddress query parameter is required!",
        example: "GET /api/getpositionsbyuser?userAddress=EWbQAr2ETAZ6DERgBU9v5PzPCdDDAch1LKKuJwp4jTDN"
      }, 400)
    }

    // Validate address format
    let userAddressPubKey: PublicKey
    try {
      userAddressPubKey = new PublicKey(userAddress)
    } catch (error) {
      return jsonResponse({
        message: "Invalid wallet address format!",
        providedAddress: userAddress,
        error: error instanceof Error ? error.message : String(error)
      }, 400)
    }

    // Initialize Solana connection and CP-AMM SDK
    const connection = new Connection(ctx.env.RPC_URL, "confirmed")
    const cpAmm = new CpAmm(connection)

    console.log(`Fetching positions for user (GET): ${userAddress}`)

    // Get all positions for the user
    let userPositions
    try {
      userPositions = await cpAmm.getPositionsByUser(userAddressPubKey)
      console.log(`Found ${userPositions.length} positions for user`)
    } catch (error) {
      console.error("Error fetching user positions:", error)
      return jsonResponse({
        message: "Failed to fetch user positions",
        error: error instanceof Error ? error.message : String(error),
        userAddress: userAddress
      }, 500)
    }

    // Format the response (same as POST) with null checks
    const formattedPositions = userPositions.map((pos, index) => ({
      index: index + 1,
      positionNftAccount: pos.positionNftAccount?.toString() || 'N/A',
      position: pos.position?.toString() || 'N/A',
      positionState: {
        poolId: pos.positionState?.poolId?.toString() || 'N/A',
        owner: pos.positionState?.owner?.toString() || 'N/A',
        liquidity: pos.positionState?.liquidity?.toString() || '0',
        lowerBinId: pos.positionState?.lowerBinId ?? null,
        upperBinId: pos.positionState?.upperBinId ?? null,
        width: pos.positionState?.width ?? null,
        feeOwed: {
          tokenA: pos.positionState?.feeOwed?.tokenA?.toString() || '0',
          tokenB: pos.positionState?.feeOwed?.tokenB?.toString() || '0'
        },
        rewardOwed: pos.positionState?.rewardOwed?.map(reward => reward?.toString() || '0') || [],
        lockReleaseSlot: pos.positionState?.lockReleaseSlot?.toString() || '0',
        createdAt: pos.positionState?.createdAt?.toString() || '0',
        rawPositionState: pos.positionState
      }
    }))

    return jsonResponse({
      success: true,
      userAddress: userAddress,
      totalPositions: userPositions.length,
      positions: formattedPositions,
      message: userPositions.length > 0 
        ? `Found ${userPositions.length} position(s) for user ${userAddress}`
        : `No positions found for user ${userAddress}`,
      note: "Positions are sorted by liquidity in descending order"
    }, 200)

  } catch (error) {
    console.error('Get positions by user error (GET):', error)
    await reportError(ctx.env.DB, error)
    
    return jsonResponse({ 
      message: "Something went wrong while fetching user positions",
      error: error instanceof Error ? error.message : String(error)
    }, 500)
  }
}
