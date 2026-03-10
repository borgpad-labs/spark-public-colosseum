import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";
import { Connection, Keypair, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { CpAmm } from '@meteora-ag/cp-amm-sdk';
import BN from 'bn.js';
import bs58 from "bs58";
import { getRpcUrlForCluster } from '../../shared/solana/rpcUtils';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createTransferInstruction, getMint } from '@solana/spl-token';
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
  
  console.log(`📊 Fee distribution amounts for ${totalClaimedAmount} SOL:`);
  console.log(`  - Pool Traders (5%): ${poolTradersAmount} SOL`);
  console.log(`  - Parrain (5%): ${parrainAmount} SOL`);
  console.log(`  - Votants Spark (5%): ${votantsSparkAmount} SOL`);
  console.log(`  - DAO Spark (35%): ${daoSparkAmount} SOL`);
  console.log(`  - Launcher (5%): ${launcherAmount} SOL`);
  console.log(`  - Treasury (45%): ${treasuryAmount} SOL`);
  
  // Check if we have enough tokens to distribute (minimum 0.00001 SOL to cover transaction fees)
  if (totalClaimedAmount < 0.00001) {
    console.log(`⚠️ Fee amount ${totalClaimedAmount} SOL is too small to distribute (minimum 0.00001 SOL)`);
    return [];
  }
  
  // Distribute to Pool Traders
  if (poolTradersAmount > 0) {
    try {
      const poolTradersTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: new PublicKey(FEE_DISTRIBUTION_ADDRESSES.POOL_TRADERS),
          lamports: Math.floor(poolTradersAmount * LAMPORTS_PER_SOL)
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
          lamports: Math.floor(parrainAmount * LAMPORTS_PER_SOL)
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
          lamports: Math.floor(votantsSparkAmount * LAMPORTS_PER_SOL)
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
          lamports: Math.floor(daoSparkAmount * LAMPORTS_PER_SOL)
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
          lamports: Math.floor(launcherAmount * LAMPORTS_PER_SOL)
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
      // Check if the treasury account exists and has sufficient rent
      const treasuryPubkey = new PublicKey(dao_treasury);
      const treasuryAccountInfo = await connection.getAccountInfo(treasuryPubkey);
      
      console.log(`🔍 Treasury account check for ${dao_treasury}:`);
      console.log(`  - Account exists: ${!!treasuryAccountInfo}`);
      console.log(`  - Current balance: ${treasuryAccountInfo ? treasuryAccountInfo.lamports / LAMPORTS_PER_SOL : 0} SOL`);
      console.log(`  - Minimum rent required: 0.00203928 SOL (2039280 lamports)`);
      
      let transferAmount = Math.floor(treasuryAmount * LAMPORTS_PER_SOL);
      
      // Get the current minimum rent exemption amount
      const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(0);
      console.log(`  - Current rent exemption amount: ${rentExemptionAmount / LAMPORTS_PER_SOL} SOL (${rentExemptionAmount} lamports)`);
      
      // If account doesn't exist or has insufficient rent, add rent amount
      if (!treasuryAccountInfo || treasuryAccountInfo.lamports < rentExemptionAmount) {
        transferAmount += rentExemptionAmount;
        console.log(`💰 Adding rent exemption amount ${rentExemptionAmount / LAMPORTS_PER_SOL} SOL to treasury transfer`);
        console.log(`  - Reason: ${!treasuryAccountInfo ? 'Account does not exist' : 'Account has insufficient rent'}`);
      } else {
        console.log(`✅ Treasury account has sufficient balance, no rent exemption needed`);
      }
      
      const treasuryTx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: treasuryPubkey,
          lamports: transferAmount
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
      console.log(`⚠️ Treasury account may not exist or have insufficient rent. Skipping treasury distribution.`);
    }
  }
  
  return distributions;
}

/**
 * Claims partner fees for tokens that have a DAMM pool address in the database
 */
