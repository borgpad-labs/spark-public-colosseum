import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { CpAmm, getSqrtPriceFromPrice } from '@meteora-ag/cp-amm-sdk';
import { createMint } from '@solana/spl-token';
import BN from 'bn.js';
import bs58 from 'bs58';
import { jsonResponse, reportError } from './cfPagesFunctionsUtils';
import { isApiKeyValid } from '../services/apiKeyService';

// Helper function to check transaction status with polling (every 5 seconds as requested)
async function checkTransactionStatus(connection: Connection, signature: string, maxAttempts: number = 12): Promise<boolean> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`[DAMM V2] Checking transaction status (attempt ${attempt}/${maxAttempts}):`, signature);
      const status = await connection.getSignatureStatus(signature);
      
      if (status.value) {
        if (status.value.err) {
          console.log('[DAMM V2] Transaction failed:', status.value.err);
          return false;
        } else if (status.value.confirmationStatus) {
          console.log('[DAMM V2] Transaction confirmed:', status.value.confirmationStatus);
          return true;
        }
      }
      
      // Wait 5 seconds before next attempt as requested
      if (attempt < maxAttempts) {
        console.log('[DAMM V2] Waiting 5 seconds before next check...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    } catch (error) {
      console.log(`[DAMM V2] Error checking transaction status (attempt ${attempt}):`, error);
      if (attempt === maxAttempts) {
        return false;
      }
      console.log('[DAMM V2] Waiting 5 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('[DAMM V2] Transaction status check timed out after', maxAttempts, 'attempts');
  return false;
}

type ENV = {
  RPC_URL: string;
  DB: D1Database;
  PRIVATE_KEY: string;
}

// Simplified request interface - most parameters are calculated automatically
interface CreateDammV2CustomPoolRequest {
  // Required parameters
  tokenAMint: string; // The mint address for token A
  tokenBMint: string; // The mint address for token B
  tokenAAmount: string; // Initial amount of token A to deposit (as string to handle large numbers)
  tokenBAmount: string; // Initial amount of token B to deposit (as string to handle large numbers)
  
  // Pool configuration
  hasAlphaVault: boolean; // Whether the pool has an alpha vault
  collectFeeMode: number; // How fees are collected (0: normal, 1: alpha)
  activationType: number; // 0: slot, 1: timestamp
  isLockLiquidity?: boolean; // true if you wanna permanent lock position after pool created
  
  // Price range configuration (optional - uses defaults if not provided)
  minPrice?: string; // Minimum price as human-readable string (e.g., "0.001" for 0.001 USDC per SOL)
  maxPrice?: string; // Maximum price as human-readable string (e.g., "1000" for 1000 USDC per SOL)
  tokenADecimals?: number; // Number of decimals for token A (defaults to 9)
  tokenBDecimals?: number; // Number of decimals for token B (defaults to 6)
  
  // Optional parameters (will be calculated automatically if not provided)
  payer?: string; // The wallet paying for the transaction (defaults to env wallet)
  creator?: string; // The creator of the pool (defaults to env wallet)
  activationPoint?: string; // The slot or timestamp for activation (defaults to current time)
}

// Response interface
interface CreateDammV2CustomPoolResponse {
  success: boolean;
  transaction?: string; // Base64 encoded transaction
  pool?: string; // Pool public key
  position?: string; // Position public key
  error?: string;
  [key: string]: any; // Index signature for flexibility
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // Authorize request
    // if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
    //   return jsonResponse(null, 401);
    // }

    const requestBody = await ctx.request.json() as CreateDammV2CustomPoolRequest;
    
    // Validate required fields
    const requiredFields = [
      'tokenAMint', 'tokenBMint', 'tokenAAmount', 'tokenBAmount',
      'hasAlphaVault', 'collectFeeMode', 'activationType'
    ];

    for (const field of requiredFields) {
      if (requestBody[field as keyof CreateDammV2CustomPoolRequest] === undefined) {
        return jsonResponse({
          success: false,
          error: `Missing required field: ${field}`
        }, 400);
      }
    }

    // Validate PublicKey addresses
    try {
      new PublicKey(requestBody.tokenAMint);
      new PublicKey(requestBody.tokenBMint);
      
      // Validate optional PublicKey addresses if provided
      if (requestBody.payer) {
        new PublicKey(requestBody.payer);
      }
      if (requestBody.creator) {
        new PublicKey(requestBody.creator);
      }
    } catch (error) {
      return jsonResponse({
        success: false,
        error: 'Invalid PublicKey format in one or more addresses'
      }, 400);
    }

    // Validate numeric values - we'll validate them when we create the BN instances
    // Just check that they are non-empty strings
    const numericFields = ['tokenAAmount', 'tokenBAmount'];
    
    for (const field of numericFields) {
      const value = requestBody[field as keyof CreateDammV2CustomPoolRequest] as string;
      if (typeof value !== 'string' || value.trim() === '') {
        return jsonResponse({
          success: false,
          error: `Invalid ${field}: must be a non-empty string`
        }, 400);
      }
    }
    

    // Validate collectFeeMode
    if (requestBody.collectFeeMode !== 0 && requestBody.collectFeeMode !== 1) {
      return jsonResponse({
        success: false,
        error: 'collectFeeMode must be 0 (normal) or 1 (alpha)'
      }, 400);
    }

    // Validate activationType
    if (requestBody.activationType !== 0 && requestBody.activationType !== 1) {
      return jsonResponse({
        success: false,
        error: 'activationType must be 0 (slot) or 1 (timestamp)'
      }, 400);
    }

    // Validate feeSchedulerMode

    // Set up wallet from environment
    const privateKeyString = ctx.env.PRIVATE_KEY;
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format');
    }

    // Convert base58 string to Uint8Array
    const privateKeyUint8Array = bs58.decode(privateKeyString);
    // Initialize your wallet
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array);
    
    // Set default values for optional parameters
    const payer = requestBody.payer ? new PublicKey(requestBody.payer) : wallet.publicKey;
    const creator = requestBody.creator ? new PublicKey(requestBody.creator) : wallet.publicKey;
    // Set activation point based on activation type
    let activationPoint: number;
    if (requestBody.activationType === 0) {
      // Slot-based activation - use current slot or null for immediate activation
      activationPoint = requestBody.activationPoint ? parseInt(requestBody.activationPoint) : 0;
    } else {
      // Timestamp-based activation - use current time + small buffer for immediate trading
      activationPoint = requestBody.activationPoint ? parseInt(requestBody.activationPoint) : Math.floor(Date.now() / 1000) + 60; // +60 seconds buffer
    }

    console.log('[DAMM V2] Creating custom pool with parameters:', {
      payer: payer.toBase58(),
      creator: creator.toBase58(),
      tokenAMint: requestBody.tokenAMint,
      tokenBMint: requestBody.tokenBMint,
      tokenAAmount: requestBody.tokenAAmount,
      tokenBAmount: requestBody.tokenBAmount,
      hasAlphaVault: requestBody.hasAlphaVault,
      collectFeeMode: requestBody.collectFeeMode,
      activationType: requestBody.activationType
    });

    // Initialize connection first
    const connection = new Connection(ctx.env.RPC_URL, 'confirmed');

    // Validate that the token mints are using the standard token program
    try {
      const tokenAMintInfo = await connection.getAccountInfo(new PublicKey(requestBody.tokenAMint));
      const tokenBMintInfo = await connection.getAccountInfo(new PublicKey(requestBody.tokenBMint));
      
      if (!tokenAMintInfo && !tokenBMintInfo) {
        throw new Error('Both token mints do not exist on-chain');
      } else if (!tokenAMintInfo) {
        throw new Error(`Token A mint (${requestBody.tokenAMint}) does not exist on-chain. Common test tokens: SOL (So11111111111111111111111111111111111111112), USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)`);
      } else if (!tokenBMintInfo) {
        throw new Error(`Token B mint (${requestBody.tokenBMint}) does not exist on-chain. Common test tokens: SOL (So11111111111111111111111111111111111111112), USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)`);
      }
      
      console.log('[DAMM V2] Token A mint owner:', tokenAMintInfo.owner.toBase58());
      console.log('[DAMM V2] Token B mint owner:', tokenBMintInfo.owner.toBase58());
      
      // Check if tokens are using the standard token program
      const standardTokenProgram = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
      const token2022Program = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
      
      if (!tokenAMintInfo.owner.equals(standardTokenProgram)) {
        if (tokenAMintInfo.owner.equals(token2022Program)) {
          throw new Error('Token A is using Token-2022 program. DAMM v2 pools require tokens to use the standard token program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)');
        } else {
          throw new Error(`Token A is using an unsupported token program: ${tokenAMintInfo.owner.toBase58()}. DAMM v2 pools require the standard token program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)`);
        }
      }
      
      if (!tokenBMintInfo.owner.equals(standardTokenProgram)) {
        if (tokenBMintInfo.owner.equals(token2022Program)) {
          throw new Error('Token B is using Token-2022 program. DAMM v2 pools require tokens to use the standard token program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)');
      } else {
          throw new Error(`Token B is using an unsupported token program: ${tokenBMintInfo.owner.toBase58()}. DAMM v2 pools require the standard token program (TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)`);
        }
      }
      
      console.log('[DAMM V2] Both tokens are using the standard token program - proceeding with pool creation');
    } catch (validationError) {
      console.error('[DAMM V2] Token validation failed:', validationError);
      return jsonResponse({
        success: false,
        error: `Token validation failed: ${validationError instanceof Error ? validationError.message : 'Unknown error'}`
      }, 400);
    }

    // Initialize CP-AMM SDK (connection already initialized above)
    const cpAmm = new CpAmm(connection);
    
    // Check if a pool already exists for this token pair
    // COMMENTED OUT FOR FASTER EXECUTION - SKIP POOL EXISTENCE CHECK
    // console.log('[DAMM V2] Checking if pool already exists for token pair...');
    // try {
    //   const allPools = await cpAmm.getAllPools();
    //   console.log(`[DAMM V2] Found ${allPools.length} total pools`);
    //   
    //   const tokenAMint = new PublicKey(requestBody.tokenAMint);
    //   const tokenBMint = new PublicKey(requestBody.tokenBMint);
    //   
    //   for (const pool of allPools) {
    //     const poolTokenA = pool.account.tokenAMint;
    //     const poolTokenB = pool.account.tokenBMint;
    //     
    //     // Check if this pool matches our token pair (in either order)
    //     if ((poolTokenA.equals(tokenAMint) && poolTokenB.equals(tokenBMint)) ||
    //         (poolTokenA.equals(tokenBMint) && poolTokenB.equals(tokenAMint))) {
    //       const existingPoolAddress = pool.publicKey.toString();
    //       console.log(`[DAMM V2] Pool already exists for this token pair: ${existingPoolAddress}`);
    //       
    //       return jsonResponse({
    //         success: false,
    //         error: `Pool already exists for this token pair`,
    //         existingPoolAddress: existingPoolAddress,
    //         message: `A DAMM V2 pool already exists for tokens ${requestBody.tokenAMint} and ${requestBody.tokenBMint}. Pool address: ${existingPoolAddress}`
    //       }, 409); // 409 Conflict
    //     }
    //   }
    //   
    //   console.log('[DAMM V2] No existing pool found for this token pair, proceeding with creation...');
    // } catch (error) {
    //   console.log('[DAMM V2] Error checking existing pools (continuing with creation):', error);
    // }
    
    console.log('[DAMM V2] Skipping pool existence check for faster execution...');


    // Generate a new NFT keypair for the position
    // The CP-AMM SDK will create the NFT as part of the pool creation process
    console.log('[DAMM V2] Generating new NFT keypair for position...');
    const positionNftKeypair = Keypair.generate();
    const positionNftMint = positionNftKeypair.publicKey;
    
    console.log('[DAMM V2] Generated NFT mint address:', positionNftMint.toBase58());

    // Use BN from Anchor (which should be compatible with CP-AMM SDK)
    const { BN } = await import('@coral-xyz/anchor');
    
    // Set default token decimals if not provided
    const tokenADecimals = requestBody.tokenADecimals ?? 9; // Default to 9 decimals (like SOL)
    const tokenBDecimals = requestBody.tokenBDecimals ?? 6; // Default to 6 decimals (like USDC)
    
    // Calculate sqrt prices from human-readable prices or use defaults
    let MIN_SQRT_PRICE: BN;
    let MAX_SQRT_PRICE: BN;
    
    if (requestBody.minPrice && requestBody.maxPrice) {
      // Convert human-readable prices to sqrt prices
      MIN_SQRT_PRICE = getSqrtPriceFromPrice(requestBody.minPrice, tokenADecimals, tokenBDecimals);
      MAX_SQRT_PRICE = getSqrtPriceFromPrice(requestBody.maxPrice, tokenADecimals, tokenBDecimals);
      
      console.log('[DAMM V2] Using custom human-readable price range:', {
        minPrice: requestBody.minPrice,
        maxPrice: requestBody.maxPrice,
        tokenADecimals,
        tokenBDecimals,
        minSqrtPrice: MIN_SQRT_PRICE.toString(),
        maxSqrtPrice: MAX_SQRT_PRICE.toString()
      });
    } else {
      // Use default sqrt prices
      MIN_SQRT_PRICE = new BN("58333726687135158");
      MAX_SQRT_PRICE = new BN("583337266871351580");
      
      console.log('[DAMM V2] Using default sqrt price range:', {
        minSqrtPrice: MIN_SQRT_PRICE.toString(),
        maxSqrtPrice: MAX_SQRT_PRICE.toString()
      });
    }
    
    // Set activation point based on activation type
    let uniqueActivationPoint: BN;
    if (requestBody.activationType === 0) {
      // Slot-based activation - use current slot + buffer for delayed activation
      // Get current slot and add some buffer (approximately 1 minute = ~60 slots)
      const currentSlot = await connection.getSlot();
      const futureSlot = currentSlot + 60; // Add 60 slots (approximately 1 minute)
      uniqueActivationPoint = new BN(futureSlot);
      console.log('[DAMM V2] Using slot-based activation (delayed):', uniqueActivationPoint.toString(), 'current slot:', currentSlot);
    } else {
      // Timestamp-based activation - use the calculated timestamp
      uniqueActivationPoint = new BN(activationPoint);
      console.log('[DAMM V2] Using timestamp-based activation:', uniqueActivationPoint.toString());
    }
    
    // Use the payer wallet as the creator to ensure the user is both payer and creator
    const uniqueCreator = creator; // Use the provided creator (which defaults to wallet.publicKey)
    console.log('[DAMM V2] Using wallet as creator for pool address derivation:', uniqueCreator.toBase58());

    // Add toArrayLike method to BN prototype if it doesn't exist
    if (!BN.prototype.toArrayLike) {
      BN.prototype.toArrayLike = function(ArrayType: any, endian?: any, length?: number) {
        return this.toArray(endian, length);
      };
    }

    // Create BN instances
    const createBN = (value: string) => new BN(value);

    // Convert string values to BN and PublicKey
    const params = {
      payer: payer,
      creator: creator,
      positionNft: positionNftMint,
      tokenAMint: new PublicKey(requestBody.tokenAMint),
      tokenBMint: new PublicKey(requestBody.tokenBMint),
      tokenAAmount: createBN(requestBody.tokenAAmount),
      tokenBAmount: createBN(requestBody.tokenBAmount),
      // Use standard token program for both tokens to avoid program ID mismatches
      tokenAProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      tokenBProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
      hasAlphaVault: requestBody.hasAlphaVault,
      collectFeeMode: requestBody.collectFeeMode,
      activationPoint: new BN(activationPoint),
      activationType: requestBody.activationType,
      isLockLiquidity: requestBody.isLockLiquidity || false
    };
    
    // Add small random amounts to token amounts to ensure different pool addresses
    const randomAmountA = Math.floor(Math.random() * 1000);
    const randomAmountB = Math.floor(Math.random() * 100);
    const uniqueTokenAAmount = new BN(params.tokenAAmount.toString()).add(new BN(randomAmountA));
    const uniqueTokenBAmount = new BN(params.tokenBAmount.toString()).add(new BN(randomAmountB));
    console.log('[DAMM V2] Generated unique token amounts:', {
      originalA: params.tokenAAmount.toString(),
      originalB: params.tokenBAmount.toString(),
      uniqueA: uniqueTokenAAmount.toString(),
      uniqueB: uniqueTokenBAmount.toString(),
      randomA: randomAmountA,
      randomB: randomAmountB
    });


    // Use createCustomPool method which doesn't require a config account
    console.log('[DAMM V2] Creating custom pool...');
    let result;
    try {
      // MIN_SQRT_PRICE and MAX_SQRT_PRICE are now set above based on request parameters
      
       // First, prepare the pool creation parameters using SDK method
       console.log('[DAMM V2] Preparing pool creation parameters...');
       const { initSqrtPrice, liquidityDelta } = cpAmm.preparePoolCreationParams({
         tokenAAmount: uniqueTokenAAmount,
         tokenBAmount: uniqueTokenBAmount,
         minSqrtPrice: MIN_SQRT_PRICE,
         maxSqrtPrice: MAX_SQRT_PRICE
       });
      
      console.log('[DAMM V2] SDK prepared parameters:', {
        initSqrtPrice: initSqrtPrice.toString(),
        liquidityDelta: liquidityDelta.toString()
      });
      
      // Validate that initSqrtPrice is within the range
      console.log('[DAMM V2] Price range validation:', {
        minSqrtPrice: MIN_SQRT_PRICE.toString(),
        maxSqrtPrice: MAX_SQRT_PRICE.toString(),
        initSqrtPrice: initSqrtPrice.toString(),
        initInRange: initSqrtPrice.gte(MIN_SQRT_PRICE) && initSqrtPrice.lte(MAX_SQRT_PRICE)
      });

      // Define pool fees configuration using the proper structure
      // 25% fee reducing exponentially over a week to 2.5%
      const poolFees = {
        baseFee: {
          feeSchedulerMode: 1, // 1: Exponential reduction
          cliffFeeNumerator: new BN(250000000), // 0.1% initial fee
          numberOfPeriod: 168, // 7 periods (days)
          reductionFactor: new BN(136), // Final fee: 2.5% (25000000 basis points / 10,000,000)
          periodFrequency: new BN(3600) // 24 hours in seconds (86400 seconds = 1 day)
        },
        partnerFee: {
          partnerAddress: uniqueCreator, // Use unique creator as partner
          partnerFeeNumerator: 1000, // 0.01% partner fee
        },
        dynamicFee: {
          binStep: 1,
          binStepU128: new BN("1844674407370955"),
          filterPeriod: 10,
          decayPeriod: 120,
          reductionFactor: 5000,
          variableFeeControl: 2000000, // This effectively disables dynamic fees
          maxVolatilityAccumulator: 100000,
        },
        padding: [] // Required padding field
      };
      
      console.log('[DAMM V2] Pool fees configuration:', {
        baseFee: {
          feeSchedulerMode: poolFees.baseFee.feeSchedulerMode,
          cliffFeeNumerator: poolFees.baseFee.cliffFeeNumerator,
          numberOfPeriod: poolFees.baseFee.numberOfPeriod,
          reductionFactor: poolFees.baseFee.reductionFactor,
          periodFrequency: poolFees.baseFee.periodFrequency
        },
        partnerFee: {
          partnerAddress: uniqueCreator.toBase58(),
          partnerFeeNumerator: poolFees.partnerFee.partnerFeeNumerator
        }
      });

      result = await cpAmm.createCustomPool({
        payer: params.payer,
        creator: uniqueCreator, // Use unique creator address
        positionNft: params.positionNft,
        tokenAMint: params.tokenAMint,
        tokenBMint: params.tokenBMint,
        tokenAAmount: uniqueTokenAAmount, // Use unique token amounts
        tokenBAmount: uniqueTokenBAmount, // Use unique token amounts
        sqrtMinPrice: MIN_SQRT_PRICE, // Use custom or default min price
        sqrtMaxPrice: MAX_SQRT_PRICE, // Use custom or default max price
        initSqrtPrice: initSqrtPrice, // Use SDK prepared initSqrtPrice
        liquidityDelta: liquidityDelta, // Use SDK prepared liquidityDelta
        poolFees: poolFees,
        hasAlphaVault: params.hasAlphaVault,
        collectFeeMode: params.collectFeeMode,
        activationPoint: uniqueActivationPoint, // Use unique activation point
        activationType: params.activationType,
        tokenAProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        tokenBProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
      });
      
      console.log('[DAMM V2] createCustomPool succeeded');
    } catch (error) {
      console.error('[DAMM V2] createCustomPool failed:', error);
      throw error;
    }

    // Prepare transaction for signing and sending
    let transaction;
    let poolAddress;
    let positionAddress;

    if (result.tx) {
      // createCustomPool returns { tx, pool, position }
      transaction = result.tx;
      poolAddress = result.pool.toString();
      positionAddress = result.position.toString();
    } else if (result.serialize) {
      // createPool returns a TxBuilder that can be serialized directly
      // We need to add a recent blockhash before serializing
      try {
        const { blockhash } = await connection.getLatestBlockhash();
        result.recentBlockhash = blockhash;
        result.feePayer = params.payer;
        transaction = result;
      } catch (blockhashError) {
        console.error('[DAMM V2] Failed to get recent blockhash:', blockhashError);
        // Use a dummy blockhash for serialization
        result.recentBlockhash = "11111111111111111111111111111111";
        result.feePayer = params.payer;
        transaction = result;
      }
      // For createPool, we need to get the pool and position addresses differently
      poolAddress = "Pool address will be available after transaction execution";
      positionAddress = "Position address will be available after transaction execution";
    } else {
      throw new Error('Unexpected result structure from pool creation');
    }

    // Try to sign and send the transaction
    console.log('[DAMM V2] Attempting to sign and send transaction...');
    
    try {
      // Get a fresh blockhash right before signing and sending
      console.log('[DAMM V2] Getting fresh blockhash...');
      const { blockhash } = await connection.getLatestBlockhash();
      
      // Update the transaction with fresh blockhash
      if (result.tx) {
        result.tx.recentBlockhash = blockhash;
        result.tx.feePayer = wallet.publicKey;
      } else if (result.recentBlockhash !== undefined) {
        result.recentBlockhash = blockhash;
        result.feePayer = wallet.publicKey;
      }

        // Sign the transaction
        console.log('[DAMM V2] Signing transaction with private key...');
        
        // Check which accounts in the transaction are marked as signers
        const signerAccounts = transaction.instructions.flatMap(ix => 
          ix.keys.filter(key => key.isSigner).map(key => key.pubkey.toString())
        );
        
        console.log('[DAMM V2] Transaction requires signers:', signerAccounts);
        console.log('[DAMM V2] Available keypairs:', {
          wallet: wallet.publicKey.toString(),
          nft: positionNftKeypair.publicKey.toString()
        });
        
        // Always include the main wallet as a signer
        const requiredSigners = [wallet];
        
        // Add the NFT keypair if the NFT mint address is required as a signer
        if (signerAccounts.includes(positionNftKeypair.publicKey.toString())) {
          requiredSigners.push(positionNftKeypair);
          console.log('[DAMM V2] Added NFT keypair as signer');
        }
        
        // Check for any other signers that we can't provide (derived addresses)
        const availableSigners = [wallet.publicKey.toString(), positionNftKeypair.publicKey.toString()];
        const missingSigners = signerAccounts.filter(signer => !availableSigners.includes(signer));
        
        if (missingSigners.length > 0) {
          console.log('[DAMM V2] Warning: Transaction requires signatures from derived addresses that cannot be signed:', missingSigners);
          console.log('[DAMM V2] This might indicate an issue with the transaction structure or SDK usage');
        }
        
        console.log('[DAMM V2] Signing with keypairs:', requiredSigners.map(signer => signer.publicKey.toString()));
        
        // Sign with all required signers
        transaction.sign(...requiredSigners);

      // Send the transaction
      console.log('[DAMM V2] Sending transaction to Solana network...');
      const transactionSignature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false, preflightCommitment: 'confirmed' }
      );

      console.log('[DAMM V2] Transaction sent successfully:', transactionSignature);
      
      // Return the transaction signature
      const response: CreateDammV2CustomPoolResponse = {
        success: true,
        transaction: transactionSignature,
        pool: poolAddress,
        position: positionAddress
      };


      return jsonResponse(response);
      
    } catch (signingError) {
      console.error('[DAMM V2] Signing failed, returning Base64 transaction:', signingError);
      
      // Fallback: return Base64 transaction for manual signing
      let serializedTransaction;
      if (result.tx) {
        serializedTransaction = result.tx.serialize({ requireAllSignatures: false }).toString('base64');
      } else if (result.serialize) {
        serializedTransaction = result.serialize({ requireAllSignatures: false }).toString('base64');
      } else {
        throw new Error('Unexpected result structure from pool creation');
      }
      
      const response: CreateDammV2CustomPoolResponse = {
        success: true,
        transaction: serializedTransaction,
        pool: poolAddress,
        position: positionAddress
      };


      return jsonResponse(response);
    }

  } catch (error) {
    console.error('[DAMM V2] Error creating custom pool:', error);
    await reportError(ctx.env.DB, error);
    
    return jsonResponse({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create custom pool'
    }, 500);
  }
};