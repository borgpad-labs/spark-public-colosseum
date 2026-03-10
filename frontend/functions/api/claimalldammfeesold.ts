import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';
import bs58 from "bs58";
import { getRpcUrlForCluster } from '../../shared/solana/rpcUtils';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { isApiKeyValid } from "../services/apiKeyService";

type ENV = {
  RPC_URL: string
  PRIVATE_KEY: string
  DB: D1Database
  ADMIN_API_KEY: string
}

interface ClaimedPool {
  mint: string;
  name: string;
  poolAddress: string;
  partnerTxHash?: string;
  positionTxHash?: string;
  success: boolean;
  feesClaimed: number;
}

// Fee distribution addresses
const FEE_DISTRIBUTION_ADDRESSES = {
  POOL_TRADERS: '9tXUeLqQ5FDSqbT98EEReBu9f5BU5UsV6FqEuXRLxGM1',
  PARRAIN: 'FSKWpwNRi6ruzJ6zzU5kCSkfSXxS5GjZCDUreDL3MMx8',
  VOTANTS_SPARK: '5Cxp3LwQbnPhcZr6i9jkHrSPYTfVdwSBbQvhmqmdexpx',
  DAO_SPARK: '58UMDUdSLLqEkLAJMEJ7juoTxn5CFFXPD7rWuiruAfnZ',
  LAUNCHER: 'FeesnLL2qR1thmWhwRVAYta5cjeqYHwNP1i18GtHDkXj'
};

// Fee distribution percentages (in basis points - 100 = 1%)
const FEE_DISTRIBUTION_PERCENTAGES = {
  POOL_TRADERS: 500,      // 5%
  PARRAIN: 500,           // 5%
  VOTANTS_SPARK: 500,     // 5%
  DAO_SPARK: 3500,        // 35%
  LAUNCHER: 500,          // 5%
  TREASURY: 4500          // 45% (remaining)
};

interface FeeDistribution {
  address: string;
  percentage: number;
  amount: number;
  txSignature?: string;
}

/**
 * Distributes claimed fees to different addresses according to specified percentages
 */