export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const startTime = Date.now();
  try {
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
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
        // Get pool state with retry logic
        const poolPublicKey = new PublicKey(poolAddress);
        let poolState;
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
          try {
            console.log(`🔍 Fetching pool state for ${poolAddress} (attempt ${retryCount + 1}/${maxRetries})`);
            poolState = await cpAmm.fetchPoolState(poolPublicKey);
            console.log(`✅ Successfully fetched pool state for ${poolAddress}`);
            break;
          } catch (fetchError) {
            retryCount++;
            console.error(`❌ Failed to fetch pool state (attempt ${retryCount}/${maxRetries}):`, fetchError);
            
            if (retryCount >= maxRetries) {
              throw new Error(`Failed to fetch pool state after ${maxRetries} attempts: ${fetchError}`);
            }
            
            // Wait before retrying (exponential backoff)
            const waitTime = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
            console.log(`⏳ Waiting ${waitTime}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        }
        
        console.log(`🔍 Processing pool ${poolAddress} for token ${token.name}`);

        // Check if our wallet is the authorized partner for this pool
        const poolPartner = poolState.partner;
        if (!poolPartner || poolPartner.toString() !== creatorWallet.toString()) {
          console.log(`⚠️ Wallet ${creatorWallet.toString()} is not the authorized partner for pool ${poolAddress}. Partner is: ${poolPartner?.toString() || 'unknown'}`);
          console.log(`⏭️ Skipping partner fee claim for this pool`);
          
          // Still try to claim position fees even if we're not the partner
        } else {
          console.log(`✅ Wallet ${creatorWallet.toString()} is the authorized partner for pool ${poolAddress}`);

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
          
          // Send transaction with retry logic
          let txSignature;
          let txRetryCount = 0;
          const maxTxRetries = 3;
          
          while (txRetryCount < maxTxRetries) {
            try {
              console.log(`📤 Sending partner fee claim transaction (attempt ${txRetryCount + 1}/${maxTxRetries})`);
              txSignature = await connection.sendRawTransaction(claimPartnerFeeTx.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'confirmed'
              });
              console.log(`✅ Successfully sent partner fee claim transaction: ${txSignature}`);
              break;
            } catch (txError) {
              txRetryCount++;
              console.error(`❌ Failed to send partner fee claim transaction (attempt ${txRetryCount}/${maxTxRetries}):`, txError);
              
              if (txRetryCount >= maxTxRetries) {
                throw new Error(`Failed to send partner fee claim transaction after ${maxTxRetries} attempts: ${txError}`);
              }
              
              // Wait before retrying (exponential backoff)
              const waitTime = Math.min(1000 * Math.pow(2, txRetryCount - 1), 5000);
              console.log(`⏳ Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }

          console.log(`✅ Successfully claimed DAMM partner fees for pool ${poolAddress}: ${txSignature}`);
          
          // Wait 2 seconds for transaction to be indexed
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Parse transaction to get actual claimed amount from events
          let actualClaimedAmount = 0;
          try {
            const txInfo = await connection.getTransaction(txSignature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0
            });
            
            if (txInfo && txInfo.meta) {
              console.log(`🔍 Parsing partner fee transaction ${txSignature} for fee amount...`);
              
              // Log complete transaction information
              console.log(`📊 Complete transaction info:`);
              console.log(`  - Signature: ${txSignature}`);
              console.log(`  - Block time: ${txInfo.blockTime ? new Date(txInfo.blockTime * 1000).toISOString() : 'Unknown'}`);
              console.log(`  - Slot: ${txInfo.slot}`);
              console.log(`  - Version: ${txInfo.version}`);
              console.log(`  - Status: ${txInfo.meta.err ? 'Failed' : 'Success'}`);
              console.log(`  - Fee: ${txInfo.meta.fee} lamports (${txInfo.meta.fee / 1e9} SOL)`);
              console.log(`  - Compute units consumed: ${txInfo.meta.computeUnitsConsumed || 'Unknown'}`);
              console.log(`  - Log messages count: ${txInfo.meta.logMessages?.length || 0}`);
              console.log(`  - Pre balances: ${txInfo.meta.preBalances?.length || 0} accounts`);
              console.log(`  - Post balances: ${txInfo.meta.postBalances?.length || 0} accounts`);
              console.log(`  - Pre token balances: ${txInfo.meta.preTokenBalances?.length || 0} accounts`);
              console.log(`  - Post token balances: ${txInfo.meta.postTokenBalances?.length || 0} accounts`);
              
              // Check for events in the events array (this is where Solana stores structured events)
              const events = (txInfo.meta as any).events;
              console.log(`📊 Events count: ${events?.length || 0}`);
              
              // Log all transaction logs for debugging
              const logs = txInfo.meta.logMessages || [];
              console.log(`📋 All transaction logs:`);
              logs.forEach((log, index) => {
                console.log(`  [${index}] ${log}`);
              });
              
              // Log balance changes
              if (txInfo.meta.preBalances && txInfo.meta.postBalances) {
                console.log(`📊 Balance changes:`);
                txInfo.meta.preBalances.forEach((preBalance, index) => {
                  const postBalance = txInfo.meta.postBalances[index];
                  const change = postBalance - preBalance;
                  if (change !== 0) {
                    console.log(`  Account ${index}: ${preBalance / 1e9} → ${postBalance / 1e9} SOL (${change > 0 ? '+' : ''}${change / 1e9} SOL)`);
                  }
                });
              }
              
              // Log token balance changes
              if (txInfo.meta.preTokenBalances && txInfo.meta.postTokenBalances) {
                console.log(`📊 Token balance changes:`);
                txInfo.meta.preTokenBalances.forEach((preTokenBalance) => {
                  const postTokenBalance = txInfo.meta.postTokenBalances.find(
                    post => post.accountIndex === preTokenBalance.accountIndex && 
                           post.mint === preTokenBalance.mint
                  );
                  if (postTokenBalance) {
                    const preAmount = parseInt(preTokenBalance.uiTokenAmount.amount);
                    const postAmount = parseInt(postTokenBalance.uiTokenAmount.amount);
                    const change = postAmount - preAmount;
                    if (change !== 0) {
                      console.log(`  ${preTokenBalance.mint}: ${preAmount / Math.pow(10, preTokenBalance.uiTokenAmount.decimals)} → ${postAmount / Math.pow(10, postTokenBalance.uiTokenAmount.decimals)} (${change > 0 ? '+' : ''}${change / Math.pow(10, preTokenBalance.uiTokenAmount.decimals)})`);
                    }
                  }
                });
              }
              
              // Check for events in the events array (this is where Solana stores structured events)
              if (events && events.length > 0) {
                console.log(`📋 All transaction events:`);
                events.forEach((event: any, index: number) => {
                  console.log(`  [${index}] Event:`, JSON.stringify(event, null, 2));
                });
                
                // Look for Meteora DAMM events in the events array
                for (const event of events) {
                  if (event.event && typeof event.event === 'object') {
                    const eventData = event.event;
                    console.log(`🔍 Checking event:`, JSON.stringify(eventData, null, 2));
                    
                    // Check if this is a fee claim event
                    if (eventData.feeBClaimed || eventData.feeAClaimed) {
                      console.log(`🔍 Found fee claim event:`, JSON.stringify(eventData, null, 2));
                      
                      if (eventData.feeBClaimed) {
                        const feeBLamports = parseInt(eventData.feeBClaimed);
                        actualClaimedAmount = feeBLamports / 1e9; // Convert lamports to WSOL
                        console.log(`💰 Partner fees claimed: ${actualClaimedAmount} WSOL (from event: ${feeBLamports} lamports)`);
                        break;
                      }
                      
                      if (eventData.feeAClaimed) {
                        const feeALamports = parseInt(eventData.feeAClaimed);
                        actualClaimedAmount = feeALamports / 1e9; // Convert lamports to WSOL
                        console.log(`💰 Partner fees claimed: ${actualClaimedAmount} WSOL (from event: ${feeALamports} lamports)`);
                        break;
                      }
                    }
                  }
                }
              }
              
              // Also check log messages as fallback (in case events aren't available)
              let foundFeeEvent = false;
              for (const log of logs) {
                if (log.includes('feeBClaimed') || log.includes('feeAClaimed') || log.includes('feeA') || log.includes('feeB')) {
                  console.log(`🔍 Found potential partner fee claim event in logs: ${log}`);
                  foundFeeEvent = true;
                  
                  // Try to extract the fee amount from the event
                  try {
                    // Look for JSON-like structure in the log
                    const eventMatch = log.match(/\{[^}]*feeBClaimed[^}]*\}/);
                    if (eventMatch) {
                      const eventStr = eventMatch[0];
                      console.log(`🔍 Parsing partner fee event: ${eventStr}`);
                      
                      // Extract feeBClaimed value
                      const feeBMatch = eventStr.match(/"feeBClaimed":"(\d+)"/);
                      if (feeBMatch) {
                        const feeBLamports = parseInt(feeBMatch[1]);
                        actualClaimedAmount = feeBLamports / 1e9; // Convert lamports to WSOL
                        console.log(`💰 Partner fees claimed: ${actualClaimedAmount} WSOL (from log: ${feeBLamports} lamports)`);
                        break;
                      }
                    }
                    
                    // Also try to look for other fee patterns
                    const feePatterns = [
                      /"feeBClaimed":"(\d+)"/,
                      /"feeAClaimed":"(\d+)"/,
                      /"feeB":"(\d+)"/,
                      /"feeA":"(\d+)"/
                    ];
                    
                    for (const pattern of feePatterns) {
                      const match = log.match(pattern);
                      if (match) {
                        const feeLamports = parseInt(match[1]);
                        actualClaimedAmount = feeLamports / 1e9; // Convert lamports to WSOL
                        console.log(`💰 Partner fees claimed: ${actualClaimedAmount} WSOL (from pattern ${pattern}: ${feeLamports} lamports)`);
                        break;
                      }
                    }
                  } catch (eventParseError) {
                    console.error(`❌ Failed to parse partner fee event:`, eventParseError);
                  }
                }
              }
              
              // If no fees found in events, parse the transaction logs more carefully
              if (actualClaimedAmount === 0) {
                console.log(`🔍 Parsing partner fee transaction logs for fee information...`);
                
                // Look for Meteora DAMM specific patterns in the logs
                for (let i = 0; i < logs.length; i++) {
                  const log = logs[i];
                  
                  // Look for the ClaimPartnerFee instruction
                  if (log.includes('Instruction: ClaimPartnerFee')) {
                    console.log(`🔍 Found ClaimPartnerFee instruction at log ${i}`);
                    
                    // Look for the TransferChecked instruction that follows
                    for (let j = i + 1; j < logs.length; j++) {
                      const transferLog = logs[j];
                      if (transferLog.includes('Instruction: TransferChecked')) {
                        console.log(`🔍 Found TransferChecked instruction at log ${j}`);
                        
                        // Look for the actual fee amount in the transaction logs
                        // The fee amount should be in the TransferChecked instruction data
                        console.log(`🔍 Looking for fee amount in TransferChecked instruction...`);
                        
                        // Check if there are any inner instructions that might contain the fee amount
                        if (txInfo.meta.innerInstructions) {
                          console.log(`🔍 Found ${txInfo.meta.innerInstructions.length} inner instructions`);
                          for (const innerInstruction of txInfo.meta.innerInstructions) {
                            console.log(`🔍 Inner instruction at index ${innerInstruction.index}:`, innerInstruction.instructions);
                            
                            // Look for TransferChecked instruction in inner instructions
                            for (const instruction of innerInstruction.instructions) {
                              if (instruction.programIdIndex === 6) { // Token program
                                console.log(`🔍 Found token instruction:`, instruction);
                                
                                // The instruction data might contain the fee amount
                                // For TransferChecked, the amount is typically encoded in the data
                                if (instruction.data && instruction.data.length > 8) {
                                  try {
                                    // Try to decode the instruction data to find the amount
                                    const dataBuffer = Buffer.from(instruction.data, 'base64');
                                    console.log(`🔍 Instruction data buffer:`, dataBuffer);
                                    
                                    // For TransferChecked, the amount is typically at a specific offset
                                    // This is a simplified approach - we might need to adjust based on actual data structure
                                    if (dataBuffer.length >= 8) {
                                      // Look for a reasonable amount in the data
                                      for (let offset = 0; offset <= dataBuffer.length - 8; offset++) {
                                        const amountBytes = dataBuffer.slice(offset, offset + 8);
                                        const amount = amountBytes.readBigUInt64LE(0);
                                        const amountNumber = Number(amount);
                                        
                                        // Convert from lamports to WSOL
                                        const potentialFee = amountNumber / 1e9;
                                        
                                        console.log(`🔍 Potential amount at offset ${offset}: ${potentialFee} WSOL (${amountNumber} lamports)`);
                                        
                                        // If this looks like a reasonable fee amount (between 0.000001 and 1 WSOL)
                                        if (potentialFee > 0.000001 && potentialFee < 1) {
                                          actualClaimedAmount = potentialFee;
                                          console.log(`💰 Partner fees claimed: ${actualClaimedAmount} WSOL (from instruction data)`);
                                          break;
                                        }
                                      }
                                    }
                                  } catch (decodeError) {
                                    console.error(`❌ Failed to decode instruction data:`, decodeError);
                                  }
                                }
                              }
                            }
                          }
                        }
                        
                        // Look for the specific fee amount in the logs around the TransferChecked instruction
                        // The amount should be in the instruction data or in a subsequent log
                        for (let k = j; k < Math.min(j + 5, logs.length); k++) {
                          const surroundingLog = logs[k];
                          console.log(`🔍 Checking log ${k}: ${surroundingLog}`);
                          
                          // Look for patterns that might contain the fee amount
                          // This could be in various formats depending on how Meteora logs the transfer
                          const patterns = [
                            /amount[:\s]*(\d+)/i,
                            /transfer[:\s]*(\d+)/i,
                            /fee[:\s]*(\d+)/i
                          ];
                          
                          // Skip compute units consumed logs - these are not fee amounts
                          if (surroundingLog.includes('consumed') || surroundingLog.includes('compute units')) {
                            console.log(`🔍 Skipping compute units log: ${surroundingLog}`);
                            continue;
                          }
                          
                          for (const pattern of patterns) {
                            const match = surroundingLog.match(pattern);
                            if (match) {
                              const potentialAmount = parseInt(match[1]);
                              // Convert from lamports to WSOL (assuming 9 decimals)
                              const potentialFee = potentialAmount / 1e9;
                              console.log(`🔍 Found potential fee amount: ${potentialFee} WSOL (${potentialAmount} lamports) from pattern ${pattern}`);
                              
                              // If this looks like a reasonable fee amount (between 0.000001 and 1 WSOL)
                              if (potentialFee > 0.000001 && potentialFee < 1) {
                                actualClaimedAmount = potentialFee;
                                console.log(`💰 Partner fees claimed: ${actualClaimedAmount} WSOL (from log parsing)`);
                                break;
                              }
                            }
                          }
                          
                          if (actualClaimedAmount > 0) break;
                        }
                        break;
                      }
                    }
                    break;
                  }
                }
              }
              
              // If no fees found in events, check native SOL balance changes
              if (actualClaimedAmount === 0) {
                console.log(`🔍 Checking native SOL balance changes for partner fee detection...`);
                
                if (txInfo.meta.preBalances && txInfo.meta.postBalances) {
                  // Find accounts with balance changes in original order
                  const accountsWithChanges = [];
                  for (let i = 0; i < txInfo.meta.preBalances.length; i++) {
                    const preBalance = txInfo.meta.preBalances[i];
                    const postBalance = txInfo.meta.postBalances[i];
                    const change = postBalance - preBalance;
                    
                    if (change !== 0) {
                      accountsWithChanges.push({ index: i, change, preBalance, postBalance });
                    }
                  }
                  
                  // Log all balance changes in original order
                  console.log(`📊 Balance changes:`);
                  accountsWithChanges.forEach(({ index, change, preBalance, postBalance }) => {
                    console.log(`  Account ${index}: ${preBalance / 1e9} → ${postBalance / 1e9} SOL (${change > 0 ? '+' : ''}${change / 1e9} SOL)`);
                  });
                  
                  // The fee claim is always in the second account with changes (the one with negative change)
                  if (accountsWithChanges.length >= 2) {
                    const secondAccount = accountsWithChanges[1]; // Second account in original order
                    
                    // Look for negative changes (pool losing funds = your wallet gaining fees)
                    if (secondAccount.change < 0) {
                      const changeInSol = Math.abs(secondAccount.change) / LAMPORTS_PER_SOL;
                      
                      // If this looks like a reasonable fee amount (between 0.000001 and 1 SOL)
                      if (changeInSol > 0.000001 && changeInSol < 1) {
                        actualClaimedAmount = changeInSol;
                        console.log(`💰 Partner fees claimed: ${actualClaimedAmount} SOL (from balance change in account ${secondAccount.index}: ${secondAccount.change} lamports)`);
                      }
                    }
                  }
                }
              }
              
              if (!foundFeeEvent && (!events || events.length === 0)) {
                console.log(`⚠️ No fee-related events found in transaction logs or events`);
              }
              
              if (actualClaimedAmount === 0) {
                console.log(`⚠️ Could not find partner fee claim events in transaction`);
                console.log(`🔍 Transaction may have succeeded but no fees were available to claim`);
              }
            } else {
              console.log(`⚠️ Could not fetch transaction info for ${txSignature}`);
            }
          } catch (parseError) {
            console.error(`❌ Failed to parse partner fee transaction for claimed amount:`, parseError);
            console.log(`⚠️ Could not determine claimed amount - skipping distribution`);
          }
          
          tokenTotalClaimed += actualClaimedAmount;
          partnerTxSignature = txSignature;
          successfulClaims++;

        } catch (partnerError) {
          console.error(`❌ Failed to claim partner fees for pool ${poolAddress}:`, partnerError);
          failedClaims++;
        }
        }

        // Claim position fees (try this even if we're not the partner)
        try {
          console.log(`🎯 Claiming position fees for pool ${poolAddress}...`);
          
          // Get positions for this pool owned by our wallet with retry logic
          let positions;
          let positionsRetryCount = 0;
          const maxPositionsRetries = 3;
          
          while (positionsRetryCount < maxPositionsRetries) {
            try {
              console.log(`🔍 Fetching positions for wallet ${creatorWallet.toString()} (attempt ${positionsRetryCount + 1}/${maxPositionsRetries})`);
              positions = await cpAmm.getPositionsByUser(creatorWallet);
              console.log(`✅ Successfully fetched ${positions.length} positions for wallet`);
              break;
            } catch (positionsError) {
              positionsRetryCount++;
              console.error(`❌ Failed to fetch positions (attempt ${positionsRetryCount}/${maxPositionsRetries}):`, positionsError);
              
              if (positionsRetryCount >= maxPositionsRetries) {
                throw new Error(`Failed to fetch positions after ${maxPositionsRetries} attempts: ${positionsError}`);
              }
              
              // Wait before retrying (exponential backoff)
              const waitTime = Math.min(1000 * Math.pow(2, positionsRetryCount - 1), 5000);
              console.log(`⏳ Waiting ${waitTime}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
          }
          
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
                
                // Send position fee transaction with retry logic
                let posTxSignature;
                let posTxRetryCount = 0;
                const maxPosTxRetries = 3;
                
                while (posTxRetryCount < maxPosTxRetries) {
                  try {
                    console.log(`📤 Sending position fee claim transaction (attempt ${posTxRetryCount + 1}/${maxPosTxRetries})`);
                    posTxSignature = await connection.sendRawTransaction(claimPositionFeeTx.serialize(), {
                      skipPreflight: false,
                      preflightCommitment: 'confirmed'
                    });
                    console.log(`✅ Successfully sent position fee claim transaction: ${posTxSignature}`);
                    break;
                  } catch (posTxError) {
                    posTxRetryCount++;
                    console.error(`❌ Failed to send position fee claim transaction (attempt ${posTxRetryCount}/${maxPosTxRetries}):`, posTxError);
                    
                    if (posTxRetryCount >= maxPosTxRetries) {
                      throw new Error(`Failed to send position fee claim transaction after ${maxPosTxRetries} attempts: ${posTxError}`);
                    }
                    
                    // Wait before retrying (exponential backoff)
                    const waitTime = Math.min(1000 * Math.pow(2, posTxRetryCount - 1), 5000);
                    console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                  }
                }

                console.log(`✅ Successfully claimed position fees for position ${position.position.toString()}: ${posTxSignature}`);
                
                // Wait 2 seconds for transaction to be indexed
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                // Parse transaction to get actual claimed amount from events
                let actualPositionClaimedAmount = 0;
                try {
                  console.log(`🔍 Fetching transaction details for ${posTxSignature}...`);
                  
                  // Try multiple approaches to get transaction info
                  let txInfo = null;
                  let fetchAttempts = 0;
                  const maxFetchAttempts = 5;
                  
                  while (fetchAttempts < maxFetchAttempts && !txInfo) {
                    fetchAttempts++;
                    console.log(`📡 Attempt ${fetchAttempts}/${maxFetchAttempts} to fetch transaction...`);
                    
                    try {
                      txInfo = await connection.getTransaction(posTxSignature, {
                        commitment: 'confirmed',
                        maxSupportedTransactionVersion: 0
                      });
                      
                      if (txInfo) {
                        console.log(`✅ Successfully fetched transaction info`);
                        break;
                      } else {
                        console.log(`⚠️ Transaction not found, waiting before retry...`);
                        await new Promise(resolve => setTimeout(resolve, 3000));
                      }
                    } catch (fetchError) {
                      console.error(`❌ Failed to fetch transaction (attempt ${fetchAttempts}):`, fetchError);
                      if (fetchAttempts < maxFetchAttempts) {
                        console.log(`⏳ Waiting 2 seconds before retry...`);
                        await new Promise(resolve => setTimeout(resolve, 2000));
                      }
                    }
                  }
                  
                  if (txInfo && txInfo.meta) {
                    console.log(`🔍 Parsing position fee transaction ${posTxSignature} for fee amount...`);
                    
                    // Log complete transaction information
                    console.log(`📊 Complete transaction info:`);
                    console.log(`  - Signature: ${posTxSignature}`);
                    console.log(`  - Block time: ${txInfo.blockTime ? new Date(txInfo.blockTime * 1000).toISOString() : 'Unknown'}`);
                    console.log(`  - Slot: ${txInfo.slot}`);
                    console.log(`  - Version: ${txInfo.version}`);
                    console.log(`  - Status: ${txInfo.meta.err ? 'Failed' : 'Success'}`);
                    console.log(`  - Fee: ${txInfo.meta.fee} lamports (${txInfo.meta.fee / 1e9} SOL)`);
                    console.log(`  - Compute units consumed: ${txInfo.meta.computeUnitsConsumed || 'Unknown'}`);
                    console.log(`  - Log messages count: ${txInfo.meta.logMessages?.length || 0}`);
                    console.log(`  - Pre balances: ${txInfo.meta.preBalances?.length || 0} accounts`);
                    console.log(`  - Post balances: ${txInfo.meta.postBalances?.length || 0} accounts`);
                    console.log(`  - Pre token balances: ${txInfo.meta.preTokenBalances?.length || 0} accounts`);
                    console.log(`  - Post token balances: ${txInfo.meta.postTokenBalances?.length || 0} accounts`);
                    
                    // Check for events in the events array (this is where Solana stores structured events)
                    const events = (txInfo.meta as any).events;
                    console.log(`📊 Events count: ${events?.length || 0}`);
                    
                    // Log all transaction logs for debugging
                    const logs = txInfo.meta.logMessages || [];
                    console.log(`📋 All transaction logs:`);
                    logs.forEach((log, index) => {
                      console.log(`  [${index}] ${log}`);
                    });
                    
                    // Log balance changes
                    if (txInfo.meta.preBalances && txInfo.meta.postBalances) {
                      console.log(`📊 Balance changes:`);
                      txInfo.meta.preBalances.forEach((preBalance, index) => {
                        const postBalance = txInfo.meta.postBalances[index];
                        const change = postBalance - preBalance;
                        if (change !== 0) {
                          console.log(`  Account ${index}: ${preBalance / 1e9} → ${postBalance / 1e9} SOL (${change > 0 ? '+' : ''}${change / 1e9} SOL)`);
                        }
                      });
                    }
                    
                    // Log token balance changes
                    if (txInfo.meta.preTokenBalances && txInfo.meta.postTokenBalances) {
                      console.log(`📊 Token balance changes:`);
                      txInfo.meta.preTokenBalances.forEach((preTokenBalance) => {
                        const postTokenBalance = txInfo.meta.postTokenBalances.find(
                          post => post.accountIndex === preTokenBalance.accountIndex && 
                                 post.mint === preTokenBalance.mint
                        );
                        if (postTokenBalance) {
                          const preAmount = parseInt(preTokenBalance.uiTokenAmount.amount);
                          const postAmount = parseInt(postTokenBalance.uiTokenAmount.amount);
                          const change = postAmount - preAmount;
                          if (change !== 0) {
                            console.log(`  ${preTokenBalance.mint}: ${preAmount / Math.pow(10, preTokenBalance.uiTokenAmount.decimals)} → ${postAmount / Math.pow(10, postTokenBalance.uiTokenAmount.decimals)} (${change > 0 ? '+' : ''}${change / Math.pow(10, preTokenBalance.uiTokenAmount.decimals)})`);
                          }
                        }
                      });
                    }
                    
                    // Check for events in the events array (this is where Solana stores structured events)
                    if (events && events.length > 0) {
                      console.log(`📋 All transaction events:`);
                      events.forEach((event: any, index: number) => {
                        console.log(`  [${index}] Event:`, JSON.stringify(event, null, 2));
                      });
                      
                      // Look for Meteora DAMM events in the events array
                      for (const event of events) {
                        if (event.event && typeof event.event === 'object') {
                          const eventData = event.event;
                          console.log(`🔍 Checking event:`, JSON.stringify(eventData, null, 2));
                          
                          // Check if this is a fee claim event
                          if (eventData.feeBClaimed || eventData.feeAClaimed) {
                            console.log(`🔍 Found fee claim event:`, JSON.stringify(eventData, null, 2));
                            
                            if (eventData.feeBClaimed) {
                              const feeBLamports = parseInt(eventData.feeBClaimed);
                              actualPositionClaimedAmount = feeBLamports / 1e9; // Convert lamports to WSOL
                              console.log(`💰 Position fees claimed: ${actualPositionClaimedAmount} WSOL (from event: ${feeBLamports} lamports)`);
                              break;
                            }
                            
                            if (eventData.feeAClaimed) {
                              const feeALamports = parseInt(eventData.feeAClaimed);
                              actualPositionClaimedAmount = feeALamports / 1e9; // Convert lamports to WSOL
                              console.log(`💰 Position fees claimed: ${actualPositionClaimedAmount} WSOL (from event: ${feeALamports} lamports)`);
                              break;
                            }
                          }
                        }
                      }
                    }
                    
                    // Also check log messages as fallback (in case events aren't available)
                    let foundFeeEvent = false;
                    for (const log of logs) {
                      if (log.includes('feeBClaimed') || log.includes('feeAClaimed') || log.includes('feeA') || log.includes('feeB')) {
                        console.log(`🔍 Found potential fee claim event in logs: ${log}`);
                        foundFeeEvent = true;
                        
                        // Try to extract the fee amount from the event
                        try {
                          // Look for JSON-like structure in the log
                          const eventMatch = log.match(/\{[^}]*feeBClaimed[^}]*\}/);
                          if (eventMatch) {
                            const eventStr = eventMatch[0];
                            console.log(`🔍 Parsing position fee event: ${eventStr}`);
                            
                            // Extract feeBClaimed value
                            const feeBMatch = eventStr.match(/"feeBClaimed":"(\d+)"/);
                            if (feeBMatch) {
                              const feeBLamports = parseInt(feeBMatch[1]);
                              actualPositionClaimedAmount = feeBLamports / 1e9; // Convert lamports to WSOL
                              console.log(`💰 Position fees claimed: ${actualPositionClaimedAmount} WSOL (from log: ${feeBLamports} lamports)`);
                              break;
                            }
                          }
                          
                          // Also try to look for other fee patterns
                          const feePatterns = [
                            /"feeBClaimed":"(\d+)"/,
                            /"feeAClaimed":"(\d+)"/,
                            /"feeB":"(\d+)"/,
                            /"feeA":"(\d+)"/
                          ];
                          
                          for (const pattern of feePatterns) {
                            const match = log.match(pattern);
                            if (match) {
                              const feeLamports = parseInt(match[1]);
                              actualPositionClaimedAmount = feeLamports / 1e9; // Convert lamports to WSOL
                              console.log(`💰 Position fees claimed: ${actualPositionClaimedAmount} WSOL (from pattern ${pattern}: ${feeLamports} lamports)`);
                              break;
                            }
                          }
                        } catch (eventParseError) {
                          console.error(`❌ Failed to parse position fee event:`, eventParseError);
                        }
                      }
                    }
                    
                    if (!foundFeeEvent && (!events || events.length === 0)) {
                      console.log(`⚠️ No fee-related events found in transaction logs or events`);
                    }
                    
                    // If no fees found in events, check native SOL balance changes
                    if (actualPositionClaimedAmount === 0) {
                      console.log(`🔍 Checking native SOL balance changes for fee detection...`);
                      
                      if (txInfo.meta.preBalances && txInfo.meta.postBalances) {
                        // Find accounts with balance changes in original order
                        const accountsWithChanges = [];
                        for (let i = 0; i < txInfo.meta.preBalances.length; i++) {
                          const preBalance = txInfo.meta.preBalances[i];
                          const postBalance = txInfo.meta.postBalances[i];
                          const change = postBalance - preBalance;
                          
                          if (change !== 0) {
                            accountsWithChanges.push({ index: i, change, preBalance, postBalance });
                          }
                        }
                        
                        // Log all balance changes in original order
                        console.log(`📊 Balance changes:`);
                        accountsWithChanges.forEach(({ index, change, preBalance, postBalance }) => {
                          console.log(`  Account ${index}: ${preBalance / 1e9} → ${postBalance / 1e9} SOL (${change > 0 ? '+' : ''}${change / 1e9} SOL)`);
                        });
                        
                        // The fee claim is always in the second account with changes (the one with negative change)
                        if (accountsWithChanges.length >= 2) {
                          const secondAccount = accountsWithChanges[1]; // Second account in original order
                          
                          // Look for negative changes (pool losing funds = your wallet gaining fees)
                          if (secondAccount.change < 0) {
                            const changeInSol = Math.abs(secondAccount.change) / LAMPORTS_PER_SOL;
                            
                            // If this looks like a reasonable fee amount (between 0.000001 and 1 SOL)
                            if (changeInSol > 0.000001 && changeInSol < 1) {
                              actualPositionClaimedAmount = changeInSol;
                              console.log(`💰 Position fees claimed: ${actualPositionClaimedAmount} SOL (from balance change in account ${secondAccount.index}: ${secondAccount.change} lamports)`);
                            }
                          }
                        }
                      }
                    }
                    

                    
                    if (actualPositionClaimedAmount === 0) {
                      console.log(`⚠️ Could not find position fee claim events in transaction`);
                      console.log(`🔍 Transaction may have succeeded but no fees were available to claim`);
                    }
                  } else {
                    console.log(`⚠️ Could not fetch transaction info for ${posTxSignature}`);
                    
                    // Try alternative approach - check if transaction exists
                    try {
                      console.log(`🔍 Checking if transaction exists using getSignatureStatuses...`);
                      const statuses = await connection.getSignatureStatuses([posTxSignature]);
                      const status = statuses.value[0];
                      
                      if (status) {
                        console.log(`📊 Transaction status:`, {
                          slot: status.slot,
                          confirmations: status.confirmations,
                          err: status.err,
                          confirmationStatus: status.confirmationStatus
                        });
                        
                        if (status.err) {
                          console.log(`❌ Transaction failed:`, status.err);
                        } else if (status.confirmations === null) {
                          console.log(`⏳ Transaction is still being processed`);
                        } else {
                          console.log(`✅ Transaction confirmed with ${status.confirmations} confirmations`);
                        }
                      } else {
                        console.log(`❌ Transaction not found in network`);
                      }
                    } catch (statusError) {
                      console.error(`❌ Failed to get transaction status:`, statusError);
                    }
                  }
                } catch (parseError) {
                  console.error(`❌ Failed to parse position fee transaction for claimed amount:`, parseError);
                  console.log(`⚠️ Could not determine claimed amount - skipping distribution`);
                }
                
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

    // Enhanced response with detailed logs
    const response = {
      text: "DAMM fee claim process completed",
      success: true,
      summary: {
        totalTokens: tokensResult.results.length,
        successfulClaims,
        failedClaims,
        totalClaimed,
        timestamp: new Date().toISOString(),
        network
      },
              details: {
          processedTokens: tokensResult.results.map((token: any) => ({
            name: token.name,
            mint: token.mint,
            poolAddress: token.damm_pool_address,
            dao: token.dao,
            twitterAccount: token.twitter_account
          })),
          claimedPools,
          feeDistributions: allFeeDistributions
        },
      logs: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date().toISOString(),
        totalProcessingTime: `${Date.now() - startTime}ms`,
        network,
        walletUsed: creatorWallet.toString()
      }
    };

    return jsonResponse(response, 200);

  } catch (e) {
    console.error('DAMM fee claim error:', e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ 
      error: e instanceof Error ? e.message : 'Unknown error',
      success: false 
    }, 500);
  }
}
