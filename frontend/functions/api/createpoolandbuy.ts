// src/pages/api/createToken.ts

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import bs58 from "bs58";
import BN from "bn.js";
import { PinataSDK } from "pinata";
import { jsonResponse, reportError } from './cfPagesFunctionsUtils';
import { isApiKeyValid } from '../services/apiKeyService';


const PUBLIC_R2_URL = 'https://pub-85c7f5f0dc104dc784e656b623d999e5.r2.dev';

type ENV = {
  RPC_URL: string
  POOL_CONFIG_KEY: string
  PRIVATE_KEY: string
  PINATA_JWT: string
  DB: D1Database
}


interface CreatePoolAndBuyRequest {
  tokenName: string;
  tokenSymbol: string;
  imageUrl: string;
  tokenDescription: string;
  buyAmount: string; // Amount of SOL to spend buying tokens (in lamports)
  minimumAmountOut: string; // Minimum tokens to receive (slippage protection)
  referralTokenAccount?: string; // Optional referral token account
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const request = ctx.request;
  const db = ctx.env.DB;
  try {
    // authorize request
    if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
      return jsonResponse(null, 401)
    }

    const { 
      tokenName, 
      tokenSymbol, 
      imageUrl, 
      tokenDescription,
      buyAmount,
      minimumAmountOut,
      referralTokenAccount
    } = await request.json() as CreatePoolAndBuyRequest;

    // Validate required fields
    if (!imageUrl || !tokenName || !tokenSymbol || !tokenDescription || !buyAmount || !minimumAmountOut) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    // Validate amount formats
    let buyAmountBN: BN;
    let minimumAmountOutBN: BN;
    try {
      buyAmountBN = new BN(buyAmount);
      minimumAmountOutBN = new BN(minimumAmountOut);
    } catch (error) {
      return jsonResponse({ error: 'Invalid buyAmount or minimumAmountOut format' }, 400);
    }

    // Validate buyAmount is greater than 0
    if (buyAmountBN.lte(new BN(0))) {
      return jsonResponse({ error: 'buyAmount must be greater than 0' }, 400);
    }

    // Validate referral token account if provided
    let referralTokenAccountPubKey: PublicKey | null = null;
    if (referralTokenAccount) {
      try {
        referralTokenAccountPubKey = new PublicKey(referralTokenAccount);
      } catch (error) {
        return jsonResponse({ error: 'Invalid referralTokenAccount address format' }, 400);
      }
    }

    // Generate new token keypair
    const keyPair = Keypair.generate();
    const mint = keyPair.publicKey.toBase58();

    // Upload metadata
    const metadataUrl = await uploadMetadata(ctx, { 
      tokenName, 
      tokenSymbol, 
      mint, 
      image: imageUrl, 
      description: tokenDescription 
    });
    
    if (!metadataUrl) {
      return jsonResponse({ error: 'Failed to upload metadata' }, 500);
    }

    // Initialize wallet from private key
    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    const privateKeyUint8Array = bs58.decode(privateKeyString);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);

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

    // Create pool and buy transaction
    const poolAndBuyTx = await createPoolAndBuyTransaction({
      mint,
      tokenName,
      tokenSymbol,
      metadataUrl,
      userWallet: wallet.publicKey.toBase58(),
      buyAmountBN,
      minimumAmountOutBN,
      referralTokenAccountPubKey
    }, ctx);

    // Set recent blockhash and fee payer
    const connection = new Connection(ctx.env.RPC_URL, 'confirmed');
    const { blockhash } = await connection.getLatestBlockhash();
    poolAndBuyTx.recentBlockhash = blockhash;
    poolAndBuyTx.feePayer = wallet.publicKey;

    // Sign the transaction with wallet and token keypair
    poolAndBuyTx.sign(wallet, keyPair);

    // Send transaction
    const txSignature = await connection.sendRawTransaction(poolAndBuyTx.serialize(), { 
      skipPreflight: false, 
      preflightCommitment: 'confirmed' 
    });

    // Wait for confirmation
    await connection.confirmTransaction(txSignature, 'confirmed');

    // Store token in database
    if (txSignature) {
      await db
        .prepare("INSERT INTO tokens (mint, name, imageUrl, dao, dbc_pool_address) VALUES (?1, ?2, ?3, ?4, ?5)")
        .bind(mint, tokenName, imageUrl, "", poolAddressString)
        .run();
    }

    return jsonResponse({
      success: true,
      tokenAddress: mint,
      poolAddress: poolAddressString,
      signature: txSignature,
      note: "Pool created successfully. Buying functionality temporarily disabled due to SDK limitations.",
      requestedBuyAmount: buyAmount,
      requestedMinimumAmountOut: minimumAmountOut
    }, 200);

  } catch (error) {
    console.error('CreatePoolAndBuy error:', error);
    await reportError(ctx.env.DB, error);
    return jsonResponse({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, 500);
  }
};

