import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';
import bs58 from "bs58";
import { jsonResponse, reportError } from "./cfPagesFunctionsUtils";
import { isApiKeyValid } from '../services/apiKeyService';
import { getRpcUrlForCluster } from '../../shared/solana/rpcUtils';

type ENV = {
  RPC_URL: string
  PRIVATE_KEY: string
  DB: D1Database
}

interface BuildCurveAndCreateConfigByMarketCapParam {
  network?: 'devnet' | 'mainnet' // Network to use (optional, defaults to devnet)
  buildCurveByMarketCapParam?: {
    totalTokenSupply: number // The total token supply
    initialMarketCap: number // The initial market cap
    migrationMarketCap: number // The migration market cap
    migrationOption: number // 0: DAMM V1, 1: DAMM v2
    tokenBaseDecimal: number // The number of decimals for the base token
    tokenQuoteDecimal: number // The number of decimals for the quote token
    lockedVesting: {
      // Optional locked vesting (BN (0) for all fields for no vesting)
      amountPerPeriod: BN // The amount of tokens that will be vested per period
      cliffDurationFromMigrationTime: BN // The duration of the cliff period
      frequency: BN // The frequency of the vesting
      numberOfPeriod: BN // The number of periods
      cliffUnlockAmount: BN // The amount of tokens that will be unlocked at the cliff
    }
    feeSchedulerParam: {
      // Optional fee scheduler (BN (0) for all fields for no fee scheduler)
      numberOfPeriod: number // The number of periods
      reductionFactor: number // The reduction factor
      periodFrequency: number // The frequency of the fee reduction
      feeSchedulerMode: number // 0: Linear, 1: Exponential
    }
    baseFeeBps: number // The base fee in bps
    dynamicFeeEnabled: boolean // Whether dynamic fee is enabled (true: enabled, false: disabled)
    activationType: number // 0: Slot, 1: Timestamp
    collectFeeMode: number // 0: Only Quote, 1: Both
    migrationFeeOption: number // 0: Fixed 25bps, 1: Fixed 30bps, 2: Fixed 100bps, 3: Fixed 200bps, 4: Fixed 400bps, 5: Fixed 600bps
    tokenType: number // 0: SPL, 1: Token2022
    partnerLpPercentage: number // The percentage of the pool that will be allocated to the partner
    creatorLpPercentage: number // The percentage of the pool that will be allocated to the creator
    partnerLockedLpPercentage: number // The percentage of the pool that will be allocated to the partner locked
    creatorLockedLpPercentage: number // The percentage of the pool that will be allocated to the creator locked
    creatorTradingFeePercentage: number // The percentage of the trading fee that will be allocated to the creator
    leftover?: number // The leftover parameter (optional, defaults to 0% - consider 10% for MM/Airdrop/DAO)
    tokenUpdateAuthority?: number // 0 - CreatorUpdateAuthority, 1 - Immutable, 2 - PartnerUpdateAuthority, 3 - CreatorUpdateAndMintAuthority, 4 - PartnerUpdateAndMintAuthority
  }
  feeClaimer?: string // The wallet that will be able to claim the fee (optional, defaults to payer)
  leftoverReceiver?: string // The wallet that will receive the bonding curve leftover (optional, defaults to payer)
  payer?: string // The wallet that will pay for the transaction (optional, defaults to env wallet)
  quoteMint?: string // The quote mint address (optional, defaults to SOL)
  config?: string // The config account address (optional, generated if not provided)
}

// Helper function to convert BN-like objects to BN instances
function ensureBN(value: any): BN {
  if (value instanceof BN) return value;
  if (typeof value === 'string') return new BN(value);
  if (typeof value === 'number') return new BN(value);
  return new BN(value.toString());
}

/**
 * Create a bonding curve configuration using hardcoded market cap parameters
 * 
 * This endpoint creates a dynamic bonding curve configuration with predefined values:
 * - Quote Mint: SOL
 * - Total Token Supply: 1B tokens
 * - Market Cap Range: 42.069 → 420.69 SOL (10x growth) [HARDCODED]
 * - Leftover: 0% [HARDCODED]
 * - Dynamic Fees: Enabled for optimal price discovery
 * - Token Type: SPL (immutable)
 * - Migration: DAMM V2 with 2% fee
 * - Liquidity: 0% partner, 100% creator
 * 
 * Key Features:
 * - No request body required - works with empty POST request
 * - Network selection: devnet (default) or mainnet via request body
 * - Hardcoded market cap values for consistency
 * - Optional body for overriding other parameters (except initialMarketCap, migrationMarketCap, leftover)
 * - Automatic curve calculation based on market cap targets
 * - Slot-based activation with quote-only fee collection
 * - No locked vesting or fee scheduling by default
 * 
 * @example
 * // Empty request (uses devnet by default)
 * POST /api/createconfigkeybymarketcap
 * 
 * // Network selection
 * POST /api/createconfigkeybymarketcap
 * { "network": "mainnet" }
 * 
 * // Network + parameter overrides
 * POST /api/createconfigkeybymarketcap
 * { 
 *   "network": "mainnet",
 *   "buildCurveByMarketCapParam": { "totalTokenSupply": 500000000 }
 * }
 */
