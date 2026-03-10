import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import bs58 from "bs58";
import { getRpcUrlForCluster } from '../../shared/solana/rpcUtils';

type ENV = {
  RPC_URL: string
  PRIVATE_KEY: string
  DB: D1Database
  ADMIN_API_KEY: string
}

interface ClaimAllDbcFeesRequest {
  pool: string // The pool address to claim fees from
  maxBaseAmount?: string // The maximum amount of base tokens to claim (optional, defaults to large amount)
  maxQuoteAmount?: string // The maximum amount of quote tokens to claim (optional, defaults to large amount)
  network?: 'devnet' | 'mainnet' // Network to use (optional, defaults to mainnet)
}

/**
 * Claim all DBC fees from a specific pool
 * 
 * This endpoint claims all available fees from a single DBC pool:
 * 1. Creator trading fees
 * 2. Surplus withdrawal
 * 3. Migration fee withdrawal (if pool has migrated)
 * 
 * @example
 * // Claim all fees from a specific pool
 * POST /api/claimalldbcfees
 * {
 *   "pool": "3GJjQsrnaoaj4Wu82quQ9AxZU29RbCgRajHa3CU8xdBQ",
 *   "maxBaseAmount": "1000000000",
 *   "maxQuoteAmount": "1000000000"
 * }
 * 
 * // Claim with specific network
 * POST /api/claimalldbcfees
 * {
 *   "pool": "3GJjQsrnaoaj4Wu82quQ9AxZU29RbCgRajHa3CU8xdBQ",
 *   "network": "mainnet"
 * }
 */
