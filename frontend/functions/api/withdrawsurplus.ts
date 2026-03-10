// src/pages/api/withdrawSurplus.ts

import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import bs58 from "bs58";
import { jsonResponse } from './cfPagesFunctionsUtils';
import { isApiKeyValid } from '../services/apiKeyService';

type ENV = {
  RPC_URL: string
  PRIVATE_KEY: string
  POOL_CONFIG_KEY: string
  DB: D1Database
}

interface WithdrawSurplusRequest {
  poolAddress?: string;
  tokenMint?: string; // Alternative: provide token mint to derive pool address
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const request = ctx.request;
  const db = ctx.env.DB;
  
  try {
    // Authorize request (uncomment when needed)
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
    //   return jsonResponse(null, 401)
    // }

    const { poolAddress, tokenMint } = await request.json() as WithdrawSurplusRequest;

    // Determine the pool address
    let finalPoolAddress: string;
    
    if (poolAddress) {
      // Validate pool address format
      try {
        new PublicKey(poolAddress);
        finalPoolAddress = poolAddress;
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid pool address format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else if (tokenMint) {
      // Derive pool address from token mint
      try {
        new PublicKey(tokenMint);
        const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
        const CONFIG_KEY = new PublicKey(ctx.env.POOL_CONFIG_KEY);
        const derivedPoolAddress = deriveDbcPoolAddress(
          SOL_MINT, // quoteMint (SOL)
          new PublicKey(tokenMint), // baseMint (token)
          CONFIG_KEY // config
        );
        finalPoolAddress = derivedPoolAddress.toBase58();
        console.log("Derived pool address from token mint:", finalPoolAddress);
      } catch (error) {
        return new Response(JSON.stringify({ error: 'Invalid token mint format' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      return new Response(JSON.stringify({ 
        error: 'Either poolAddress or tokenMint is required',
        example: {
          "poolAddress": "3GJjQsrnaoaj4Wu82quQ9AxZU29RbCgRajHa3CU8xdBQ",
          "or": "provide tokenMint to auto-derive pool address",
          "tokenMint": "BsP7oPGec1UFWyuurGcjUoXNPAa5m24T3exhX8A5LdgJ"
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    // Convert base58 string to Uint8Array
    const privateKeyUint8Array = bs58.decode(privateKeyString);
    // Initialize your wallet
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const creatorWallet = wallet.publicKey;
    
    console.log("Creator wallet:", creatorWallet.toBase58());
    console.log("Pool address:", poolAddress);

    // Create connection
    const connection = new Connection(ctx.env.RPC_URL, 'confirmed');
    
    // Initialize DBC client
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Verify pool exists and get pool info
    try {
      // First check if the account exists and has the correct structure
      const poolAccountInfo = await connection.getAccountInfo(new PublicKey(finalPoolAddress));
      if (!poolAccountInfo) {
        return new Response(JSON.stringify({ 
          error: 'Pool account not found. Please verify the pool address is correct.' 
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      console.log("Pool account found, data length:", poolAccountInfo.data.length);
      
      const poolInfo = await client.state.getPool(new PublicKey(finalPoolAddress));
      if (!poolInfo) {
        return new Response(JSON.stringify({ 
          error: 'Invalid pool data structure. This may not be a valid DBC pool address.' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      // Verify the creator is authorized to withdraw from this pool
      if (!poolInfo.creator.equals(creatorWallet)) {
        return new Response(JSON.stringify({ error: 'Unauthorized: You are not the creator of this pool' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      
      console.log("Pool creator verified:", poolInfo.creator.toBase58());
    } catch (error) {
      console.error("Error fetching pool info:", error);
      return new Response(JSON.stringify({ error: 'Failed to fetch pool information' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create withdraw surplus transaction
    const withdrawTx = await client.creator.creatorWithdrawSurplus({
      creator: creatorWallet,
      virtualPool: new PublicKey(finalPoolAddress),
    });

    console.log("Withdraw transaction created");

    // Set transaction parameters
    const { blockhash } = await connection.getLatestBlockhash();
    withdrawTx.feePayer = creatorWallet;
    withdrawTx.recentBlockhash = blockhash;

    // Sign the transaction
    withdrawTx.sign(wallet);
    
    // Send transaction
    const txSignature = await connection.sendRawTransaction(
      withdrawTx.serialize(), 
      { 
        skipPreflight: false, 
        preflightCommitment: 'confirmed' 
      }
    );
    
    console.log("Withdraw surplus transaction signature:", txSignature);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(txSignature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    // Log the withdrawal in the database (optional)
    try {
      await db
        .prepare("INSERT INTO withdrawals (pool_address, creator_wallet, tx_signature, withdrawal_type, created_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))")
        .bind(finalPoolAddress, creatorWallet.toBase58(), txSignature, 'surplus')
        .run();
      console.log("Withdrawal logged to database");
    } catch (dbError) {
      console.error("Failed to log withdrawal to database:", dbError);
      // Don't fail the entire operation if logging fails
    }

    return new Response(JSON.stringify({
      success: true,
      txSignature,
      poolAddress: finalPoolAddress,
      creatorWallet: creatorWallet.toBase58(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Withdraw surplus error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
