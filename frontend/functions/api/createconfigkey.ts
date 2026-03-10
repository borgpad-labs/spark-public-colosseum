import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import bs58 from "bs58";
import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";
import { isApiKeyValid } from '../services/apiKeyService';

type ENV = {
  RPC_URL: string
  PRIVATE_KEY: string
  DB: D1Database
}

interface CreateConfigRequest {
  configAddress?: string; // Optional: if not provided, we'll generate one
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // Authorize request
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
    //   return jsonResponse(null, 401);
    // }

    // Parse request body safely - handle empty body since configAddress is optional
    let configAddress: string | undefined;
    try {
      const body = await ctx.request.text();
      if (body.trim()) {
        const parsedBody = JSON.parse(body) as CreateConfigRequest;
        configAddress = parsedBody.configAddress;
      }
    } catch (jsonError) {
      console.log("No JSON body provided or invalid JSON, using defaults");
      // configAddress remains undefined, which is fine
    }

    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    // Convert base58 string to Uint8Array and create wallet
    const privateKeyUint8Array = bs58.decode(privateKeyString);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const userWallet = wallet.publicKey;

    // Generate or use provided config address
    const configKeypair = configAddress ? 
      { publicKey: new PublicKey(configAddress) } : 
      Keypair.generate();
    const configPubkey = configKeypair.publicKey;

    const connection = new Connection(ctx.env.RPC_URL, 'confirmed');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Create config transaction based on the provided parameters
    const createConfigTx = await client.partner.createConfig({
      payer: userWallet,
      config: configPubkey,
      feeClaimer: userWallet, // Using the same wallet as fee claimer
      leftoverReceiver: userWallet, // Using the same wallet as leftover receiver
      quoteMint: new PublicKey('So11111111111111111111111111111111111111112'), // SOL
      poolFees: {
        baseFee: {
          cliffFeeNumerator: new BN('200000000'), // 200bps = 2%
          numberOfPeriod: 240,
          reductionFactor: new BN('208'), // d0 in hex = 208
          periodFrequency: new BN('1'), // 01 in hex = 1 (1 minute intervals)
          feeSchedulerMode: 1, // Exponential
        },
        dynamicFee: null, // Temporarily disable to fix type error
      },
      activationType: 0, // Slot-based activation
      collectFeeMode: 0, // Only Quote
      migrationOption: 1, // DAMM V2
      tokenType: 0, // SPL
      tokenDecimal: 9,
      migrationQuoteThreshold: new BN('1000000000'), // 3b9aca00 = 1e9
      partnerLpPercentage: 100, // 100% for partner
      creatorLpPercentage: 0, // 0% for creator
      partnerLockedLpPercentage: 100,
      creatorLockedLpPercentage: 0,
      sqrtStartPrice: new BN('58333726687135158'), // From example
      lockedVesting: {
        amountPerPeriod: new BN('0'),
        cliffDurationFromMigrationTime: new BN('0'),
        frequency: new BN('0'),
        numberOfPeriod: new BN('0'),
        cliffUnlockAmount: new BN('0'),
      },
      migrationFeeOption: 3, // 2% (FixedBps200)
      tokenSupply: {
        // Post-migration supply must not exceed pre-migration supply
        preMigrationTokenSupply: new BN('1000000000000000000'), // 1B total supply
        postMigrationTokenSupply: new BN('1000000000000000000'), // 1B total supply
      },
      creatorTradingFeePercentage: 2, // 2% creator trading fee
      tokenUpdateAuthority: 1, // Immutable (1)
      padding0: [],
      padding1: [],
      curve: [
        {
          sqrtPrice: new BN('233334906748540631'), // From example - much higher than start price
          liquidity: new BN('622226417996106429201027821619672729'), // Massive liquidity from example
        },
        {
          sqrtPrice: new BN('79226673521066979257578248091'), // From example - very high end price
          liquidity: new BN('1'), // Minimal liquidity at high price
        },
      ],
    });

    console.log("Config address:", configPubkey.toBase58());
    
    // Set transaction blockhash and fee payer
    const { blockhash } = await connection.getLatestBlockhash();
    createConfigTx.feePayer = userWallet;
    createConfigTx.recentBlockhash = blockhash;
    
    // Sign the transaction
    if (configAddress) {
      // If using provided address, only sign with wallet
      createConfigTx.sign(wallet);
    } else {
      // If generated new keypair, sign with both
      createConfigTx.sign(wallet, configKeypair as Keypair);
    }

    // Send transaction
    const txSignature = await connection.sendRawTransaction(createConfigTx.serialize(), { 
      skipPreflight: false, 
      preflightCommitment: 'confirmed' 
    });

    console.log("Config creation tx signature:", txSignature);

    return jsonResponse({
      success: true,
      configAddress: configPubkey.toBase58(),
      txSignature: txSignature,
      feeClaimer: userWallet.toBase58(),
      leftoverReceiver: userWallet.toBase58(),
    }, 200);

  } catch (e) {
    console.error('Config creation error:', e);
    await reportError(ctx.env.DB, e);
    return jsonResponse({ 
      error: e instanceof Error ? e.message : 'Unknown error',
      success: false 
    }, 500);
  }
}
