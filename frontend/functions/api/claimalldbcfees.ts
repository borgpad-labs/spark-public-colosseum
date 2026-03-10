import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import bs58 from "bs58";
import { getRpcUrlForCluster } from '../../shared/solana/rpcUtils';

type ENV = {
  RPC_URL: string
  RPC_URL2: string
  RPC_URL3: string
  RPC_URL4: string
  RPC_URL5: string
  PRIVATE_KEY: string
  DB: D1Database
  ADMIN_API_KEY: string
}

interface ClaimAllDbcFeesRequest {
  maxBaseAmount?: string // The maximum amount of base tokens to claim (optional, defaults to large amount)
  maxQuoteAmount?: string // The maximum amount of quote tokens to claim (optional, defaults to large amount)
  network?: 'devnet' | 'mainnet' // Network to use (optional, defaults to mainnet)
  batchSize?: number // Number of pools to process in parallel (optional, defaults to 5)
  maxPools?: number // Maximum number of pools to process (optional, defaults to all)
}

interface PoolInfo {
  mint: string;
  name: string;
  dbc_pool_address: string;
  created_at: string;
  twitter_account: string;
}

/**
 * Claim all DBC fees from all pools in the database
 * 
 * This endpoint claims all available fees from all DBC pools in the database:
 * 1. Creator trading fees
 * 2. Surplus withdrawal
 * 3. Migration fee withdrawal (if pool has migrated)
 * 
 * @example
 * // Claim all fees from all pools
 * POST /api/claimalldbcfees
 * {
 *   "maxBaseAmount": "1000000000",
 *   "maxQuoteAmount": "1000000000"
 * }
 * 
 * // Claim with specific network and batch size
 * POST /api/claimalldbcfees
 * {
 *   "network": "mainnet",
 *   "batchSize": 10,
 *   "maxPools": 50
 * }
 */
