// src/pages/api/derivePoolAddress.ts

import { PublicKey } from '@solana/web3.js';
import { deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';

type ENV = {
  POOL_CONFIG_KEY: string
}

interface DerivePoolAddressRequest {
  tokenMint: string;
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const request = ctx.request;
  
  try {
    const { tokenMint } = await request.json() as DerivePoolAddressRequest;

    // Validate required fields
    if (!tokenMint) {
      return new Response(JSON.stringify({ error: 'Token mint address is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate token mint format
    try {
      new PublicKey(tokenMint);
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Invalid token mint format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Derive pool address
    const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
    const CONFIG_KEY = new PublicKey(ctx.env.POOL_CONFIG_KEY);
    const poolAddress = deriveDbcPoolAddress(
      SOL_MINT, // quoteMint (SOL)
      new PublicKey(tokenMint), // baseMint (token)
      CONFIG_KEY // config
    );

    console.log(`Derived pool address for token ${tokenMint}:`, poolAddress.toBase58());

    return new Response(JSON.stringify({
      success: true,
      tokenMint,
      poolAddress: poolAddress.toBase58(),
      quoteMint: SOL_MINT.toBase58(),
      configKey: CONFIG_KEY.toBase58(),
      note: "This is the correct DBC pool address for your token"
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Derive pool address error:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