export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // Authorize request
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
    //   return jsonResponse(null, 401);
    // }

    // Parse optional request body for overrides
    let params: BuildCurveAndCreateConfigByMarketCapParam | null = null;
    try {
      const body = await ctx.request.text();
      if (body.trim()) {
        params = JSON.parse(body) as BuildCurveAndCreateConfigByMarketCapParam;
      }
    } catch (error) {
      console.log("No valid JSON body provided, using defaults");
    }

    // Network selection
    const rpcUrl = ctx.env.RPC_URL;
    
    console.log(`Using RPC: ${rpcUrl}`);

    // Hardcoded configuration values
    const INITIAL_MARKET_CAP = 0.042069; // Initial market cap in SOL
    const MIGRATION_MARKET_CAP = 0.42069; // Migration market cap in SOL (10x growth)
    const LEFTOVER = 0; // No leftover (consider 10% for MM/Airdrop/DAO)

    // Apply default values based on recommended configuration
    const defaultParams = {
      totalTokenSupply: 1000000000, // 1 billion tokens (as requested by user)
      initialMarketCap: INITIAL_MARKET_CAP,
      migrationMarketCap: MIGRATION_MARKET_CAP,
      migrationOption: 1, // DAMM V2
      tokenBaseDecimal: 9, // Standard SPL token decimals
      tokenQuoteDecimal: 9, // SOL decimals
      leftover: LEFTOVER,
      tokenType: 0, // SPL token
      dynamicFeeEnabled: true, // Enable dynamic fees
      activationType: 0, // Slot-based activation
      collectFeeMode: 0, // Quote only fee collection
      migrationFeeOption: 3, // 2% migration fee (Fixed 200bps)
      partnerLpPercentage: 0, // 0% to partner (as requested by user)
      creatorLpPercentage: 100, // 100% to creator (as requested by user)
      partnerLockedLpPercentage: 0, // 0% locked for partner (as requested by user)
      creatorLockedLpPercentage: 0, // 0% locked for creator (as requested by user)
      baseFeeBps: 200, // 200 bps = 2% base fee
      creatorTradingFeePercentage: 0, // 0% creator trading fee (as requested by user)
      tokenUpdateAuthority: 1, // Immutable (1)
      feeSchedulerParam: {
        numberOfPeriod: 0, // No fee scheduling
        reductionFactor: 0,
        periodFrequency: 0,
        feeSchedulerMode: 0,
      },
      lockedVesting: {
        amountPerPeriod: new BN(0), // No vesting
        cliffDurationFromMigrationTime: new BN(0),
        frequency: new BN(0),
        numberOfPeriod: new BN(0),
        cliffUnlockAmount: new BN(0),
      },
    };

    // Merge provided params with defaults (if any params provided)
    const finalParams = params?.buildCurveByMarketCapParam ? {
      ...defaultParams,
      ...params.buildCurveByMarketCapParam,
      // Always use hardcoded values for these three parameters
      initialMarketCap: INITIAL_MARKET_CAP,
      migrationMarketCap: MIGRATION_MARKET_CAP,
      leftover: LEFTOVER,
      feeSchedulerParam: {
        ...defaultParams.feeSchedulerParam,
        ...params.buildCurveByMarketCapParam.feeSchedulerParam,
      },
      lockedVesting: {
        ...defaultParams.lockedVesting,
        ...params.buildCurveByMarketCapParam.lockedVesting,
      },
    } : defaultParams;

    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    // Convert base58 string to Uint8Array and create wallet
    const privateKeyUint8Array = bs58.decode(privateKeyString);
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    const userWallet = wallet.publicKey;

    // Set up wallet addresses
    const payerWallet = params?.payer ? new PublicKey(params.payer) : userWallet;
    const feeClaimerWallet = params?.feeClaimer ? new PublicKey(params.feeClaimer) : userWallet;
    const leftoverReceiverWallet = params?.leftoverReceiver ? new PublicKey(params.leftoverReceiver) : userWallet;
    const quoteMintAddress = params?.quoteMint ? new PublicKey(params.quoteMint) : new PublicKey('So11111111111111111111111111111111111111112'); // SOL

    // Generate or use provided config address
    const configKeypair = params?.config ? 
      { publicKey: new PublicKey(params.config) } : 
      Keypair.generate();
    const configPubkey = configKeypair.publicKey;

    const connection = new Connection(rpcUrl, 'confirmed');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Build curve parameters manually since buildCurveWithMarketCap is not available in this SDK version

    // Create config transaction using the built curve parameters
    const createConfigTx = await client.partner.createConfig({
      payer: payerWallet,
      config: configPubkey,
      feeClaimer: feeClaimerWallet,
      leftoverReceiver: leftoverReceiverWallet,
      quoteMint: quoteMintAddress,
      poolFees: {
        baseFee: {
          cliffFeeNumerator: new BN('200000000'), // 200bps = 2%
          numberOfPeriod: 0,
          reductionFactor: new BN('0'),
          periodFrequency: new BN('0'),
          feeSchedulerMode: 0, // Linear
        },
        dynamicFee: null, // Temporarily disabled to match working file
      },
      activationType: finalParams.activationType, // 0 for Slot-based
      collectFeeMode: finalParams.collectFeeMode, // 0 for Quote only
      migrationOption: finalParams.migrationOption, // 1 for DAMM V2
      tokenType: finalParams.tokenType, // 0 for SPL
      tokenDecimal: finalParams.tokenBaseDecimal, // 9
      migrationQuoteThreshold: new BN(Math.floor(finalParams.migrationMarketCap * 1e9)), // Convert SOL to lamports
      partnerLpPercentage: finalParams.partnerLpPercentage, // 0% for partner
      creatorLpPercentage: finalParams.creatorLpPercentage, // 100% for creator
      partnerLockedLpPercentage: finalParams.partnerLockedLpPercentage, // 0% locked for partner
      creatorLockedLpPercentage: finalParams.creatorLockedLpPercentage, // 0% locked for creator
      sqrtStartPrice: new BN('58333726687135158'), // From example
      lockedVesting: {
        amountPerPeriod: new BN('0'),
        cliffDurationFromMigrationTime: new BN('0'),
        frequency: new BN('0'),
        numberOfPeriod: new BN('0'),
        cliffUnlockAmount: new BN('0'),
      },
      migrationFeeOption: finalParams.migrationFeeOption, // 3 for 2% (FixedBps200)
      tokenSupply: {
        preMigrationTokenSupply: new BN(finalParams.totalTokenSupply).mul(new BN(10).pow(new BN(finalParams.tokenBaseDecimal))), // 1B * 10^9
        postMigrationTokenSupply: new BN(finalParams.totalTokenSupply).mul(new BN(10).pow(new BN(finalParams.tokenBaseDecimal))), // 1B * 10^9
      },
      creatorTradingFeePercentage: finalParams.creatorTradingFeePercentage, // 0% creator trading fee
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
    createConfigTx.feePayer = payerWallet;
    createConfigTx.recentBlockhash = blockhash;
    
    // Sign the transaction
    if (params?.config) {
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
      feeClaimer: feeClaimerWallet.toBase58(),
      leftoverReceiver: leftoverReceiverWallet.toBase58(),
      payer: payerWallet.toBase58(),
      quoteMint: quoteMintAddress.toBase58(),
      rpcUrl: rpcUrl,
      configuration: {
        poolConfiguration: {
          quoteMint: quoteMintAddress.toBase58(),
          totalTokenSupply: finalParams.totalTokenSupply,
          leftover: finalParams.leftover,
          tokenType: finalParams.tokenType === 0 ? 'SPL' : 'Token2022',
          initialMarketCap: finalParams.initialMarketCap,
          migrationMarketCap: finalParams.migrationMarketCap,
          dynamicFees: finalParams.dynamicFeeEnabled,
        },
        settings: {
          tokenBaseDecimal: finalParams.tokenBaseDecimal,
          tokenQuoteDecimal: finalParams.tokenQuoteDecimal,
          activationType: finalParams.activationType === 0 ? 'Slot' : 'Timestamp',
          collectFeeMode: finalParams.collectFeeMode === 0 ? 'Quote' : 'Quote+Base',
          migrationOption: finalParams.migrationOption === 0 ? 'DAMM V1' : 'DAMM V2',
          migrationFeeOption: `${finalParams.migrationFeeOption === 0 ? 0.25 : finalParams.migrationFeeOption === 1 ? 0.30 : finalParams.migrationFeeOption === 2 ? 1 : finalParams.migrationFeeOption === 3 ? 2 : finalParams.migrationFeeOption === 4 ? 4 : 6}%`,
        },
        liquidityStructure: {
          partnerLpPercentage: finalParams.partnerLpPercentage,
          creatorLpPercentage: finalParams.creatorLpPercentage,
          partnerLockedLpPercentage: finalParams.partnerLockedLpPercentage,
          creatorLockedLpPercentage: finalParams.creatorLockedLpPercentage,
          baseFeeBps: finalParams.baseFeeBps,
          creatorTradingFeePercentage: finalParams.creatorTradingFeePercentage,
        },
      },
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