export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // Check admin authorization
    // const authHeader = ctx.request.headers.get('Authorization')
    // if (authHeader !== ctx.env.ADMIN_API_KEY) {
    //   return jsonResponse({ message: "Unauthorized" }, 401)
    // }

    console.log('Starting DBC fee claim process for all pools...')

    // Parse request body
    let requestData: ClaimAllDbcFeesRequest = {};
    try {
      const body = await ctx.request.text();
      if (body.trim()) {
        requestData = JSON.parse(body);
      }
    } catch (error) {
      return jsonResponse({ 
        error: 'Invalid JSON in request body',
        success: false 
      }, 400);
    }

    // Network selection
    const network = requestData.network || 'mainnet';
    const rpcUrl = getRpcUrlForCluster(ctx.env.RPC_URL, network);
    
    console.log(`Using ${network} network with RPC: ${rpcUrl}`);

    // Create multiple connections for load balancing
    const connections = [
      new Connection(ctx.env.RPC_URL, 'confirmed'),
      new Connection(ctx.env.RPC_URL2, 'confirmed'),
      new Connection(ctx.env.RPC_URL3, 'confirmed'),
      new Connection(ctx.env.RPC_URL4, 'confirmed'),
      new Connection(ctx.env.RPC_URL5, 'confirmed')
    ];

    // Function to get a connection with round-robin load balancing
    let connectionIndex = 0;
    const getConnection = () => {
      const conn = connections[connectionIndex];
      connectionIndex = (connectionIndex + 1) % connections.length;
      return conn;
    };

    // Initialize DBC client with primary connection
    const connection = new Connection(rpcUrl, 'confirmed');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Get wallet from private key
    const privateKeyUint8Array = bs58.decode(ctx.env.PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const creatorWallet = wallet.publicKey;

    console.log(`Creator wallet: ${creatorWallet.toBase58()}`);

    // Parse amounts (default to large amounts to claim all available fees)
    const maxBaseAmount = new BN(requestData.maxBaseAmount || '1000000000');
    const maxQuoteAmount = new BN(requestData.maxQuoteAmount || '1000000000');
    const batchSize = requestData.batchSize || 5;
    const maxPools = requestData.maxPools || 1000; // Default to process all pools

    // Fetch all pools from database
    console.log('Fetching all pools from database...');
    const poolsQuery = await ctx.env.DB
      .prepare(`
        SELECT mint, name, dbc_pool_address, created_at, twitter_account 
        FROM tokens 
        WHERE dbc_pool_address IS NOT NULL 
        AND dbc_pool_address != ''
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .bind(maxPools)
      .all();

    if (!poolsQuery.success) {
      return jsonResponse({ 
        error: 'Failed to fetch pools from database',
        success: false 
      }, 500);
    }

    const pools: PoolInfo[] = poolsQuery.results as unknown as PoolInfo[];
    console.log(`Found ${pools.length} pools to process`);

    if (pools.length === 0) {
      return jsonResponse({ 
        message: 'No pools found in database',
        success: true,
        summary: {
          totalPools: 0,
          successfulClaims: 0,
          failedClaims: 0,
          totalClaimed: 0
        },
        claims: []
      }, 200);
    }

    // Process pools in batches
    const batches = [];
    for (let i = 0; i < pools.length; i += batchSize) {
      batches.push(pools.slice(i, i + batchSize));
    }

    console.log(`Processing ${pools.length} pools in ${batches.length} batches of ${batchSize}`);

    const allClaims = [];
    let totalSuccessfulClaims = 0;
    let totalFailedClaims = 0;
    let totalClaimed = 0;
    let processedPools = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} pools)`);

      // Process batch pools in parallel
      const batchPromises = batch.map(async (pool, index) => {
        const globalIndex = batchIndex * batchSize + index;
        const poolConnection = getConnection();
        
        console.log(`🎯 Processing pool ${globalIndex + 1}/${pools.length}: ${pool.name} (${pool.mint})`);
        console.log(`   Pool address: ${pool.dbc_pool_address}`);
        console.log(`   Using RPC connection ${connectionIndex === 0 ? 5 : connectionIndex}`);

        const poolClaims = [];
        let poolSuccessfulClaims = 0;
        let poolFailedClaims = 0;
        let poolClaimed = 0;

        try {
          const poolAddress = new PublicKey(pool.dbc_pool_address);

          // Verify pool exists and get pool info
          const poolAccountInfo = await poolConnection.getAccountInfo(poolAddress);
          if (!poolAccountInfo) {
            console.log(`⚠️ Pool account not found: ${pool.dbc_pool_address}`);
            return {
              pool: pool,
              claims: [{
                type: 'pool_verification',
                status: 'failed',
                error: 'Pool account not found'
              }],
              summary: {
                successfulClaims: 0,
                failedClaims: 1,
                totalClaimed: 0
              }
            };
          }

          const poolInfo = await client.state.getPool(poolAddress);
          if (!poolInfo) {
            console.log(`⚠️ Invalid pool data structure: ${pool.dbc_pool_address}`);
            return {
              pool: pool,
              claims: [{
                type: 'pool_verification',
                status: 'failed',
                error: 'Invalid pool data structure'
              }],
              summary: {
                successfulClaims: 0,
                failedClaims: 1,
                totalClaimed: 0
              }
            };
          }

          // Verify the creator is authorized to claim from this pool
          if (!poolInfo.creator.equals(creatorWallet)) {
            console.log(`⚠️ Unauthorized: Not the creator of pool ${pool.dbc_pool_address}`);
            console.log(`   Expected creator: ${poolInfo.creator.toBase58()}`);
            console.log(`   Provided wallet: ${creatorWallet.toBase58()}`);
            return {
              pool: pool,
              claims: [{
                type: 'authorization',
                status: 'failed',
                error: 'Not the creator of this pool',
                expectedCreator: poolInfo.creator.toBase58(),
                providedWallet: creatorWallet.toBase58()
              }],
              summary: {
                successfulClaims: 0,
                failedClaims: 1,
                totalClaimed: 0
              }
            };
          }

          console.log(`✅ Pool verified: ${pool.name} (Creator: ${poolInfo.creator.toBase58()})`);

          // 1. Claim creator trading fees
          try {
            console.log(`🎯 Claiming creator trading fees for ${pool.name}...`);
            
            const creatorClaimTx = await client.creator.claimCreatorTradingFee({
              creator: creatorWallet,
              payer: creatorWallet,
              pool: poolAddress,
              maxBaseAmount: maxBaseAmount,
              maxQuoteAmount: maxQuoteAmount,
              receiver: creatorWallet,
            });

            // Set transaction blockhash and fee payer
            const { blockhash: creatorBlockhash } = await poolConnection.getLatestBlockhash();
            creatorClaimTx.feePayer = creatorWallet;
            creatorClaimTx.recentBlockhash = creatorBlockhash;
            
            // Sign the transaction
            creatorClaimTx.sign(wallet);

            // Send transaction
            const creatorTxSignature = await poolConnection.sendRawTransaction(creatorClaimTx.serialize(), { 
              skipPreflight: false, 
              preflightCommitment: 'confirmed' 
            });

            console.log(`✅ Successfully claimed creator fees: ${creatorTxSignature}`);
            
            poolClaims.push({
              type: 'creator_trading_fee',
              txSignature: creatorTxSignature,
              maxBaseAmount: maxBaseAmount.toString(),
              maxQuoteAmount: maxQuoteAmount.toString(),
              status: 'success'
            });
            
            poolSuccessfulClaims++;
            poolClaimed += maxBaseAmount.toNumber();

            // Add delay between claims
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (creatorError) {
            console.error(`❌ Failed to claim creator fees for ${pool.name}:`, creatorError);
            poolFailedClaims++;
            
            let errorMessage = 'Unknown error';
            if (creatorError instanceof Error) {
              errorMessage = creatorError.message;
            }
            
            poolClaims.push({
              type: 'creator_trading_fee',
              status: 'failed',
              error: errorMessage,
              maxBaseAmount: maxBaseAmount.toString(),
              maxQuoteAmount: maxQuoteAmount.toString()
            });
          }

          // 2. Withdraw surplus
          try {
            console.log(`🎯 Withdrawing surplus for ${pool.name}...`);
            
            const surplusTx = await client.creator.creatorWithdrawSurplus({
              creator: creatorWallet,
              virtualPool: poolAddress,
            });

            // Set transaction blockhash and fee payer
            const { blockhash: surplusBlockhash } = await poolConnection.getLatestBlockhash();
            surplusTx.feePayer = creatorWallet;
            surplusTx.recentBlockhash = surplusBlockhash;
            
            // Sign the transaction
            surplusTx.sign(wallet);

            // Send transaction
            const surplusTxSignature = await poolConnection.sendRawTransaction(surplusTx.serialize(), { 
              skipPreflight: false, 
              preflightCommitment: 'confirmed' 
            });

            console.log(`✅ Successfully withdrew surplus: ${surplusTxSignature}`);
            
            poolClaims.push({
              type: 'surplus_withdrawal',
              txSignature: surplusTxSignature,
              status: 'success'
            });
            
            poolSuccessfulClaims++;

            // Add delay between claims
            await new Promise(resolve => setTimeout(resolve, 500));

          } catch (surplusError) {
            console.error(`❌ Failed to withdraw surplus for ${pool.name}:`, surplusError);
            poolFailedClaims++;
            
            let errorMessage = 'Unknown error';
            if (surplusError instanceof Error) {
              errorMessage = surplusError.message;
            }
            
            poolClaims.push({
              type: 'surplus_withdrawal',
              status: 'failed',
              error: errorMessage
            });
          }

          // 3. Withdraw migration fee (only if pool has migrated)
          try {
            if (poolInfo.isMigrated) {
              console.log(`🎯 Withdrawing migration fee for ${pool.name}...`);
              
              const migrationTx = await client.creator.creatorWithdrawMigrationFee({
                virtualPool: poolAddress,
                sender: creatorWallet,
                feePayer: creatorWallet,
              });

              // Set transaction blockhash and fee payer
              const { blockhash: migrationBlockhash } = await poolConnection.getLatestBlockhash();
              migrationTx.feePayer = creatorWallet;
              migrationTx.recentBlockhash = migrationBlockhash;
              
              // Sign the transaction
              migrationTx.sign(wallet);

              // Send transaction
              const migrationTxSignature = await poolConnection.sendRawTransaction(migrationTx.serialize(), { 
                skipPreflight: false, 
                preflightCommitment: 'confirmed' 
              });

              console.log(`✅ Successfully withdrew migration fee: ${migrationTxSignature}`);
              
              poolClaims.push({
                type: 'migration_fee_withdrawal',
                txSignature: migrationTxSignature,
                status: 'success'
              });
              
              poolSuccessfulClaims++;

              // Add delay between claims
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              console.log(`⏭️ Skipping migration fee withdrawal for ${pool.name} - pool has not migrated yet`);
              poolClaims.push({
                type: 'migration_fee_withdrawal',
                status: 'skipped',
                reason: 'Pool has not migrated yet'
              });
            }

          } catch (migrationError) {
            console.error(`❌ Failed to withdraw migration fee for ${pool.name}:`, migrationError);
            poolFailedClaims++;
            
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
            
            poolClaims.push({
              type: 'migration_fee_withdrawal',
              status: 'failed',
              error: errorMessage
            });
          }

        } catch (poolError) {
          console.error(`❌ Failed to process pool ${pool.name}:`, poolError);
          poolFailedClaims++;
          
          let errorMessage = 'Unknown error';
          if (poolError instanceof Error) {
            errorMessage = poolError.message;
          }
          
          poolClaims.push({
            type: 'pool_processing',
            status: 'failed',
            error: errorMessage
          });
        }

        return {
          pool: pool,
          claims: poolClaims,
          summary: {
            successfulClaims: poolSuccessfulClaims,
            failedClaims: poolFailedClaims,
            totalClaimed: poolClaimed
          }
        };
      });

      const batchResults = await Promise.all(batchPromises);
      
      // Aggregate results
      for (const result of batchResults) {
        allClaims.push(result);
        totalSuccessfulClaims += result.summary.successfulClaims;
        totalFailedClaims += result.summary.failedClaims;
        totalClaimed += result.summary.totalClaimed;
        processedPools++;
      }

      // Add delay between batches
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting 1 second before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`\n🎉 DBC fee claim process completed for all pools:`);
    console.log(`- Total pools processed: ${processedPools}`);
    console.log(`- Successful claims: ${totalSuccessfulClaims}`);
    console.log(`- Failed claims: ${totalFailedClaims}`);
    console.log(`- Total claimed: ${totalClaimed}`);

    return jsonResponse({
      success: true,
      creatorWallet: creatorWallet.toBase58(),
      summary: {
        totalPools: pools.length,
        processedPools: processedPools,
        successfulClaims: totalSuccessfulClaims,
        failedClaims: totalFailedClaims,
        totalClaimed: totalClaimed
      },
      claims: allClaims,
      network,
      rpcUrl,
      batchSize
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