export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // Check admin authorization
    // const authHeader = ctx.request.headers.get('Authorization')
    // if (authHeader !== ctx.env.ADMIN_API_KEY) {
    //   return jsonResponse({ message: "Unauthorized" }, 401)
    // }

    console.log('Starting DBC fee claim process for specific pool...')

    // Parse request body
    let requestData: ClaimAllDbcFeesRequest;
    try {
      const body = await ctx.request.text();
      if (!body.trim()) {
        return jsonResponse({ 
          error: 'Request body is required',
          success: false 
        }, 400);
      }
      requestData = JSON.parse(body);
    } catch (error) {
      return jsonResponse({ 
        error: 'Invalid JSON in request body',
        success: false 
      }, 400);
    }

    // Validate required parameters
    if (!requestData.pool) {
      return jsonResponse({ 
        error: 'Pool address is required',
        success: false 
      }, 400);
    }

    // Validate pool address format
    try {
      new PublicKey(requestData.pool);
    } catch (error) {
      return jsonResponse({ 
        error: 'Invalid pool address format',
        success: false 
      }, 400);
    }

    // Network selection
    const network = requestData.network || 'mainnet';
    const rpcUrl = getRpcUrlForCluster(ctx.env.RPC_URL, network);
    
    console.log(`Using ${network} network with RPC: ${rpcUrl}`);
    console.log(`Processing pool: ${requestData.pool}`);

    // Initialize connection and DBC client
    const connection = new Connection(rpcUrl, 'confirmed');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Get wallet from private key
    const privateKeyUint8Array = bs58.decode(ctx.env.PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const creatorWallet = wallet.publicKey;

    // Parse amounts (default to large amounts to claim all available fees)
    const maxBaseAmount = new BN(requestData.maxBaseAmount || '1000000000');
    const maxQuoteAmount = new BN(requestData.maxQuoteAmount || '1000000000');

    const poolAddress = new PublicKey(requestData.pool);
    const claims = [];
    let totalClaimed = 0;
    let successfulClaims = 0;
    let failedClaims = 0;

    // Verify pool exists and get pool info
    try {
      const poolAccountInfo = await connection.getAccountInfo(poolAddress);
      if (!poolAccountInfo) {
        return jsonResponse({ 
          error: 'Pool account not found. Please verify the pool address is correct.',
          success: false 
        }, 404);
      }

      console.log("Pool account found, data length:", poolAccountInfo.data.length);
      
      const poolInfo = await client.state.getPool(poolAddress);
      if (!poolInfo) {
        return jsonResponse({ 
          error: 'Invalid pool data structure. This may not be a valid DBC pool address.',
          success: false 
        }, 400);
      }
      
      // Verify the creator is authorized to claim from this pool
      if (!poolInfo.creator.equals(creatorWallet)) {
        return jsonResponse({ 
          error: 'Unauthorized: You are not the creator of this pool',
          expectedCreator: poolInfo.creator.toBase58(),
          providedWallet: creatorWallet.toBase58(),
          success: false 
        }, 403);
      }
      
      console.log("Pool creator verified:", poolInfo.creator.toBase58());
      console.log("Pool migration status:", poolInfo.isMigrated);
    } catch (error) {
      console.error("Error fetching pool info:", error);
      return jsonResponse({ 
        error: 'Failed to fetch pool information',
        success: false 
      }, 500);
    }

    // 1. Claim creator trading fees
    try {
      console.log(`🎯 Claiming creator trading fees for pool ${requestData.pool}...`);
      
      const creatorClaimTx = await client.creator.claimCreatorTradingFee({
        creator: creatorWallet,
        payer: creatorWallet,
        pool: poolAddress,
        maxBaseAmount: maxBaseAmount,
        maxQuoteAmount: maxQuoteAmount,
        receiver: creatorWallet,
      });

      // Set transaction blockhash and fee payer
      const { blockhash: creatorBlockhash } = await connection.getLatestBlockhash();
      creatorClaimTx.feePayer = creatorWallet;
      creatorClaimTx.recentBlockhash = creatorBlockhash;
      
      // Sign the transaction
      creatorClaimTx.sign(wallet);

      // Send transaction
      const creatorTxSignature = await connection.sendRawTransaction(creatorClaimTx.serialize(), { 
        skipPreflight: false, 
        preflightCommitment: 'confirmed' 
      });

      console.log(`✅ Successfully claimed DBC creator fees: ${creatorTxSignature}`);
      
      claims.push({
        type: 'creator_trading_fee',
        txSignature: creatorTxSignature,
        maxBaseAmount: maxBaseAmount.toString(),
        maxQuoteAmount: maxQuoteAmount.toString(),
        status: 'success'
      });
      
      successfulClaims++;
      totalClaimed += maxBaseAmount.toNumber();

      // Add delay between claims
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (creatorError) {
      console.error(`❌ Failed to claim creator fees:`, creatorError);
      failedClaims++;
      
      // Extract error message from the error object
      let errorMessage = 'Unknown error';
      if (creatorError instanceof Error) {
        errorMessage = creatorError.message;
        // Try to extract more specific error from transaction logs
        if ('transactionLogs' in creatorError) {
          const logs = (creatorError as any).transactionLogs;
          const errorLog = logs?.find((log: string) => log.includes('Error Message:'));
          if (errorLog) {
            errorMessage = errorLog.split('Error Message:')[1]?.trim() || errorMessage;
          }
        }
      }
      
      claims.push({
        type: 'creator_trading_fee',
        status: 'failed',
        error: errorMessage,
        maxBaseAmount: maxBaseAmount.toString(),
        maxQuoteAmount: maxQuoteAmount.toString()
      });
    }

    // 2. Withdraw surplus
    try {
      console.log(`🎯 Withdrawing surplus for pool ${requestData.pool}...`);
      
      const surplusTx = await client.creator.creatorWithdrawSurplus({
        creator: creatorWallet,
        virtualPool: poolAddress,
      });

      // Set transaction blockhash and fee payer
      const { blockhash: surplusBlockhash } = await connection.getLatestBlockhash();
      surplusTx.feePayer = creatorWallet;
      surplusTx.recentBlockhash = surplusBlockhash;
      
      // Sign the transaction
      surplusTx.sign(wallet);

      // Send transaction
      const surplusTxSignature = await connection.sendRawTransaction(surplusTx.serialize(), { 
        skipPreflight: false, 
        preflightCommitment: 'confirmed' 
      });

      console.log(`✅ Successfully withdrew surplus: ${surplusTxSignature}`);
      
      claims.push({
        type: 'surplus_withdrawal',
        txSignature: surplusTxSignature,
        status: 'success'
      });
      
      successfulClaims++;

      // Add delay between claims
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (surplusError) {
      console.error(`❌ Failed to withdraw surplus:`, surplusError);
      failedClaims++;
      
      // Extract error message from the error object
      let errorMessage = 'Unknown error';
      if (surplusError instanceof Error) {
        errorMessage = surplusError.message;
        // Try to extract more specific error from transaction logs
        if ('transactionLogs' in surplusError) {
          const logs = (surplusError as any).transactionLogs;
          const errorLog = logs?.find((log: string) => log.includes('Error Message:'));
          if (errorLog) {
            errorMessage = errorLog.split('Error Message:')[1]?.trim() || errorMessage;
          }
        }
      }
      
      claims.push({
        type: 'surplus_withdrawal',
        status: 'failed',
        error: errorMessage
      });
    }

    // 3. Withdraw migration fee (only if pool has migrated)
    try {
      const poolInfo = await client.state.getPool(poolAddress);
      if (poolInfo.isMigrated) {
        console.log(`🎯 Withdrawing migration fee for pool ${requestData.pool}...`);
        
        const migrationTx = await client.creator.creatorWithdrawMigrationFee({
          virtualPool: poolAddress,
          sender: creatorWallet,
          feePayer: creatorWallet,
        });

        // Set transaction blockhash and fee payer
        const { blockhash: migrationBlockhash } = await connection.getLatestBlockhash();
        migrationTx.feePayer = creatorWallet;
        migrationTx.recentBlockhash = migrationBlockhash;
        
        // Sign the transaction
        migrationTx.sign(wallet);

        // Send transaction
        const migrationTxSignature = await connection.sendRawTransaction(migrationTx.serialize(), { 
          skipPreflight: false, 
          preflightCommitment: 'confirmed' 
        });

        console.log(`✅ Successfully withdrew migration fee: ${migrationTxSignature}`);
        
        claims.push({
          type: 'migration_fee_withdrawal',
          txSignature: migrationTxSignature,
          status: 'success'
        });
        
        successfulClaims++;
      } else {
        console.log(`⏭️ Skipping migration fee withdrawal - pool has not migrated yet`);
        claims.push({
          type: 'migration_fee_withdrawal',
          status: 'skipped',
          reason: 'Pool has not migrated yet'
        });
      }

    } catch (migrationError) {
      console.error(`❌ Failed to withdraw migration fee:`, migrationError);
      failedClaims++;
      
      // Extract error message from the error object
      let errorMessage = 'Unknown error';
      if (migrationError instanceof Error) {
        errorMessage = migrationError.message;
        // Try to extract more specific error from transaction logs
        if ('transactionLogs' in migrationError) {
          const logs = (migrationError as any).transactionLogs;
          const errorLog = logs?.find((log: string) => log.includes('Error Message:'));
          if (errorLog) {
            errorMessage = errorLog.split('Error Message:')[1]?.trim() || errorMessage;
          }
        }
      }
      
      claims.push({
        type: 'migration_fee_withdrawal',
        status: 'failed',
        error: errorMessage
      });
    }

    console.log(`\nDBC fee claim process completed for pool ${requestData.pool}:`);
    console.log(`- Successful claims: ${successfulClaims}`);
    console.log(`- Failed claims: ${failedClaims}`);
    console.log(`- Total claimed: ${totalClaimed}`);

    return jsonResponse({
      success: true,
      poolAddress: requestData.pool,
      creatorWallet: creatorWallet.toBase58(),
      summary: {
        successfulClaims,
        failedClaims,
        totalClaimed
      },
      claims,
      network,
      rpcUrl
    }, 200);

  } catch (e) {
    console.error('DBC fee claim error:', e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ 
      error: e instanceof Error ? e.message : 'Unknown error',
      success: false 
    }, 500);
  }
} 