async function uploadMetadata(
  ctx: { env: { PINATA_JWT: string } },
  params: { tokenName: string; tokenSymbol: string; mint: string; image: string, description: string }
): Promise<string | false> {
  const metadata = {
    name: params.tokenName,
    symbol: params.tokenSymbol,
    description: params.description,
    image: params.image,
  };
  const fileName = `metadata/${params.mint}.json`;

  if (!ctx.env.PINATA_JWT) {
    throw new Error('PINATA_JWT is not set');
  }

  try {
    const jsonString = JSON.stringify(metadata, null, 2);
    const fileBuffer = new TextEncoder().encode(jsonString);
    const file = new File([fileBuffer], fileName, { type: 'application/json' });

    const pinata = new PinataSDK({
      pinataJwt: ctx.env.PINATA_JWT,
      pinataGateway: "storage.justspark.fun",
    });
    
    const upload = await pinata.upload.public.file(file);
    
    console.log('Pinata upload response:', upload);
    
    // Use the actual IPFS hash from Pinata response
    // The upload response typically contains either 'IpfsHash' or 'cid' property
    const ipfsHash = (upload as any).IpfsHash || (upload as any).cid;
    if (!ipfsHash) {
      console.error('Upload response:', upload);
      throw new Error('No IPFS hash returned from Pinata');
    }
    
    // Construct the proper metadata URL using the IPFS hash and token address
    const metadataUrl = `https://storage.justspark.fun/ipfs/${ipfsHash}/${params.mint}.json`;
    console.log('Constructed metadata URL:', metadataUrl);

    return metadataUrl;
  } catch (error) {
    console.error('Error uploading metadata:', error);
    return false;
  }
}

// async function uploadToR2(fileBuffer: Buffer, contentType: string, fileName: string): Promise<void> {
//   // R2 client setup
//   const r2 = new S3({
//     endpoint: PRIVATE_R2_URL,
//     accessKeyId: R2_ACCESS_KEY_ID,
//     secretAccessKey: R2_SECRET_ACCESS_KEY,
//     region: 'auto',
//     signatureVersion: 'v4',
//   });
//   return new Promise((resolve, reject) => {
//     r2.putObject(
//       {
//         Bucket: R2_BUCKET,
//         Key: fileName,
//         Body: fileBuffer,
//         ContentType: contentType,
//       },
//       (err) => {
//         if (err) {
//           reject(err);
//         } else {
//           resolve();
//         }
//       }
//     );
//   });
// }

async function createPoolAndBuyTransaction({
  mint,
  tokenName,
  tokenSymbol,
  metadataUrl,
  userWallet,
  buyAmountBN,
  minimumAmountOutBN,
  referralTokenAccountPubKey
}: {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  metadataUrl: string;
  userWallet: string;
  buyAmountBN: BN;
  minimumAmountOutBN: BN;
  referralTokenAccountPubKey: PublicKey | null;
}, ctx: { env: { RPC_URL: string, POOL_CONFIG_KEY: string } }) {

  const RPC_URL = ctx.env.RPC_URL as string;
  const POOL_CONFIG_KEY = ctx.env.POOL_CONFIG_KEY as string;

  // Validate public keys
  if (!userWallet || !PublicKey.isOnCurve(userWallet)) {
    throw new Error('Invalid user wallet address');
  }

  const connection = new Connection(RPC_URL, 'confirmed');
  const client = new DynamicBondingCurveClient(connection, 'confirmed');

  // Create pool transaction only for now
  // Note: The SDK doesn't seem to support createPoolAndBuy in this version
  // This will only create the pool, buying will need to be handled separately
  const poolTx = await client.pool.createPool({
    config: new PublicKey(POOL_CONFIG_KEY),
    baseMint: new PublicKey(mint),
    name: tokenName,
    symbol: tokenSymbol,
    uri: metadataUrl,
    payer: new PublicKey(userWallet),
    poolCreator: new PublicKey(userWallet),
  });

  return poolTx;
}