// src/pages/api/withdrawLeftover.ts

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

interface WithdrawLeftoverRequest {
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

    const { poolAddress, tokenMint } = await request.json() as WithdrawLeftoverRequest;

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
    const payerWallet = wallet.publicKey;
    
    console.log("Payer wallet:", payerWallet.toBase58());
    console.log("Pool address:", finalPoolAddress);

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
      
      console.log("Pool found:", poolInfo.baseMint.toBase58());
      
      // Check if pool has migrated (leftover withdrawal is typically done after migration)
      if (!poolInfo.isMigrated) {
        console.log("Warning: Pool has not migrated yet. Leftover withdrawal is typically done after migration.");
      }
      
    } catch (error) {
      console.error("Error fetching pool info:", error);
      return new Response(JSON.stringify({ error: 'Failed to fetch pool information' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get pool config to check leftover receiver
    try {
      const poolInfo = await client.state.getPool(new PublicKey(poolAddress));
      const configInfo = await client.state.getPoolConfig(poolInfo.config);
      
      console.log("Leftover receiver:", configInfo.leftoverReceiver.toBase58());
      
      // Note: The leftover tokens will be sent to the leftoverReceiver specified in the config
      // This is different from surplus withdrawal which goes to the creator
      
    } catch (error) {
      console.error("Error fetching config info:", error);
      // Continue with the transaction as this is just for logging
    }

    // Create withdraw leftover transaction
    const withdrawTx = await client.migration.withdrawLeftover({
      payer: payerWallet,
      virtualPool: new PublicKey(finalPoolAddress),
    });

    console.log("Withdraw leftover transaction created");

    // Set transaction parameters
    const { blockhash } = await connection.getLatestBlockhash();
    withdrawTx.feePayer = payerWallet;
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
    
    console.log("Withdraw leftover transaction signature:", txSignature);

    // Wait for confirmation
    const confirmation = await connection.confirmTransaction(txSignature, 'confirmed');
    
    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${confirmation.value.err}`);
    }

    // Log the withdrawal in the database (optional)
    try {
      await db
        .prepare("INSERT INTO withdrawals (pool_address, payer_wallet, tx_signature, withdrawal_type, created_at) VALUES (?1, ?2, ?3, ?4, datetime('now'))")
        .bind(finalPoolAddress, payerWallet.toBase58(), txSignature, 'leftover')
        .run();
      console.log("Leftover withdrawal logged to database");
    } catch (dbError) {
      console.error("Failed to log withdrawal to database:", dbError);
      // Don't fail the entire operation if logging fails
    }

    return new Response(JSON.stringify({
      success: true,
      txSignature,
      poolAddress: finalPoolAddress,
      payerWallet: payerWallet.toBase58(),
      note: "Leftover tokens have been sent to the leftoverReceiver specified in the pool config"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Withdraw leftover error:', error);
    
    // Provide more specific error messages for common issues
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      if (error.message.includes('Account does not exist')) {
        errorMessage = 'Pool account not found or has no leftover tokens to withdraw';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds to pay for transaction fees';
      } else if (error.message.includes('not migrated')) {
        errorMessage = 'Pool must be migrated before withdrawing leftover tokens';
      } else {
        errorMessage = error.message;
      }
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
