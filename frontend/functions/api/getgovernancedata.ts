import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"
import { getRpcUrlForCluster } from "../../shared/solana/rpcUtils"
import { Connection, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

// Enhanced cache for governance data with shorter TTL for real-time updates
const governanceCache = new Map<string, { votingPower: number; hasRecord: boolean; timestamp: number; promise?: Promise<{ votingPower: number; hasRecord: boolean }> }>()
const CACHE_TTL = 30000 // 30 seconds cache - much shorter for real-time governance updates

// Clean up expired cache entries
function cleanupCache() {
  const now = Date.now()
  for (const [key, value] of governanceCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      governanceCache.delete(key)
    }
  }
}

// Retry configuration for RPC calls
const MAX_RETRIES = 2
const BASE_DELAY = 2000 // 2 seconds

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      
      // Check for rate limiting more comprehensively
      const isRateLimited = error.toString().includes('429') || 
                           error.toString().includes('Too Many Requests') ||
                           error.toString().includes('rate limit')
      
      // If it's not a rate limit error or we've exhausted retries, throw immediately
      if (attempt === maxRetries || !isRateLimited) {
        throw error
      }
      
      // Calculate delay with exponential backoff and add some jitter
      const baseDelay = BASE_DELAY * Math.pow(2, attempt)
      const jitter = Math.random() * 1000 // Add up to 1 second of random jitter
      const delay = baseDelay + jitter
      
      await sleep(delay)
    }
  }
  
  throw lastError!
}

type ENV = {
  DB: D1Database
  RPC_URL: string
}

type GetGovernanceDataResponse = {
  success: boolean
  votingPower: number
  hasRecord: boolean
  userAddress: string
  realmAddress: string
  tokenMint: string
}

