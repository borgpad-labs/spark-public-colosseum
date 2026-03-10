// src/pages/api/createpoolandsnipe.ts

import { Connection, Keypair, PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import bs58 from "bs58";
import BN from "bn.js";
import { PinataSDK } from "pinata";
import { jsonResponse } from './cfPagesFunctionsUtils';
import { isApiKeyValid } from '../services/apiKeyService';
import { sendTokenNotification } from '../services/telegramBotService';

const PUBLIC_R2_URL = 'https://pub-85c7f5f0dc104dc784e656b623d999e5.r2.dev';

type ENV = {
  RPC_URL: string
  RPC_URL2: string
  RPC_URL3: string
  RPC_URL4: string
  RPC_URL5: string
  RPC_URL6: string
  RPC_URL7: string
  RPC_URL8: string
  RPC_URL9: string
  RPC_URL10: string
  POOL_CONFIG_KEY: string
  PRIVATE_KEY: string
  SNIPER_PRIVATE_KEYS: string
  PINATA_JWT: string
  DB: D1Database
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
}

interface CreatePoolAndSnipeRequest {
  tokenName: string;
  tokenSymbol: string;
  imageUrl: string;
  tokenDescription: string;
  twitterAccount: string;
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const request = ctx.request;
  const db = ctx.env.DB;
  try {
    // authorize request
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
    //   return jsonResponse(null, 401)
    // }

    const { tokenName, tokenSymbol, imageUrl, tokenDescription, twitterAccount } = await request.json() as CreatePoolAndSnipeRequest;

    // Validate required fields
    if (!imageUrl || !tokenName || !tokenSymbol || !tokenDescription || !twitterAccount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user has created a token in the last 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    console.log(`🔍 Checking rate limit for Twitter account: ${twitterAccount}`);
    console.log(`📅 Checking tokens created after: ${twentyFourHoursAgo}`);
    
    const recentTokenQuery = await db
      .prepare(`
        SELECT mint, created_at 
        FROM tokens 
        WHERE twitter_account = ? 
        AND created_at > ? 
        ORDER BY created_at DESC 
        LIMIT 1
      `)
      .bind(twitterAccount, twentyFourHoursAgo)
      .first();

    if (recentTokenQuery) {
      const lastCreated = new Date(recentTokenQuery.created_at as string);
      const nextAllowed = new Date(lastCreated.getTime() + 24 * 60 * 60 * 1000);
      const hoursRemaining = Math.ceil((nextAllowed.getTime() - Date.now()) / (60 * 60 * 1000));
      
      console.log(`❌ Rate limit hit for ${twitterAccount}`);
      console.log(`🕒 Last token created: ${lastCreated.toISOString()}`);
      console.log(`⏰ Next allowed: ${nextAllowed.toISOString()}`);
      console.log(`⏳ Hours remaining: ${hoursRemaining}`);
      
      return new Response(JSON.stringify({ 
        error: `Rate limit exceeded. You can only create one token per day. Please wait ${hoursRemaining} more hours.`,
        nextAllowedTime: nextAllowed.toISOString(),
        lastTokenCreated: lastCreated.toISOString()
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Rate limit check passed for ${twitterAccount} - proceeding with token creation and sniping`);

    // Generate new token keypair
    const keyPair = Keypair.generate();
    const mint = keyPair.publicKey.toBase58();

    // Upload metadata
    const uploadResult = await uploadMetadata(ctx, { tokenName, tokenSymbol, mint, image: imageUrl, description: tokenDescription });
    if (!uploadResult) {
      return new Response(JSON.stringify({ error: 'Failed to upload metadata' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { metadataUrl, imageUrl: uploadedImageUrl } = uploadResult;

    // Initialize main wallet
    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    const privateKeyUint8Array = bs58.decode(privateKeyString);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const userWallet = wallet.publicKey.toBase58();
    console.log("userWallet:", userWallet);

    // Derive the pool address using the same order as createPool function
    // The createPool function uses: config, baseMint (and derives quoteMint as SOL internally)
    const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
    const CONFIG_KEY = new PublicKey(ctx.env.POOL_CONFIG_KEY);
    
    // Use the correct parameter order for DBC pool derivation
    // Based on the SDK, it should be: baseMint, quoteMint, config
    const poolAddress = deriveDbcPoolAddress(
      new PublicKey(mint), // baseMint (token) 
      SOL_MINT, // quoteMint (SOL)
      CONFIG_KEY // config
    );
    const poolAddressString = poolAddress.toBase58();
    console.log("Derived pool address (corrected order):", poolAddressString);

    // Create pool transaction
    const poolTx = await createPoolTransaction({
      mint,
      tokenName,
      tokenSymbol,
      metadataUrl,
      userWallet,
    }, ctx);

    // Initialize sniper wallets from SNIPER_PRIVATE_KEYS JSON
    let sniperWallets: Keypair[] = [];
    
    try {
      if (ctx.env.SNIPER_PRIVATE_KEYS) {
        const sniperKeysData = JSON.parse(ctx.env.SNIPER_PRIVATE_KEYS);
        const sniperKeys = Object.values(sniperKeysData) as string[];
        
        console.log(`🎯 Found ${sniperKeys.length} sniper private keys in SNIPER_PRIVATE_KEYS`);
        
        sniperWallets = sniperKeys.map((key, index) => {
          try {
            const keyUint8Array = bs58.decode(key.trim());
            const keypair = Keypair.fromSecretKey(keyUint8Array);
            console.log(`✅ Sniper ${index + 1} wallet: ${keypair.publicKey.toBase58()}`);
            return keypair;
          } catch (error) {
            console.error(`❌ Invalid sniper private key ${index + 1}:`, error);
            return null;
          }
        }).filter(wallet => wallet !== null) as Keypair[];
        
        console.log(`🎯 Successfully initialized ${sniperWallets.length} sniper wallets`);
      } else {
        console.log("⚠️ No SNIPER_PRIVATE_KEYS provided, proceeding with pool creation only");
      }
    } catch (error) {
      console.error("❌ Error parsing SNIPER_PRIVATE_KEYS:", error);
      console.log("⚠️ Proceeding with pool creation only");
    }

    // Get connection and recent blockhash
    const connection = new Connection(ctx.env.RPC_URL, 'confirmed');
    const { blockhash } = await connection.getLatestBlockhash();

    // Create multiple connections for load balancing
    const connections = [
      new Connection(ctx.env.RPC_URL, 'confirmed'),
      new Connection(ctx.env.RPC_URL2, 'confirmed'),
      new Connection(ctx.env.RPC_URL3, 'confirmed'),
      new Connection(ctx.env.RPC_URL4, 'confirmed'),
      new Connection(ctx.env.RPC_URL5, 'confirmed'),
      new Connection(ctx.env.RPC_URL6, 'confirmed'),
      new Connection(ctx.env.RPC_URL7, 'confirmed'),
      new Connection(ctx.env.RPC_URL8, 'confirmed'),
      new Connection(ctx.env.RPC_URL9, 'confirmed'),
      new Connection(ctx.env.RPC_URL10, 'confirmed')
    ];

    // Function to get a connection with round-robin load balancing
    let connectionIndex = 0;
    const getConnection = () => {
      const conn = connections[connectionIndex];
      connectionIndex = (connectionIndex + 1) % connections.length;
      return conn;
    };

    // Set blockhash and fee payer for pool transaction
    poolTx.recentBlockhash = blockhash;
    poolTx.feePayer = wallet.publicKey;

    // Sign the pool transaction
    poolTx.sign(wallet, keyPair);

    // Create sniper transactions
    const sniperTransactions: { transaction: Transaction; wallet: Keypair; amount: number }[] = [];
    
    for (let i = 0; i < sniperWallets.length; i++) {
      const sniperWallet = sniperWallets[i];
      
      // Generate random buy amount between $3 and $4 worth of SOL
      // Assuming 1 SOL = $100 (adjust based on current price)
      const minUSD = 30;
      const maxUSD = 40;
      const solPrice = 240; // Approximate SOL price in USD
      const randomUSD = minUSD + Math.random() * (maxUSD - minUSD);
      const solAmount = randomUSD / solPrice;
      const lamports = Math.floor(solAmount * 1e9); // Convert to lamports
      
        console.log(`🎯 Sniper ${i + 1}: ${randomUSD.toFixed(3)} USD (${solAmount.toFixed(6)} SOL, ${lamports} lamports)`);

      try {
        const sniperTx = await createSniperTransaction({
          inputMint: "So11111111111111111111111111111111111111112", // SOL
          outputMint: mint, // New token
          amount: lamports,
          sniperWallet: sniperWallet.publicKey.toBase58(),
          priorityFee: generateRandomPriorityFee(i), // Different priority fees for each sniper
          poolAddress: poolAddressString,
          connection: getConnection(), // Use load-balanced connection
          poolConfigKey: ctx.env.POOL_CONFIG_KEY,
          poolTransaction: poolTx
        });

        if (sniperTx) {
          // Set blockhash and fee payer
          sniperTx.recentBlockhash = blockhash;
          sniperTx.feePayer = sniperWallet.publicKey;
          
          // Sign the transaction
          sniperTx.sign(sniperWallet);

          sniperTransactions.push({
            transaction: sniperTx,
            wallet: sniperWallet,
            amount: lamports
          });
          console.log(`✅ Sniper ${i + 1} transaction prepared successfully`);
        } else {
          console.log(`⚠️ Sniper ${i + 1} transaction creation returned null - skipping`);
        }
      } catch (error) {
        console.error(`❌ Failed to create sniper transaction ${i + 1}:`, error);
        // Continue with other snipers even if one fails
      }
    }

    console.log(`🚀 Sending pool creation transaction first, then sniper transactions with minimal delay`);

    // Send pool creation transaction first
    const poolTxSignature = await connection.sendRawTransaction(poolTx.serialize(), { 
      skipPreflight: false, 
      preflightCommitment: 'processed'
    });
    console.log("🏊 Pool creation tx signature:", poolTxSignature);

    // Wait for pool creation transaction to be confirmed
    console.log("⏳ Waiting for pool creation transaction to be confirmed...");
    let confirmed = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!confirmed && attempts < maxAttempts) {
      try {
        const status = await connection.getSignatureStatus(poolTxSignature, { searchTransactionHistory: true });
        if (status?.value?.confirmationStatus === 'finalized' || status?.value?.confirmationStatus === 'confirmed') {
          confirmed = true;
          console.log("✅ Pool creation transaction confirmed!");
        } else {
          console.log(`⏳ Pool creation still pending... (attempt ${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
          attempts++;
        }
      } catch (error) {
        console.log(`⏳ Error checking pool confirmation: ${error}, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
      }
    }

    if (!confirmed) {
      console.log("⚠️ Pool creation transaction not confirmed after maximum attempts, proceeding anyway...");
    }

    // Send sniper transactions after pool confirmation
    const sniperResults: { success: boolean; signature?: string; error?: string; wallet: string; amount: number }[] = [];
    
    if (sniperTransactions.length > 0) {
      console.log("⚡ Sending all sniper transactions simultaneously after pool confirmation...");
      console.log(`🚀 Executing ${sniperTransactions.length} sniper transactions in parallel using 10 RPC endpoints`);
      
      // Send all sniper transactions simultaneously with load balancing across 10 RPC endpoints
      const allSniperPromises = sniperTransactions.map(async ({ transaction, wallet, amount }, index) => {
        try {
          // Use load-balanced connection
          const sniperConnection = getConnection();
          const currentConnectionIndex = connectionIndex === 0 ? 10 : connectionIndex;
          console.log(`🎯 Sniper ${index + 1} using RPC connection ${currentConnectionIndex} (${sniperConnection.rpcEndpoint})`);
          
          const signature = await sniperConnection.sendRawTransaction(transaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'processed'
          });
          
          console.log(`🎯 Sniper ${index + 1} tx signature:`, signature);
          return { success: true, signature, wallet: wallet.publicKey.toBase58(), amount };
        } catch (error) {
          console.error(`❌ Failed to send sniper ${index + 1} transaction:`, error);
          return { success: false, error: error instanceof Error ? error.message : 'Unknown error', wallet: wallet.publicKey.toBase58(), amount };
        }
      });
      
      // Wait for all transactions to complete
      console.log(`⏳ Waiting for all ${sniperTransactions.length} sniper transactions to complete...`);
      const allResults = await Promise.all(allSniperPromises);
      sniperResults.push(...allResults);
      
      console.log(`✅ All sniper transactions completed!`);
    }

    // Store token in database
    if (poolTxSignature) {
      const createdAt = new Date().toISOString();
      await db
        .prepare("INSERT INTO tokens (mint, name, imageUrl, dao, twitter_account, dbc_pool_address, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)")
        .bind(mint, tokenName, uploadedImageUrl, "", twitterAccount, poolAddressString, createdAt)
        .run();
      console.log(`✅ Token inserted successfully for ${twitterAccount}:`);
      console.log(`   - Token Name: ${tokenName}`);
      console.log(`   - Mint: ${mint}`);
      console.log(`   - Pool Address: ${poolAddressString}`);
      console.log(`   - Created at: ${createdAt}`);

      // Send Telegram notification
      try {
        const successfulSnipers = sniperResults.filter(r => r.success).length;
        const notificationSent = await sendTokenNotification(
          {
            botToken: ctx.env.TELEGRAM_BOT_TOKEN,
            chatId: ctx.env.TELEGRAM_CHAT_ID,
          },
          {
            tokenName,
            tokenSymbol,
            mint,
            poolAddress: poolAddressString,
            creatorUsername: twitterAccount,
            imageUrl: uploadedImageUrl,
            description: `${tokenDescription}\n\n🎯 Sniped with ${successfulSnipers}/${sniperResults.length} successful sniper transactions`,
          }
        );
        
        if (notificationSent) {
          console.log(`✅ Telegram notification sent successfully for ${tokenName}`);
        } else {
          console.log(`⚠️ Failed to send Telegram notification for ${tokenName}`);
        }
      } catch (error) {
        console.error(`❌ Error sending Telegram notification for ${tokenName}:`, error);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      tokenAddress: mint,
      poolAddress: poolAddressString,
      poolTxSignature: poolTxSignature,
      sniperResults: sniperResults,
      totalSnipers: sniperTransactions.length,
      successfulSnipers: sniperResults.filter(r => r.success).length
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('CreatePoolAndSnipe error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

async function uploadMetadata(
  ctx: { env: { BUCKET?: R2Bucket; R2?: R2Bucket; PINATA_JWT: string } },
  params: {
    tokenName: string;
    tokenSymbol: string;
    mint: string;
    image: string; // base64 string
    description: string;
  }
): Promise<{ metadataUrl: string; imageUrl: string } | false> {
  if (!ctx.env.PINATA_JWT) {
    throw new Error("PINATA_JWT is not set");
  }

  try {
    const pinata = new PinataSDK({
      pinataJwt: ctx.env.PINATA_JWT,
      pinataGateway: "storage.justspark.fun",
    });

    // 1. Convert base64 image to File
    const base64Data = params.image.split(",")[1];
    const imageBuffer = Uint8Array.from(atob(base64Data), (c) =>
      c.charCodeAt(0)
    );
    const imageFile = new File([imageBuffer], `${params.mint}.png`, {
      type: "image/png",
    });

    // 2. Upload image to IPFS
    const imageUpload = await pinata.upload.public.file(imageFile);
    const imageHash = (imageUpload as any).IpfsHash || (imageUpload as any).cid;
    if (!imageHash) throw new Error("No IPFS hash for image");

    const imageUrl = `https://storage.justspark.fun/ipfs/${imageHash}`;

    // 3. Create metadata JSON with IPFS image URL
    const metadata = {
      name: params.tokenName,
      symbol: params.tokenSymbol,
      description: params.description,
      image: imageUrl,
    };

    // 4. Upload metadata JSON
    const jsonBuffer = new TextEncoder().encode(
      JSON.stringify(metadata, null, 2)
    );
    const metadataFile = new File(
      [jsonBuffer],
      `metadata/${params.mint}.json`,
      { type: "application/json" }
    );

    const metadataUpload = await pinata.upload.public.file(metadataFile);
    const metadataHash =
      (metadataUpload as any).IpfsHash || (metadataUpload as any).cid;
    if (!metadataHash) throw new Error("No IPFS hash for metadata");

    const metadataUrl = `https://storage.justspark.fun/ipfs/${metadataHash}/${params.mint}.json`;
    console.log("Metadata URL:", metadataUrl);

    return { metadataUrl, imageUrl };
  } catch (error) {
    console.error("Error uploading metadata:", error);
    return false;
  }
}

async function createPoolTransaction({ 
  mint, 
  tokenName, 
  tokenSymbol, 
  metadataUrl, 
  userWallet 
}: { 
  mint: string; 
  tokenName: string; 
  tokenSymbol: string; 
  metadataUrl: string; 
  userWallet: string; 
}, ctx: { env: { RPC_URL: string, RPC_URL2: string, RPC_URL3: string, RPC_URL4: string, RPC_URL5: string, RPC_URL6: string, RPC_URL7: string, RPC_URL8: string, RPC_URL9: string, RPC_URL10: string, POOL_CONFIG_KEY: string } }) {
  const RPC_URL = ctx.env.RPC_URL as string;
  const POOL_CONFIG_KEY = ctx.env.POOL_CONFIG_KEY as string;
  console.log("RPC_URL:", RPC_URL);
  console.log("POOL_CONFIG_KEY:", POOL_CONFIG_KEY);

  // Validate public keys
  if (!userWallet || !PublicKey.isOnCurve(userWallet)) {
    throw new Error('Invalid user wallet address');
  }

  const connection = new Connection(RPC_URL, 'confirmed');

  // Debug: Check if pool config account exists
  try {
    const configPubkey = new PublicKey(POOL_CONFIG_KEY);
    const accountInfo = await connection.getAccountInfo(configPubkey);
    console.log("Pool config account exists:", !!accountInfo);
    if (!accountInfo) {
      throw new Error(`Pool config account ${POOL_CONFIG_KEY} does not exist on the blockchain. Please initialize it first.`);
    }
    console.log("Pool config account data length:", accountInfo.data.length);
  } catch (error) {
    console.error("Error checking pool config account:", error);
    throw error;
  }

  const client = new DynamicBondingCurveClient(connection, 'confirmed');
  
  // Verify the pool address that will be created
  const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
  const expectedPoolAddress = deriveDbcPoolAddress(
    new PublicKey(mint), // baseMint (token)
    SOL_MINT, // quoteMint (SOL)  
    new PublicKey(POOL_CONFIG_KEY) // config
  );
  console.log("🎯 Expected pool address from createPool:", expectedPoolAddress.toBase58());
  
  const poolTx = await client.pool.createPool({
    config: new PublicKey(POOL_CONFIG_KEY),
    baseMint: new PublicKey(mint),
    name: tokenName,
    symbol: tokenSymbol,
    uri: metadataUrl,
    payer: new PublicKey(userWallet),
    poolCreator: new PublicKey(userWallet),
  });

  console.log("✅ Pool transaction created");
  return poolTx;
}

async function createSniperTransaction({
  inputMint,
  outputMint,
  amount,
  sniperWallet,
  priorityFee,
  poolAddress,
  connection,
  poolConfigKey,
  poolTransaction
}: {
  inputMint: string;
  outputMint: string;
  amount: number;
  sniperWallet: string;
  priorityFee: number;
  poolAddress: string;
  connection: Connection;
  poolConfigKey: string;
  poolTransaction: Transaction;
}): Promise<Transaction | null> {
  try {
    console.log(`🔄 Creating DBC swap for sniper: ${amount} lamports of ${inputMint} -> ${outputMint}`);
    
    // Initialize DBC client
    const client = new DynamicBondingCurveClient(connection, 'confirmed');
    
    // Get pool state - if pool doesn't exist yet (same block), we'll create the transaction anyway
    const poolAddressPubkey = new PublicKey(poolAddress);
    let virtualPoolState;
    let poolConfigState;
    
    try {
      virtualPoolState = await client.state.getPool(poolAddressPubkey);
      if (!virtualPoolState) {
        console.log(`⏳ Pool not found yet (same block creation): ${poolAddress} - creating transaction anyway`);
        // We'll create a basic swap transaction that will work once the pool is created
        return await createBasicSwapTransaction({
          client,
          sniperWallet,
          poolAddress: poolAddressPubkey,
          amountIn: new BN(amount),
          priorityFee,
          connection,
          mint: outputMint,
          poolConfigKey: poolConfigKey,
          poolTransaction: poolTransaction
        });
      }

      // Get pool config
      poolConfigState = await client.state.getPoolConfig(virtualPoolState.config);
      if (!poolConfigState) {
        console.log(`⏳ Pool config not accessible yet - creating basic swap transaction`);
        return await createBasicSwapTransaction({
          client,
          sniperWallet,
          poolAddress: poolAddressPubkey,
          amountIn: new BN(amount),
          priorityFee,
          connection,
          mint: outputMint,
          poolConfigKey: poolConfigKey,
          poolTransaction: poolTransaction
        });
      }
    } catch (error) {
      console.log(`⏳ Pool state not accessible yet (same block): ${error} - creating transaction anyway`);
      return await createBasicSwapTransaction({
        client,
        sniperWallet,
        poolAddress: poolAddressPubkey,
        amountIn: new BN(amount),
        priorityFee,
        connection,
        mint: outputMint,
        poolConfigKey: poolConfigKey,
        poolTransaction: poolTransaction
      });
    }

    // Get current point (timestamp or slot based on activation type)
    const currentTime = Date.now();
    const currentPoint = poolConfigState.activationType === 0 
      ? Math.floor(currentTime / 400) // Slot-based (400ms per slot)
      : Math.floor(currentTime / 1000); // Timestamp-based (1000ms per second)

    console.log(`📊 Current point: ${currentPoint}, activation type: ${poolConfigState.activationType}`);

    // Get swap quote first
    const amountInBN = new BN(amount);
    const quote = await client.pool.swapQuote({
      virtualPool: virtualPoolState,
      config: poolConfigState,
      swapBaseForQuote: false, // Buying tokens (quote -> base)
      amountIn: amountInBN,
      slippageBps: 1000, // 10% slippage tolerance
      hasReferral: false,
      currentPoint: new BN(currentPoint),
    });

    if (!quote || quote.outputAmount.isZero()) {
      console.error(`❌ Invalid swap quote received`);
      return null;
    }

    console.log(`💰 DBC Quote: ${quote.outputAmount.toString()} tokens for ${amount} lamports`);

    // Calculate minimum amount out with slippage protection (90% of expected output)
    const minimumAmountOut = quote.outputAmount.mul(new BN(90)).div(new BN(100));

    // Create the swap transaction
    const swapTransaction = await client.pool.swap({
      owner: new PublicKey(sniperWallet),
      amountIn: amountInBN,
      minimumAmountOut: minimumAmountOut,
      swapBaseForQuote: false, // Buying tokens (SOL -> Token)
      pool: poolAddressPubkey,
      referralTokenAccount: null,
    });

    console.log(`✅ DBC swap transaction created successfully`);

    // Add priority fee instruction
    if (priorityFee > 0) {
      const { ComputeBudgetProgram } = await import('@solana/web3.js');
      const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
        microLamports: priorityFee,
      });
      swapTransaction.instructions.unshift(priorityFeeIx);
      console.log(`⚡ Added priority fee: ${priorityFee} micro-lamports`);
    }

    return swapTransaction;
  } catch (error) {
    console.error(`❌ Error creating DBC sniper transaction:`, error);
    return null;
  }
}

async function createBasicSwapTransaction({
  client,
  sniperWallet,
  poolAddress,
  amountIn,
  priorityFee,
  connection,
  mint,
  poolConfigKey,
  poolTransaction
}: {
  client: DynamicBondingCurveClient;
  sniperWallet: string;
  poolAddress: PublicKey;
  amountIn: BN;
  priorityFee: number;
  connection: Connection;
  mint: string;
  poolConfigKey: string;
  poolTransaction: Transaction;
}): Promise<Transaction | null> {
  try {
    console.log(`🔨 Creating manual swap transaction for same-block execution`);
    
    // Create manual swap transaction by constructing the raw instructions
    // This bypasses SDK validation and will work once pool is created
    const transaction = await createManualSwapTransaction({
      connection,
      sniperWallet: new PublicKey(sniperWallet),
      poolAddress,
      baseMint: new PublicKey(mint),
      quoteMint: new PublicKey("So11111111111111111111111111111111111111112"), // SOL
      amountIn,
      minimumAmountOut: new BN(1), // Minimal slippage protection
      priorityFee,
      poolConfigKey: poolConfigKey,
      poolTransaction: poolTransaction
    });

    console.log(`✅ Manual swap transaction created successfully`);
    return transaction;
  } catch (error) {
    console.error(`❌ Error creating manual swap transaction:`, error);
    return null;
  }
}

async function createManualSwapTransaction({
  connection,
  sniperWallet,
  poolAddress,
  baseMint,
  quoteMint,
  amountIn,
  minimumAmountOut,
  priorityFee,
  poolConfigKey,
  poolTransaction
}: {
  connection: Connection;
  sniperWallet: PublicKey;
  poolAddress: PublicKey;
  baseMint: PublicKey;
  quoteMint: PublicKey;
  amountIn: BN;
  minimumAmountOut: BN;
  priorityFee: number;
  poolConfigKey: string;
  poolTransaction: Transaction;
}): Promise<Transaction> {
  const transaction = new Transaction();

  try {
    // Add priority fee instructions
    if (priorityFee > 0) {
      const { ComputeBudgetProgram } = await import('@solana/web3.js');
      
      // Set compute unit limit
      transaction.add(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 120000,
        })
      );
      
      // Set compute unit price (priority fee)
      transaction.add(
        ComputeBudgetProgram.setComputeUnitPrice({
          microLamports: priorityFee,
        })
      );
      
      console.log(`⚡ Added priority fee: ${priorityFee} micro-lamports`);
    }

    // Get or create associated token accounts
    const { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createSyncNativeInstruction } = await import('@solana/spl-token');
    const { SystemProgram } = await import('@solana/web3.js');
    
    // Get associated token account for base token (the new token we're buying)
    const baseTokenAccount = await getAssociatedTokenAddress(
      baseMint,
      sniperWallet,
      false
    );

    // Get associated token account for quote token (SOL/WSOL)
    const quoteTokenAccount = await getAssociatedTokenAddress(
      quoteMint,
      sniperWallet,
      false
    );

    console.log(`📝 Creating token accounts for same-block execution`);
    console.log(`   Base token account: ${baseTokenAccount.toBase58()}`);
    console.log(`   Quote token account: ${quoteTokenAccount.toBase58()}`);

    // Create base token account using createAssociatedTokenAccountInstruction
    // Now that we wait for pool confirmation, the token mint should exist
    const createBaseAccountIx = createAssociatedTokenAccountInstruction(
      sniperWallet, // payer
      baseTokenAccount, // ata
      sniperWallet, // owner
      baseMint // mint
    );
    transaction.add(createBaseAccountIx);
    console.log(`🔧 Added create base token account instruction`);

    // Create quote token account (WSOL)
    const createQuoteAccountIx = createAssociatedTokenAccountInstruction(
      sniperWallet, // payer
      quoteTokenAccount, // ata
      sniperWallet, // owner
      quoteMint // mint (WSOL)
    );
    transaction.add(createQuoteAccountIx);
    console.log(`🔧 Added create quote token account instruction`);

    // Transfer SOL to WSOL account and sync
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: sniperWallet,
        toPubkey: quoteTokenAccount,
        lamports: amountIn.toNumber(),
      })
    );
    console.log(`💰 Added SOL transfer to WSOL account`);

    // Sync native instruction to convert SOL to WSOL
    transaction.add(createSyncNativeInstruction(quoteTokenAccount));
    console.log(`🔄 Added sync native instruction`);

    // Create the manual swap instruction
    // This is based on the successful transaction you showed
    const DBC_PROGRAM_ID = new PublicKey("dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN");
    const EVENT_AUTHORITY = new PublicKey("8Ks12pbrD6PXxfty1hVQiE9sc289zgU1zHkvXhrSdriF");
    
    // Extract pool authority from the pool transaction instead of hardcoding
    
    // Derive base and quote vaults using the correct DBC vault derivation
    // Based on the successful pool creation, let's try different seed combinations
    
    // Get config address from environment (don't hardcode dynamic values)
    const configAddress = new PublicKey(poolConfigKey);
    
    // Extract addresses from the pool creation transaction
    console.log(`🔍 Extracting addresses from pool creation transaction...`);
    
    let baseVault: PublicKey;
    let quoteVault: PublicKey;
    let poolAuthority: PublicKey;
    
    try {
      // Find the DBC instruction in the pool transaction
      const dbcInstructions = poolTransaction.instructions.filter(ix => 
        ix.programId.equals(DBC_PROGRAM_ID)
      );
      
      if (dbcInstructions.length === 0) {
        throw new Error("No DBC instruction found in pool transaction");
      }
      
      const createPoolIx = dbcInstructions[0];
      
      // Extract addresses from the create pool instruction
      // Based on the DBC createPool instruction layout:
      // Position 1: pool_authority
      // Position 6: base_vault
      // Position 7: quote_vault
      if (createPoolIx.keys.length < 8) {
        throw new Error(`Insufficient accounts in DBC instruction. Expected at least 8, got ${createPoolIx.keys.length}`);
      }
      
      poolAuthority = createPoolIx.keys[1].pubkey; // pool_authority position
      baseVault = createPoolIx.keys[6].pubkey; // base_vault position
      quoteVault = createPoolIx.keys[7].pubkey; // quote_vault position
      
      console.log(`✅ Successfully extracted addresses from pool transaction:`);
      console.log(`   Pool Authority: ${poolAuthority.toBase58()}`);
      console.log(`   Base vault: ${baseVault.toBase58()}`);
      console.log(`   Quote vault: ${quoteVault.toBase58()}`);
      
    } catch (extractError) {
      console.error(`❌ Error extracting addresses: ${extractError}`);
      throw extractError;
    }

    // Let me try using the DBC SDK's swap function to get the correct instruction
    // but modify it to work with same-block execution
    
    console.log(`🔧 Attempting to create swap instruction using DBC SDK...`);
    
    let swapInstructionData: Buffer;
    let swapInstruction: any;
    
    try {
      // Create a temporary DBC client to extract the instruction format
      const tempClient = new DynamicBondingCurveClient(connection, 'confirmed');
      
      // Try to use the SDK's swap function to get the proper instruction format
      const tempTransaction = await tempClient.pool.swap({
        owner: sniperWallet,
        amountIn,
        minimumAmountOut,
        swapBaseForQuote: false, // buying tokens with SOL
        pool: poolAddress,
        referralTokenAccount: null,
      });
      
      // Extract the DBC instruction from the transaction
      const dbcInstruction = tempTransaction.instructions.find(ix => 
        ix.programId.equals(DBC_PROGRAM_ID)
      );
      
      if (dbcInstruction) {
        swapInstructionData = dbcInstruction.data;
        swapInstruction = dbcInstruction;
        console.log(`✅ Successfully extracted DBC instruction from SDK`);
        console.log(`🔧 SDK instruction data: ${swapInstructionData.toString('hex')}`);
      } else {
        throw new Error("No DBC instruction found in SDK transaction");
      }
      
    } catch (sdkError) {
      console.log(`⚠️ SDK swap failed (expected for same-block): ${sdkError}`);
      console.log(`🔧 Falling back to manual instruction construction...`);
      
      // Fallback to manual instruction construction
      // Let's try the 'swap' instruction instead of 'swap2'
      // Calculate discriminator for "global:swap" instead of "global:swap2"
      const crypto = await import('crypto');
      const hash = crypto.createHash('sha256');
      hash.update('global:swap');
      const fullHash = hash.digest();
      const discriminator = fullHash.subarray(0, 8);
      
      console.log(`🔧 Trying 'swap' discriminator: ${discriminator.toString('hex')}`);
      
      const instructionData = Buffer.alloc(32);
      discriminator.copy(instructionData, 0);
      instructionData.writeBigUInt64LE(BigInt(amountIn.toString()), 8);
      instructionData.writeBigUInt64LE(BigInt(minimumAmountOut.toString()), 16);
      instructionData.writeBigUInt64LE(0n, 24);
      swapInstructionData = instructionData;
      
      console.log(`🔧 Manual 'swap' instruction data: ${swapInstructionData.toString('hex')}`);
    }
    
    // Log all account addresses for debugging
    console.log(`🔍 Account addresses for swap instruction:`);
    console.log(`  Pool Authority: ${poolAuthority.toBase58()}`);
    console.log(`  Config: ${configAddress.toBase58()}`);
    console.log(`  Pool: ${poolAddress.toBase58()}`);
    console.log(`  Quote Token Account (WSOL): ${quoteTokenAccount.toBase58()}`);
    console.log(`  Base Token Account: ${baseTokenAccount.toBase58()}`);
    console.log(`  Base Vault: ${baseVault.toBase58()}`);
    console.log(`  Quote Vault: ${quoteVault.toBase58()}`);
    console.log(`  Base Mint: ${baseMint.toBase58()}`);
    console.log(`  Quote Mint: ${quoteMint.toBase58()}`);
    console.log(`  Sniper Wallet: ${sniperWallet.toBase58()}`);
    console.log(`  Token Program: ${TOKEN_PROGRAM_ID.toBase58()}`);
    console.log(`  Event Authority: ${EVENT_AUTHORITY.toBase58()}`);
    console.log(`  DBC Program: ${DBC_PROGRAM_ID.toBase58()}`);
    
    // Create the swap instruction - use SDK instruction if available, otherwise manual
    let finalSwapInstruction: any;
    
    if (swapInstruction) {
      // Use the instruction extracted from SDK but with our accounts
      console.log(`🔧 Using SDK instruction structure with manual accounts`);
      finalSwapInstruction = {
        ...swapInstruction,
        keys: [
          { pubkey: poolAuthority, isSigner: false, isWritable: false }, // pool_authority
          { pubkey: configAddress, isSigner: false, isWritable: false }, // config
          { pubkey: poolAddress, isSigner: false, isWritable: true }, // pool
          { pubkey: quoteTokenAccount, isSigner: false, isWritable: true }, // input_token_account (WSOL)
          { pubkey: baseTokenAccount, isSigner: false, isWritable: true }, // output_token_account (token)
          { pubkey: baseVault, isSigner: false, isWritable: true }, // base_vault
          { pubkey: quoteVault, isSigner: false, isWritable: true }, // quote_vault
          { pubkey: baseMint, isSigner: false, isWritable: false }, // base_mint
          { pubkey: quoteMint, isSigner: false, isWritable: false }, // quote_mint
          { pubkey: sniperWallet, isSigner: true, isWritable: true }, // payer
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_base_program
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_quote_program
          { pubkey: DBC_PROGRAM_ID, isSigner: false, isWritable: false }, // referral_token_account (program as null)
          { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false }, // event_authority
          { pubkey: DBC_PROGRAM_ID, isSigner: false, isWritable: false }, // program
        ]
      };
    } else {
      // Fallback to manual instruction creation
      console.log(`🔧 Using manual instruction creation`);
      finalSwapInstruction = new Transaction().add({
        keys: [
          { pubkey: poolAuthority, isSigner: false, isWritable: false }, // pool_authority
          { pubkey: configAddress, isSigner: false, isWritable: false }, // config
          { pubkey: poolAddress, isSigner: false, isWritable: true }, // pool
          { pubkey: quoteTokenAccount, isSigner: false, isWritable: true }, // input_token_account (WSOL)
          { pubkey: baseTokenAccount, isSigner: false, isWritable: true }, // output_token_account (token)
          { pubkey: baseVault, isSigner: false, isWritable: true }, // base_vault
          { pubkey: quoteVault, isSigner: false, isWritable: true }, // quote_vault
          { pubkey: baseMint, isSigner: false, isWritable: false }, // base_mint
          { pubkey: quoteMint, isSigner: false, isWritable: false }, // quote_mint
          { pubkey: sniperWallet, isSigner: true, isWritable: true }, // payer
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_base_program
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_quote_program
          { pubkey: DBC_PROGRAM_ID, isSigner: false, isWritable: false }, // referral_token_account (program as null)
          { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false }, // event_authority
          { pubkey: DBC_PROGRAM_ID, isSigner: false, isWritable: false }, // program
        ],
        programId: DBC_PROGRAM_ID,
        data: swapInstructionData,
      }).instructions[0];
    }

    transaction.add(finalSwapInstruction);
    console.log(`🔄 Added swap instruction`);

    // Add close WSOL account instruction to get SOL back
    const { createCloseAccountInstruction } = await import('@solana/spl-token');
    transaction.add(
      createCloseAccountInstruction(
        quoteTokenAccount, // account to close
        sniperWallet, // destination for remaining lamports
        sniperWallet // owner
      )
    );
    console.log(`🔒 Added close WSOL account instruction`);

    return transaction;

  } catch (error) {
    console.error(`❌ Error in createManualSwapTransaction:`, error);
    throw error;
  }
}

function generateRandomPriorityFee(index: number): number {
  // Generate different priority fees for each sniper to increase chances of inclusion
  // Base fees: 10000, 15000, 20000, 25000, 30000 micro-lamports
  const baseFees = [10000, 15000, 20000, 25000, 30000];
  const baseFee = baseFees[index] || 10000;
  
  // Add random variation ±20%
  const variation = baseFee * 0.2 * (Math.random() - 0.5);
  const finalFee = Math.floor(baseFee + variation);
  
  console.log(`⚡ Sniper ${index + 1} priority fee: ${finalFee} micro-lamports`);
  return finalFee;
}
