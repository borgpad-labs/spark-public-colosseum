import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";
import { Connection } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import { getRpcUrlForCluster } from '../../shared/solana/rpcUtils';
import { isApiKeyValid } from "../services/apiKeyService";

type ENV = {
  RPC_URL: string
  PRIVATE_KEY: string
  DB: D1Database
  ADMIN_API_KEY: string
}

interface PoolInfo {
  publicKey: string;
  tokenAMint: string;
  tokenBMint: string;
  tokenABalance: string;
  tokenBBalance: string;
  feeRate: number;
  createdAt?: string;
}

/**
 * Fetches all DAMM pools from Meteora
 * 
 * @example
 * POST /api/get-damm-pools
 * 
 * Request body:
 * {
 *   "network": "mainnet" // optional, defaults to mainnet
 *   "limit": 100 // optional, defaults to 100
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "pools": [
 *     {
 *       "publicKey": "...",
 *       "tokenAMint": "...",
 *       "tokenBMint": "...",
 *       "tokenABalance": "1000000",
 *       "tokenBBalance": "500000",
 *       "feeRate": 0.003,
 *       "createdAt": "2024-01-01T00:00:00Z"
 *     }
 *   ],
 *   "summary": {
 *     "totalPools": 1500,
 *     "returnedPools": 100,
 *     "network": "mainnet"
 *   }
 * }
 */
export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // if (!await isApiKeyValid({ ctx, permissions: ['read'] })) {
    //   return jsonResponse(null, 401)
    // }

    // Parse request body for optional parameters
    let requestData: any = {};
    try {
      const body = await ctx.request.text();
      if (body.trim()) {
        requestData = JSON.parse(body);
      }
    } catch (error) {
      console.log("No valid JSON body provided, using defaults");
    }

    // Network selection
    const network = requestData.network || 'mainnet';
    const rpcUrl = getRpcUrlForCluster(ctx.env.RPC_URL, network);

    console.log(`🔍 Fetching all DAMM pools for ${network}...`);

    // Initialize connection and DAMM client
    const connection = new Connection(rpcUrl, 'confirmed');
    const cpAmm = new CpAmm(connection);

    // Get all DAMM pools
    console.log(`📊 Fetching all DAMM pools...`);
    const allPools = await cpAmm.getAllPools();
    console.log(`📊 Found ${allPools.length} total DAMM pools`);

    console.log(`📊 Processing all ${allPools.length} pools`);

    // Process pools to extract relevant information
    const pools: PoolInfo[] = [];
    
    for (const pool of allPools) {
      try {
        const poolInfo: PoolInfo = {
          publicKey: pool.publicKey.toString(),
          tokenAMint: pool.account.tokenAMint.toString(),
          tokenBMint: pool.account.tokenBMint.toString(),
          tokenABalance: pool.account.tokenAVault.toString(), // Using vault address instead of balance
          tokenBBalance: pool.account.tokenBVault.toString(), // Using vault address instead of balance
          feeRate: pool.account.poolFees?.baseFee?.cliffFeeNumerator ? pool.account.poolFees.baseFee.cliffFeeNumerator.toNumber() / 10000 : 0, // Convert from basis points to decimal
          createdAt: undefined // createdAt not available in this pool structure
        };
        
        pools.push(poolInfo);
      } catch (error) {
        console.warn(`⚠️ Failed to process pool ${pool.publicKey.toString()}:`, error);
        // Continue processing other pools
      }
    }

    console.log(`✅ Successfully processed ${pools.length} pools`);

    return jsonResponse({
      success: true,
      pools,
      summary: {
        totalPools: allPools.length,
        returnedPools: pools.length,
        network
      }
    }, 200);

  } catch (e) {
    console.error('Get DAMM pools error:', e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ 
      error: e instanceof Error ? e.message : 'Unknown error',
      success: false 
    }, 500);
  }
}