async function distributeFees(
  connection: Connection,
  wallet: Keypair,
  totalClaimedAmount: number,
  dao_treasury: string | null,
  tokenName: string
): Promise<FeeDistribution[]> {
  const distributions: FeeDistribution[] = [];
  
  // Calculate amounts for each distribution
  const poolTradersAmount = (totalClaimedAmount * FEE_DISTRIBUTION_PERCENTAGES.POOL_TRADERS) / 10000;
  const parrainAmount = (totalClaimedAmount * FEE_DISTRIBUTION_PERCENTAGES.PARRAIN) / 10000;
  const votantsSparkAmount = (totalClaimedAmount * FEE_DISTRIBUTION_PERCENTAGES.VOTANTS_SPARK) / 10000;
  const daoSparkAmount = (totalClaimedAmount * FEE_DISTRIBUTION_PERCENTAGES.DAO_SPARK) / 10000;
  const launcherAmount = (totalClaimedAmount * FEE_DISTRIBUTION_PERCENTAGES.LAUNCHER) / 10000;
  const treasuryAmount = (totalClaimedAmount * FEE_DISTRIBUTION_PERCENTAGES.TREASURY) / 10000;
  
  // Check if we have enough tokens to distribute (minimum 0.001 tokens)
  if (totalClaimedAmount < 0.001) {
    return [];
  }
  
  // Distribute to Pool Traders
  if (poolTradersAmount > 0) {
    try {
      const poolTradersTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(FEE_DISTRIBUTION_ADDRESSES.POOL_TRADERS),
          lamports: Math.floor(poolTradersAmount * LAMPORTS_PER_SOL) + 2039280
        })
      );
      
      const { blockhash } = await connection.getLatestBlockhash();
      poolTradersTx.recentBlockhash = blockhash;
      poolTradersTx.feePayer = wallet.publicKey;
      
      poolTradersTx.sign(wallet);
      const txSignature = await connection.sendRawTransaction(poolTradersTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      distributions.push({
        address: FEE_DISTRIBUTION_ADDRESSES.POOL_TRADERS,
        percentage: 5,
        amount: poolTradersAmount,
        txSignature
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to send to Pool Traders:`, error);
    }
  }
  
  // Distribute to Parrain
  if (parrainAmount > 0) {
    try {
      const parrainTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(FEE_DISTRIBUTION_ADDRESSES.PARRAIN),
          lamports: Math.floor(parrainAmount * LAMPORTS_PER_SOL) + 2039280
        })
      );
      
      const { blockhash } = await connection.getLatestBlockhash();
      parrainTx.recentBlockhash = blockhash;
      parrainTx.feePayer = wallet.publicKey;
      
      parrainTx.sign(wallet);
      const txSignature = await connection.sendRawTransaction(parrainTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      distributions.push({
        address: FEE_DISTRIBUTION_ADDRESSES.PARRAIN,
        percentage: 5,
        amount: parrainAmount,
        txSignature
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to send to Parrain:`, error);
    }
  }
  
  // Distribute to Votants Spark
  if (votantsSparkAmount > 0) {
    try {
      const votantsSparkTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(FEE_DISTRIBUTION_ADDRESSES.VOTANTS_SPARK),
          lamports: Math.floor(votantsSparkAmount * LAMPORTS_PER_SOL) + 2039280
        })
      );
      
      const { blockhash } = await connection.getLatestBlockhash();
      votantsSparkTx.recentBlockhash = blockhash;
      votantsSparkTx.feePayer = wallet.publicKey;
      
      votantsSparkTx.sign(wallet);
      const txSignature = await connection.sendRawTransaction(votantsSparkTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      distributions.push({
        address: FEE_DISTRIBUTION_ADDRESSES.VOTANTS_SPARK,
        percentage: 5,
        amount: votantsSparkAmount,
        txSignature
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to send to Votants Spark:`, error);
    }
  }
  
  // Distribute to DAO Spark
  if (daoSparkAmount > 0) {
    try {
      const daoSparkTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(FEE_DISTRIBUTION_ADDRESSES.DAO_SPARK),
          lamports: Math.floor(daoSparkAmount * LAMPORTS_PER_SOL) + 2039280
        })
      );
      
      const { blockhash } = await connection.getLatestBlockhash();
      daoSparkTx.recentBlockhash = blockhash;
      daoSparkTx.feePayer = wallet.publicKey;
      
      daoSparkTx.sign(wallet);
      const txSignature = await connection.sendRawTransaction(daoSparkTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      distributions.push({
        address: FEE_DISTRIBUTION_ADDRESSES.DAO_SPARK,
        percentage: 35,
        amount: daoSparkAmount,
        txSignature
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to send to DAO Spark:`, error);
    }
  }
  
  // Distribute to Launcher
  if (launcherAmount > 0) {
    try {
      const launcherTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(FEE_DISTRIBUTION_ADDRESSES.LAUNCHER),
          lamports: Math.floor(launcherAmount * LAMPORTS_PER_SOL) + 2039280
        })
      );
      
      const { blockhash } = await connection.getLatestBlockhash();
      launcherTx.recentBlockhash = blockhash;
      launcherTx.feePayer = wallet.publicKey;
      
      launcherTx.sign(wallet);
      const txSignature = await connection.sendRawTransaction(launcherTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      distributions.push({
        address: FEE_DISTRIBUTION_ADDRESSES.LAUNCHER,
        percentage: 5,
        amount: launcherAmount,
        txSignature
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to send to Launcher:`, error);
    }
  }
  
  // Distribute to Treasury (if dao_treasury is available)
  if (treasuryAmount > 0 && dao_treasury) {
    try {
      const treasuryTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(dao_treasury),
          lamports: Math.floor(treasuryAmount * LAMPORTS_PER_SOL) + 2039280
        })
      );
      
      const { blockhash } = await connection.getLatestBlockhash();
      treasuryTx.recentBlockhash = blockhash;
      treasuryTx.feePayer = wallet.publicKey;
      
      treasuryTx.sign(wallet);
      const txSignature = await connection.sendRawTransaction(treasuryTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });
      
      distributions.push({
        address: dao_treasury,
        percentage: 45,
        amount: treasuryAmount,
        txSignature
      });
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.error(`❌ Failed to send to Treasury:`, error);
    }
  }
  
  return distributions;
}

/**
 * Claims partner fees for tokens that have a DAMM pool address in the database
 */
export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
      return jsonResponse(null, 401)
    }

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

    console.log(`🚀 Starting DAMM fee claim process for ${network}...`);

    // Initialize connection and DAMM client
    const connection = new Connection(rpcUrl, 'confirmed');
    
    // Get wallet from private key
    const privateKeyUint8Array = bs58.decode(ctx.env.PRIVATE_KEY);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const creatorWallet = wallet.publicKey;

    // Initialize DAMM client
    const cpAmm = new CpAmm(connection);

    // Get all tokens with DAO and DAMM pool address from database
    const tokensResult = await ctx.env.DB
      .prepare(`
        SELECT mint, name, twitter_account, dao, dao_treasury, damm_pool_address 
        FROM tokens 
        WHERE mint IS NOT NULL AND mint != '' AND dao IS NOT NULL AND dao != '' AND damm_pool_address IS NOT NULL AND damm_pool_address != ''
      `)
      .all();

    if (!tokensResult.results || tokensResult.results.length === 0) {
      return jsonResponse({
        error: 'No tokens with DAO and DAMM pool address found in database',
        success: false
      }, 400);
    }

    console.log(`📊 Found ${tokensResult.results.length} tokens with DAO and DAMM pool address in database`);

    // Initialize tracking variables
    let successfulClaims = 0;
    let failedClaims = 0;
    let totalClaimed = 0;
    const claimedPools: ClaimedPool[] = [];
    const allFeeDistributions: Array<{
      tokenMint: string;
      tokenName: string;
      totalClaimed: number;
      distributions: FeeDistribution[];
    }> = [];

    // Process each token
    for (const token of tokensResult.results as any[]) {
      console.log(`🎯 Processing token: ${token.name} (${token.mint})`);
      
      // Get the specific pool address for this token
      const poolAddress = token.damm_pool_address as string;
      if (!poolAddress) {
        console.log(`⚠️ No DAMM pool address found for token ${token.name}, skipping`);
        continue;
      }

      // Validate pool address
      try {
        new PublicKey(poolAddress);
      } catch (error) {
        console.log(`⚠️ Invalid pool address ${poolAddress} for token ${token.name}, skipping`);
        continue;
      }

      // Initialize token-level tracking
      let tokenTotalClaimed = 0;
      let partnerTxSignature = null;
      let positionTxSignature = null;

      try {
        // Get pool state
        const poolPublicKey = new PublicKey(poolAddress);
        const poolState = await cpAmm.fetchPoolState(poolPublicKey);
        
        console.log(`🔍 Processing pool ${poolAddress} for token ${token.name}`);

        // Set maximum amounts to claim
        const maxAmountA = new BN(1_000_000_000); // 1,000 tokens
        const maxAmountB = new BN(1_000_000_000); // 1,000 tokens

        // Claim partner fees
        try {
          console.log(`🎯 Claiming partner fees for pool ${poolAddress}...`);
          
          const claimPartnerFeeTx = await cpAmm.claimPartnerFee({
            partner: creatorWallet,
            pool: poolPublicKey,
            maxAmountA: maxAmountA,
            maxAmountB: maxAmountB,
          });

          const { blockhash } = await connection.getLatestBlockhash();
          claimPartnerFeeTx.recentBlockhash = blockhash;
          claimPartnerFeeTx.feePayer = creatorWallet;

          claimPartnerFeeTx.sign(wallet);
          const txSignature = await connection.sendRawTransaction(claimPartnerFeeTx.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          });

          console.log(`✅ Successfully claimed DAMM partner fees for pool ${poolAddress}: ${txSignature}`);
          
          // Wait 2 seconds for transaction to be indexed
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // For simplicity, assume a small amount was claimed
          const actualClaimedAmount = 0.001; // Conservative estimate
          tokenTotalClaimed += actualClaimedAmount;
          partnerTxSignature = txSignature;
          successfulClaims++;

        } catch (partnerError) {
          console.error(`❌ Failed to claim partner fees for pool ${poolAddress}:`, partnerError);
          failedClaims++;
        }

        // Claim position fees
        try {
          console.log(`🎯 Claiming position fees for pool ${poolAddress}...`);
          
          // Get positions for this pool owned by our wallet
          const positions = await cpAmm.getPositionsByUser(creatorWallet);
          const poolPositions = positions.filter(pos => pos.positionState.pool.toString() === poolPublicKey.toString());
          
          if (poolPositions.length > 0) {
            console.log(`📊 Found ${poolPositions.length} positions for pool ${poolAddress}`);
            
            for (const position of poolPositions) {
              try {
                const claimPositionFeeTx = await cpAmm.claimPositionFee({
                  owner: creatorWallet,
                  pool: poolPublicKey,
                  position: position.position,
                  positionNftAccount: position.positionNftAccount,
                  tokenAVault: poolState.tokenAVault,
                  tokenBVault: poolState.tokenBVault,
                  tokenAMint: poolState.tokenAMint,
                  tokenBMint: poolState.tokenBMint,
                  tokenAProgram: TOKEN_PROGRAM_ID,
                  tokenBProgram: TOKEN_PROGRAM_ID
                });

                const { blockhash } = await connection.getLatestBlockhash();
                claimPositionFeeTx.recentBlockhash = blockhash;
                claimPositionFeeTx.feePayer = creatorWallet;

                claimPositionFeeTx.sign(wallet);
                const posTxSignature = await connection.sendRawTransaction(claimPositionFeeTx.serialize(), {
                  skipPreflight: false,
                  preflightCommitment: 'confirmed'
                });

                console.log(`✅ Successfully claimed position fees for position ${position.position.toString()}: ${posTxSignature}`);
                
                // Wait 2 seconds for transaction to be indexed
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // For simplicity, assume a small amount was claimed
                const actualPositionClaimedAmount = 0.001; // Conservative estimate
                tokenTotalClaimed += actualPositionClaimedAmount;
                positionTxSignature = posTxSignature;
                successfulClaims++;
                
              } catch (positionError) {
                console.error(`❌ Failed to claim position fees for position ${position.position.toString()}:`, positionError);
                failedClaims++;
              }
            }
          } else {
            console.log(`📊 No positions found for pool ${poolAddress} owned by ${creatorWallet.toString()}`);
          }

        } catch (positionError) {
          console.error(`❌ Failed to claim position fees for pool ${poolAddress}:`, positionError);
          failedClaims++;
        }

        // Distribute fees if any were claimed
        if (tokenTotalClaimed > 0) {
          console.log(`💰 Distributing ${tokenTotalClaimed} total claimed fees for token ${token.name}`);
          
          try {
            // Distribute fees to different addresses
            const distributions = await distributeFees(
              connection,
              wallet,
              tokenTotalClaimed,
              token.dao_treasury as string | null,
              token.name as string
            );
            
            console.log(`✅ Fee distribution completed for ${token.name}. Distributed to ${distributions.length} addresses`);
            
            // Track fee distributions
            allFeeDistributions.push({
              tokenMint: token.mint as string,
              tokenName: token.name as string,
              totalClaimed: tokenTotalClaimed,
              distributions
            });
            
            // Wait 1 second after distribution to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Update database with claimed fees
            await ctx.env.DB
              .prepare(`
                UPDATE tokens 
                SET fees_claimed = COALESCE(fees_claimed, 0) + ? 
                WHERE mint = ?
              `)
              .bind(tokenTotalClaimed.toString(), token.mint as string)
              .run();

            // Update twitter_users if twitter_account exists
            if (token.twitter_account) {
              await ctx.env.DB
                .prepare(`
                  UPDATE twitter_users 
                  SET fees_claimed = COALESCE(fees_claimed, 0) + ? 
                  WHERE username = ?
                `)
                .bind(tokenTotalClaimed.toString(), token.twitter_account as string)
                .run();
            }

            totalClaimed += tokenTotalClaimed;
            
            // Add pool claim to claimedPools array
            claimedPools.push({
              mint: token.mint as string,
              name: token.name as string,
              poolAddress: poolAddress,
              partnerTxHash: partnerTxSignature,
              positionTxHash: positionTxSignature,
              success: true,
              feesClaimed: tokenTotalClaimed
            });
            
          } catch (distributionError) {
            console.error(`❌ Failed to distribute fees for token ${token.name}:`, distributionError);
            failedClaims++;
          }
        } else {
          console.log(`📊 No fees claimed for token ${token.name}, skipping distribution`);
        }

      } catch (poolError) {
        console.error(`❌ Failed to process pool ${poolAddress} for token ${token.name}:`, poolError);
        failedClaims++;
      }
    }

    console.log(`\nDAMM fee claim process completed:`);
    console.log(`- Total tokens processed: ${tokensResult.results.length}`);
    console.log(`- Successful claims: ${successfulClaims}`);
    console.log(`- Failed claims: ${failedClaims}`);
    console.log(`- Total claimed: ${totalClaimed}`);

    return jsonResponse({
      success: true,
      summary: {
        totalTokens: tokensResult.results.length,
        successfulClaims,
        failedClaims,
        totalClaimed
      },
      claimedPools,
      feeDistributions: allFeeDistributions,
      network,
      rpcUrl
    }, 200);

  } catch (e) {
    console.error('DAMM fee claim error:', e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ 
      error: e instanceof Error ? e.message : 'Unknown error',
      success: false 
    }, 500);
  }
}
