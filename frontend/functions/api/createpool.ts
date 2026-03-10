// src/pages/api/createToken.ts

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import bs58 from "bs58";
import { PinataSDK } from "pinata";
import { jsonResponse } from './cfPagesFunctionsUtils';
import { isApiKeyValid } from '../services/apiKeyService';
import { sendTokenNotification } from '../services/telegramBotService';


const PUBLIC_R2_URL = 'https://pub-85c7f5f0dc104dc784e656b623d999e5.r2.dev';

type ENV = {
  RPC_URL: string
  POOL_CONFIG_KEY: string
  PRIVATE_KEY: string
  PINATA_JWT: string
  DB: D1Database
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
}


interface CreatePoolRequest {
  tokenName: string;
  tokenSymbol: string;
  imageUrl: string;
  tokenDescription: string;
  twitterAccount: string;
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const request = ctx.request; // Extract the request from context
  const db = ctx.env.DB;
  try {

    // authorize request
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
    //   return jsonResponse(null, 401)
    // }

    const { tokenName, tokenSymbol, imageUrl, tokenDescription, twitterAccount } = await request.json() as CreatePoolRequest;

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
        status: 429, // Too Many Requests
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Rate limit check passed for ${twitterAccount} - proceeding with token creation`);

    const keyPair = Keypair.generate();
    const mint = keyPair.publicKey.toBase58();

    // // Upload image and metadata
    // const imageUrl = await uploadImage(tokenLogo, mint);
    // if (!imageUrl) {
    //   return new Response(JSON.stringify({ error: 'Failed to upload image' }), {
    //     status: 400,
    //     headers: { 'Content-Type': 'application/json' },
    //   });
    // }

    const uploadResult = await uploadMetadata(ctx, { tokenName, tokenSymbol, mint, image: imageUrl, description: tokenDescription });
    if (!uploadResult) {
      return new Response(JSON.stringify({ error: 'Failed to upload metadata' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const { metadataUrl, imageUrl: uploadedImageUrl } = uploadResult;

    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    // Convert base58 string to Uint8Array
    const privateKeyUint8Array = bs58.decode(privateKeyString);
    // Initialize your wallet
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const userWallet = wallet.publicKey.toBase58()
    console.log("userWallet:", userWallet);

    // Derive the pool address before creating the transaction
    const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
    const CONFIG_KEY = new PublicKey(ctx.env.POOL_CONFIG_KEY);
    const poolAddress = deriveDbcPoolAddress(
      SOL_MINT, // quoteMint (SOL)
      new PublicKey(mint), // baseMint (token)
      CONFIG_KEY // config
    );
    const poolAddressString = poolAddress.toBase58();
    console.log("Derived pool address:", poolAddressString);

    // Create pool transaction
    const poolTx = await createPoolTransaction({
      mint,
      tokenName,
      tokenSymbol,
      metadataUrl,
      userWallet,
    }, ctx);

    // console.log("poolTx:", poolTx);

    // Sign the transaction with the private key
    // try {
    //   const trimmedPrivateKey = PRIVATE_KEY.trim(); // Trim whitespace
    //   console.log("Encoded private key:", trimmedPrivateKey); // Log the private key

    //   const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(atob(trimmedPrivateKey))));
    //   poolTx.sign(keypair);
    // } catch (error) {
    //   console.error('Error decoding private key:', error);
    //   return new Response(JSON.stringify({ error: 'Invalid private key' }), {
    //     status: 400,
    //     headers: { 'Content-Type': 'application/json' },
    //   });
    // }

    poolTx.sign(wallet, keyPair);
    // Send transaction
    const connection = new Connection(ctx.env.RPC_URL, 'confirmed');
    // console.log("connection:", connection);
    const txSignature = await connection.sendRawTransaction(poolTx.serialize(), { skipPreflight: false, preflightCommitment: 'confirmed' });
    // console.log("txSignature:", txSignature);

    if (txSignature) {
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
            description: tokenDescription,
          }
        );
        
        if (notificationSent) {
          console.log(`✅ Telegram notification sent successfully for ${tokenName}`);
        } else {
          console.log(`⚠️ Failed to send Telegram notification for ${tokenName}`);
        }
      } catch (error) {
        console.error(`❌ Error sending Telegram notification for ${tokenName}:`, error);
        // Don't fail the entire request if notification fails
      }
    }

    // // Wait 60 seconds before sending response
    // console.log("Waiting 60 seconds before sending response...");
    // await new Promise(resolve => setTimeout(resolve, 60000));
    // console.log("60 second delay completed, sending response");

    return new Response(JSON.stringify({
      success: true,
      tokenAddress: mint,
      poolAddress: poolAddressString,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Upload error:', error);
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

async function createPoolTransaction({ mint, tokenName, tokenSymbol, metadataUrl, userWallet }: { mint: string; tokenName: string; tokenSymbol: string; metadataUrl: string; userWallet: string; }, ctx: { env: { RPC_URL: string, POOL_CONFIG_KEY: string } }) {

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
  // console.log("client:", client);
  const poolTx = await client.pool.createPool({
    config: new PublicKey(POOL_CONFIG_KEY),
    baseMint: new PublicKey(mint),
    name: tokenName,
    symbol: tokenSymbol,
    uri: metadataUrl,
    payer: new PublicKey(userWallet),
    poolCreator: new PublicKey(userWallet),
  });
  // console.log("poolTx:", poolTx);
  const { blockhash } = await connection.getLatestBlockhash();
  poolTx.feePayer = new PublicKey(userWallet);
  poolTx.recentBlockhash = blockhash;
  console.log("poolTx:", poolTx);
  return poolTx;
}