export const onRequestGet: PagesFunction<ENV> = async (ctx) => {
  const db = ctx.env.DB

  try {
    const { searchParams } = new URL(ctx.request.url)
    const userAddress = searchParams.get("userAddress")
    const realmAddress = searchParams.get("realmAddress")
    const tokenMint = searchParams.get("tokenMint")
    const cluster = searchParams.get("cluster") || "mainnet"
    const forceRefresh = searchParams.get("forceRefresh") === "true"

    // Validate required parameters
    if (!userAddress || !realmAddress || !tokenMint) {
      return jsonResponse({ 
        message: "Missing required parameters: userAddress, realmAddress, and tokenMint" 
      }, 400)
    }

    if (!['devnet', 'mainnet'].includes(cluster)) {
      return jsonResponse({ 
        message: `Unsupported cluster (${cluster})!` 
      }, 400)
    }

    // Validate Solana addresses
    try {
      new PublicKey(userAddress)
      new PublicKey(realmAddress)
      new PublicKey(tokenMint)
    } catch (error) {
      return jsonResponse({ 
        message: "Invalid Solana address format" 
      }, 400)
    }

    // Clean up expired cache entries
    cleanupCache()
    
    // Check cache first with cache key
    const cacheKey = `${userAddress}-${realmAddress}-${tokenMint}-${cluster}`
    const cached = governanceCache.get(cacheKey)
    
    if (cached && !forceRefresh) {
      // If we have a cached result and it's still valid, return it
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        const response: GetGovernanceDataResponse = {
          success: true,
          votingPower: cached.votingPower,
          hasRecord: cached.hasRecord,
          userAddress,
          realmAddress,
          tokenMint
        }
        return jsonResponse(response, 200)
      }
      
      // If there's an ongoing request for this key, wait for it
      if (cached.promise) {
        try {
          const result = await cached.promise
          const response: GetGovernanceDataResponse = {
            success: true,
            votingPower: result.votingPower,
            hasRecord: result.hasRecord,
            userAddress,
            realmAddress,
            tokenMint
          }
          return jsonResponse(response, 200)
        } catch (error) {
          // If the ongoing request failed, remove it and continue with fresh request
          governanceCache.delete(cacheKey)
        }
      }
    }

    // Create a promise for this request to prevent duplicate requests
    const governancePromise = (async () => {
      // Get RPC URLs for the cluster with fallback options
      const getRpcUrls = (cluster: string): string[] => {
        const urls: string[] = []
        
        if (ctx.env.RPC_URL) {
          // Extract the Helius API key if present
          const heliusApiKeyMatch = ctx.env.RPC_URL.match(/api-key=([^&]+)/)
          const heliusApiKey = heliusApiKeyMatch ? heliusApiKeyMatch[1] : null

          if (heliusApiKey) {
            // Add Helius URLs first (they're usually faster)
            if (cluster === "mainnet") {
              urls.push(`https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`)
            } else {
              urls.push(`https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`)
            }
          } else {
            // Use provided URL as is
            urls.push(getRpcUrlForCluster(ctx.env.RPC_URL, cluster))
          }
        }
        
        // Add fallback RPC endpoints in order of reliability
        if (cluster === "mainnet") {
          // Try faster/more reliable endpoints first
          urls.push("https://solana-api.projectserum.com")
          urls.push("https://api.mainnet-beta.solana.com")
          urls.push("https://rpc.ankr.com/solana")
        } else {
          urls.push("https://api.devnet.solana.com")
        }
        
        return urls
      }

      const rpcUrls = getRpcUrls(cluster)
      let connection: Connection
      let lastError: Error

      // Try each RPC URL until one works
      for (const rpcUrl of rpcUrls) {
        try {
          connection = new Connection(rpcUrl, "confirmed")
          // Test the connection with a simple call and timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('RPC timeout')), 10000)
          )
          await Promise.race([
            connection.getSlot(),
            timeoutPromise
          ])
          break // If successful, break out of the loop
        } catch (error) {
          lastError = error as Error
          // If it's a rate limit error, try the next RPC URL
          if (error.toString().includes('429')) {
            continue
          }
          // For other errors, throw immediately
          throw error
        }
      }

      if (!connection!) {
        throw new Error(`All RPC endpoints failed. Last error: ${lastError?.message}`)
      }

      // Governance program ID
      const governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw")

      // Get user's token owner record
      const userPubkey = new PublicKey(userAddress)
      const realmPubkey = new PublicKey(realmAddress)
      const tokenMintPubkey = new PublicKey(tokenMint)

      // Calculate token owner record PDA
      const [tokenOwnerRecord] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("governance"),
          realmPubkey.toBuffer(),
          tokenMintPubkey.toBuffer(),
          userPubkey.toBuffer()
        ],
        governanceProgramId
      )

      let votingPower = 0
      let hasRecord = false

      try {
        const accountInfo = await retryWithBackoff(() => 
          Promise.race([
            connection.getAccountInfo(tokenOwnerRecord),
            new Promise<never>((_, reject) => 
              setTimeout(() => reject(new Error('Governance data fetch timeout')), 20000)
            )
          ])
        )
        
        if (accountInfo) {
          hasRecord = true
          
          // Parse the token owner record account data
          // TokenOwnerRecord structure (simplified):
          // 0-1: account type
          // 1-33: realm pubkey
          // 33-65: governing token mint pubkey  
          // 65-97: governing token owner pubkey
          // 97-105: governing token deposit amount (u64, little endian)
          
          const data = accountInfo.data
          if (data.length >= 105) {
            // Read the governing token deposit amount (8 bytes at offset 97)
            const depositAmountBuffer = data.slice(97, 105)
            const depositAmount = new BN(depositAmountBuffer, 'le')
            votingPower = depositAmount.toNumber() / 1000000000 // Convert from lamports to tokens
          }
        }
      } catch (error) {
        // If account doesn't exist or rate limited, return zero values
        votingPower = 0
        hasRecord = false
      }

      return { votingPower, hasRecord }
    })()

    // Store the promise in cache to prevent duplicate requests
    governanceCache.set(cacheKey, { 
      votingPower: 0, 
      hasRecord: false,
      timestamp: Date.now(), 
      promise: governancePromise 
    })

    // Wait for the governance data to be fetched
    const result = await governancePromise

    // Update cache with the final result (remove the promise)
    governanceCache.set(cacheKey, { 
      votingPower: result.votingPower, 
      hasRecord: result.hasRecord,
      timestamp: Date.now() 
    })

    const response: GetGovernanceDataResponse = {
      success: true,
      votingPower: result.votingPower,
      hasRecord: result.hasRecord,
      userAddress,
      realmAddress,
      tokenMint
    }

    return jsonResponse(response, 200)

  } catch (e) {
    await reportError(db, e)
    return jsonResponse({ 
      message: "Something went wrong while fetching governance data..." 
    }, 500)
  }
}

export const onRequestOptions: PagesFunction<ENV> = async (ctx) => {
  try {
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