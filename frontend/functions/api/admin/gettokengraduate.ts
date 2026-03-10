import { jsonResponse, reportError } from "../cfPagesFunctionsUtils"
import { drizzle } from "drizzle-orm/d1"
import { Connection, PublicKey, Keypair, SystemProgram, Transaction, VersionedTransaction } from "@solana/web3.js"
import { 
  DynamicBondingCurveClient, 
  deriveDbcPoolAddress,
  deriveDammV2MigrationMetadataAddress,
  deriveBaseKeyForLocker,
  deriveEscrow
} from "@meteora-ag/dynamic-bonding-curve-sdk"
import { CpAmm } from "@meteora-ag/cp-amm-sdk"
import { SplGovernance } from "governance-idl-sdk"
import BN from "bn.js"
import bs58 from "bs58"
import { eq, or, isNull } from "drizzle-orm"
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { isApiKeyValid } from "../../services/apiKeyService"
import { sendTokenGraduationNotification } from "../../services/telegramBotService"

// DAMM V2 Migration Config Addresses from @meteora-ag/dynamic-bonding-curve-sdk README
const DAMM_V2_MIGRATION_FEE_ADDRESS: Record<number, string> = {
  0: "7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd", // MigrationFeeOption.FixedBps25 == 0
  1: "2nHK1kju6XjphBLbNxpM5XRGFj7p9U8vvNzyZiha1z6k", // MigrationFeeOption.FixedBps30 == 1
  2: "Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp", // MigrationFeeOption.FixedBps100 == 2
  3: "2c4cYd4reUYVRAB9kUUkrq55VPyy2FNQ3FDL4o12JXmq", // MigrationFeeOption.FixedBps200 == 3
  4: "AkmQWebAwFvWk55wBoCr5D62C6VVDTzi84NJuD9H7cFD", // MigrationFeeOption.FixedBps400 == 4
  5: "DbCRBj8McvPYHJG1ukj8RE15h2dCNUdTAESG49XpQ44u", // MigrationFeeOption.FixedBps600 == 5
}

// Jito tip account
const JITO_TIP_ACCOUNT = new PublicKey("96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5")

// Define the tokens table schema
const tokensTable = sqliteTable('tokens', {
  mint: text('mint').notNull().primaryKey(),
  name: text('name').notNull(),
  imageUrl: text('imageUrl'),
  dao: text('dao').default(""),
  damm_pool_address: text('damm_pool_address').default(""),
  dao_treasury: text('dao_treasury').default("")
})

type ENV = {
  DB: D1Database
  RPC_URL: string
  POOL_CONFIG_KEY: string
  PRIVATE_KEY: string
  TELEGRAM_BOT_TOKEN: string
  TELEGRAM_CHAT_ID: string
}

// Function to fetch DAMM V2 pool address using getPositionsByUser API
const fetchDammV2PoolFromPositions = async (connection: Connection, userWallet: PublicKey, tokenMint?: string): Promise<string | null> => {
  try {
    console.log(`[DAMM V2] Fetching DAMM V2 pool from user positions: ${userWallet.toString()}`)
    if (tokenMint) {
      console.log(`[DAMM V2] Filtering for specific token: ${tokenMint}`)
    }
    
    // Initialize CP-AMM SDK
    const cpAmm = new CpAmm(connection)
    
    // Get all positions for the user
    const userPositions = await cpAmm.getPositionsByUser(userWallet)
    
    if (!userPositions || userPositions.length === 0) {
      console.log(`[DAMM V2] No positions found for user ${userWallet.toString()}`)
      return null
    }

    console.log(`[DAMM V2] Found ${userPositions.length} positions for user`)
    
    // If we have a specific token to filter for, we need to get pool details to check tokens
    if (tokenMint) {
      const tokenPublicKey = new PublicKey(tokenMint)
      
      for (const position of userPositions) {
        if (position.positionState && position.positionState.pool) {
          const poolAddress = position.positionState.pool
          
          try {
            // Get the pool details to check if it contains our token
            const pool = await cpAmm.fetchPoolState(poolAddress)
            if (pool && (
              pool.tokenAMint.equals(tokenPublicKey) || 
              pool.tokenBMint.equals(tokenPublicKey)
            )) {
              const poolAddressStr = poolAddress.toString()
              console.log(`[DAMM V2] Found DAMM V2 pool for token ${tokenMint}: ${poolAddressStr}`)
              return poolAddressStr
            }
          } catch (poolError) {
            console.log(`[DAMM V2] Error getting pool details for ${poolAddress.toString()}:`, poolError)
            // Continue to next position
          }
        }
      }
      
      console.log(`[DAMM V2] No pool found for specific token ${tokenMint} in user positions`)
      return null
    } else {
      // Fallback: Look for the first position that has a pool address in rawPositionState
      for (const position of userPositions) {
        if (position.positionState && position.positionState.pool) {
          const poolAddress = position.positionState.pool.toString()
          console.log(`[DAMM V2] Found DAMM V2 pool address (no token filter): ${poolAddress}`)
          return poolAddress
        }
      }
    }
    
    console.log(`[DAMM V2] No valid pool address found in user positions`)
    return null

  } catch (error) {
    console.error(`[DAMM V2] Error fetching DAMM V2 pool from positions:`, error)
    return null
  }
}

// Function to find DAMM pool address for a specific token using CP-AMM SDK
const findDammPoolForToken = async (connection: Connection, tokenMint: string): Promise<string | null> => {
  try {
    console.log(`[DAMM Search] Searching for DAMM pool for token: ${tokenMint}`)
    
    // Initialize CP-AMM SDK
    const cpAmm = new CpAmm(connection)
    
    // Get all DAMM pools
    const allPools = await cpAmm.getAllPools()
    console.log(`[DAMM Search] Found ${allPools.length} total DAMM pools`)
    
    // Look for pools that contain our token
    const tokenPublicKey = new PublicKey(tokenMint)
    
    for (const pool of allPools) {
      if (pool.account.tokenAMint.equals(tokenPublicKey) || pool.account.tokenBMint.equals(tokenPublicKey)) {
        const poolAddress = pool.publicKey.toString()
        console.log(`[DAMM Search] Found DAMM pool for token ${tokenMint}: ${poolAddress}`)
        return poolAddress
      }
    }
    
    console.log(`[DAMM Search] No DAMM pool found for token ${tokenMint}`)
    return null

  } catch (error) {
    console.error(`[DAMM Search] Error searching for DAMM pool for ${tokenMint}:`, error)
    return null
  }
}

// Function to fetch DAMM pool address from DexScreener (fallback)
const fetchDammPoolAddressFromDexScreener = async (tokenAddress: string): Promise<string | null> => {
  try {
    console.log(`[DexScreener] Fetching DAMM pool address for token: ${tokenAddress}`)
    
    // DexScreener API endpoint for Solana tokens
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BorgPad/1.0)',
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn(`[DexScreener] API error for ${tokenAddress}: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json() as any
    
    if (!data.pairs || data.pairs.length === 0) {
      console.log(`[DexScreener] No pairs found for token ${tokenAddress}`)
      return null
    }

    // Look for DAMM V2 pairs specifically
    const dammPair = data.pairs.find((pair: any) => {
      // Check if it's a DAMM V2 pair by looking at the DEX name or pair address pattern
      return pair.dexId === 'meteora' || 
             pair.dexId === 'damm' || 
             pair.pairAddress?.includes('damm') ||
             pair.dexId?.toLowerCase().includes('damm')
    })

    if (dammPair) {
      console.log(`[DexScreener] Found DAMM pair for token ${tokenAddress}: ${dammPair.pairAddress}`)
      return dammPair.pairAddress
    }

    // If no specific DAMM pair found, return the first pair address as fallback
    const firstPair = data.pairs[0]
    console.log(`[DexScreener] Using first pair as fallback for token ${tokenAddress}: ${firstPair.pairAddress}`)
    return firstPair.pairAddress

  } catch (error) {
    console.error(`[DexScreener] Error fetching DAMM pool address for ${tokenAddress}:`, error)
    return null
  }
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const db = drizzle(ctx.env.DB, { logger: true })
  const rawDb = ctx.env.DB
  try {
    // authorize request
    if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
      return jsonResponse(null, 401)
    }

    // Get tokens that don't have DAOs (dao field is empty or null)
    const tokensWithoutDao = await db
      .select()
      .from(tokensTable)
      .where(or(eq(tokensTable.dao, ""), isNull(tokensTable.dao)))
      .all()

    console.log(`Found ${tokensWithoutDao.length} tokens without DAOs`)

    const results = []
    const connection = new Connection(ctx.env.RPC_URL, "confirmed")
    const dbcClient = new DynamicBondingCurveClient(connection, "confirmed")

    // Initialize wallet for DAO creation
    const privateKeyString = ctx.env.PRIVATE_KEY
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format')
    }
    const privateKeyUint8Array = bs58.decode(privateKeyString)
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array)

    // SOL mint address (quote token for most pools)
    const SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112")
    const CONFIG_KEY = new PublicKey(ctx.env.POOL_CONFIG_KEY)

    for (const token of tokensWithoutDao) {
      try {
        // Use the SDK's helper function to derive pool address
        const poolAddress = deriveDbcPoolAddress(
          SOL_MINT, // quoteMint (SOL)
          new PublicKey(token.mint), // baseMint (token)
          CONFIG_KEY // config
        )

        console.log(`Checking pool ${poolAddress.toBase58()} for token ${token.mint}`)

        // Check pool curve progress
        const curveProgress = await dbcClient.state.getPoolCurveProgress(poolAddress)

        console.log(`Token ${token.mint} has curve progress: ${curveProgress}`)

        if (curveProgress >= 1) {
          console.log(`Token ${token.mint} has graduated! Creating DAO...`)

          // Get DAMM V2 pool address using the dedicated API
          console.log(`[DAMM V2] Getting DAMM V2 pool address for graduated token: ${token.mint}`)
          let dammPoolAddress = null
          
          try {
            // Call our own API endpoint to get the DAMM V2 pool address
            const apiUrl = `${ctx.request.url.split('/api/admin/')[0]}/api/admin/getDammV2PoolAddress`
            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ctx.request.headers.get('Authorization')}`
              },
              body: JSON.stringify({ tokenMint: token.mint })
            })
            
            if (response.ok) {
              const apiResult = await response.json() as { success: boolean; dammV2PoolAddress?: string; error?: string }
              if (apiResult.success && apiResult.dammV2PoolAddress) {
                dammPoolAddress = apiResult.dammV2PoolAddress
                console.log(`[DAMM V2] ✅ Found DAMM V2 pool via API: ${dammPoolAddress}`)
              } else {
                console.log(`[DAMM V2] API returned no pool:`, apiResult.error || 'Unknown error')
              }
            } else {
              console.log(`[DAMM V2] API call failed: ${response.status} ${response.statusText}`)
            }
          } catch (apiError) {
            console.log(`[DAMM V2] Error calling DAMM V2 API:`, apiError)
          }
          
          // Fallback to old methods if API fails
          if (!dammPoolAddress) {
            console.log(`[DAMM V2] API method failed, trying fallback methods...`)
            dammPoolAddress = await fetchDammV2PoolFromPositions(connection, wallet.publicKey, token.mint)
            
            if (!dammPoolAddress) {
              dammPoolAddress = await findDammPoolForToken(connection, token.mint)
            }
            
            if (!dammPoolAddress) {
              dammPoolAddress = await fetchDammPoolAddressFromDexScreener(token.mint)
            }
          }
          
          // Create DAO for graduated token
          const { daoAddress, treasuryAddress } = await createDaoForToken({
            tokenName: token.name,
            tokenMint: token.mint,
            wallet,
            connection
          })

          // Token has already graduated and been migrated to DAMM V2
          // We just need to get the pool address from our API
          console.log(`Token ${token.mint} has already graduated and migrated to DAMM V2`)
          
          // Use the pool address we found via API
          const finalDammPoolAddress = dammPoolAddress
          
          if (finalDammPoolAddress) {
            try {
              // Validate the pool address before storing
              new PublicKey(finalDammPoolAddress)
              
              console.log(`[DAMM] Found DAMM pool address for token ${token.mint}: ${finalDammPoolAddress}`)
              console.log(`[DAMM] Using DAMM V2 pool address from API: ${finalDammPoolAddress}`)
              console.log(`[DAMM] Storing DAMM pool address in database`)
              
              // Update token record with DAMM pool address
              await rawDb
                .prepare("UPDATE tokens SET damm_pool_address = ?1 WHERE mint = ?2")
                .bind(finalDammPoolAddress, token.mint)
                .run()
              
              console.log(`[DAMM] Updated token ${token.mint} with DAMM pool address: ${finalDammPoolAddress}`)
            } catch (error) {
              console.error(`[DAMM] Invalid DAMM pool address ${finalDammPoolAddress} for token ${token.mint}:`, error)
              // Don't clear the address, just log the error
            }
          } else {
            console.warn(`[DAMM] Could not find DAMM pool address for token ${token.mint}`)
          }
          
          // Token is already migrated to DAMM V2
          const isMigrationSuccessful = true

          // Update token record with DAO address
          await rawDb
            .prepare("UPDATE tokens SET dao = ?1, dao_treasury = ?2 WHERE mint = ?3")
            .bind(daoAddress, treasuryAddress, token.mint)
            .run()

          // Send Telegram notification for token graduation
          try {
            const notificationSent = await sendTokenGraduationNotification(
              {
                botToken: ctx.env.TELEGRAM_BOT_TOKEN,
                chatId: ctx.env.TELEGRAM_CHAT_ID,
              },
              {
                tokenName: token.name,
                tokenSymbol: token.name, // Using name as symbol since we don't have symbol in this context
                mint: token.mint,
                poolAddress: poolAddress.toBase58(),
                dammPoolAddress: finalDammPoolAddress || undefined,
                curveProgress,
                daoAddress,
                treasuryAddress,
                migratedToDammV2: isMigrationSuccessful,
                imageUrl: token.imageUrl || undefined
              }
            );
            
            if (notificationSent) {
              console.log(`✅ Telegram graduation notification sent successfully for ${token.name}`);
            } else {
              console.log(`⚠️ Failed to send Telegram graduation notification for ${token.name}`);
            }
          } catch (error) {
            console.error(`❌ Error sending Telegram graduation notification for ${token.name}:`, error);
            // Don't fail the entire process if notification fails
          }

          results.push({
            tokenMint: token.mint,
            tokenName: token.name,
            poolAddress: poolAddress.toBase58(),
            dammPoolAddress: finalDammPoolAddress, // Store the final DAMM pool address
            curveProgress,
            graduated: true,
            daoCreated: true,
            daoAddress,
            treasuryAddress,
            migratedToDammV2: isMigrationSuccessful,
            migrationSignature: "already_migrated",
            dammPoolFound: !!finalDammPoolAddress
          })
        } else {
          results.push({
            tokenMint: token.mint,
            tokenName: token.name,
            poolAddress: poolAddress.toBase58(),
            curveProgress,
            graduated: false,
            daoCreated: false
          })
        }

      } catch (error) {
        console.error(`Error processing token ${token.mint}:`, error)
        results.push({
          tokenMint: token.mint,
          tokenName: token.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          graduated: false,
          daoCreated: false
        })
      }
    }

    return jsonResponse({
      message: "Token graduation check completed",
      processedTokens: results.length,
      graduatedTokens: results.filter(r => r.graduated).length,
      daosCreated: results.filter(r => r.daoCreated).length,
      migratedToDammV2: results.filter(r => r.migratedToDammV2).length, // All graduated tokens are already migrated
      dammPoolsFound: results.filter(r => r.dammPoolFound).length,
      results
    }, 200)

  } catch (e) {
    await reportError(ctx.env.DB, e)
    return jsonResponse({ message: "Something went wrong..." }, 500)
  }
}



// Function to create DAO for a graduated token
async function createDaoForToken({
  tokenName,
  tokenMint,
  wallet,
  connection
}: {
  tokenName: string
  tokenMint: string
  wallet: Keypair
  connection: Connection
}): Promise<{ daoAddress: string; treasuryAddress: string }> {

  // Use the new DAO creation API instead of creating DAOs directly
  const daoCreationPayload = {
    name: `${tokenName} DAO`,
    communityTokenMint: tokenMint,
    minCommunityWeightToCreateGovernance: 9000000000000000, // 9M Tokens to create a proposal with 9 decimals
    communityTokenType: "liquid" as const,
    councilTokenType: "liquid" as const,
    communityMintMaxVoterWeightSourceType: "supplyFraction" as const,
    communityMintMaxVoterWeightSourceValue: 10000000000,
    communityApprovalThreshold: 5, // 50M vote to pass
    councilApprovalThreshold: 1, // 1% vote to pass (minimum allowed)
    minCouncilWeightToCreateProposal: 1000, // 1 SOVR1N to create a proposal with 9 decimals
    minTransactionHoldUpTime: 0,
    votingBaseTime: 216000,
    votingCoolOffTime: 43200,
    depositExemptProposalCount: 10,
    communityVoteTipping: "disabled" as const,
    councilVoteTipping: "strict" as const,
    communityVetoVoteThreshold: "disabled" as const,
    councilVetoVoteThreshold: "disabled" as const
  }

  try {
    // Since this is running in a Cloudflare Worker, we need to call the API differently
    // We'll use the same environment and create the DAO directly using the same logic
    // but with the new parameters structure
    
    console.log(`[DAO Creation] Starting DAO creation for token: ${tokenMint}`)
    console.log(`[DAO Creation] Token name: ${tokenName}`)
    
    const governanceProgramId = new PublicKey("GovER5Lthms3bLBqWub97yVrMmEogzX7xNjdXpPPCVZw")
    const splGovernance = new SplGovernance(connection, governanceProgramId)

    // DAO creation parameters using the new structure
    const communityTokenMintPubKey = new PublicKey(tokenMint)
    const payerPubKey = wallet.publicKey
    
    // Use proper BigInt arithmetic for large token amounts
    const COMMUNITY_DECIMALS = 9n
    const REQUIRED_TOKENS = 900_000_000n // 900M tokens
    
    const minWeightBigInt = REQUIRED_TOKENS * (10n ** COMMUNITY_DECIMALS) // 900_000_000_000_000_000n
    const minWeightBN = new BN(minWeightBigInt.toString())
    
    console.log(`[DAO Creation] Calculated min weight BigInt: ${minWeightBigInt.toString()}`)
    console.log(`[DAO Creation] Calculated min weight BN: ${minWeightBN.toString()}`)
    
    // Validate token mint exists and get its info
    console.log(`[DAO Creation] Validating token mint: ${tokenMint}`)
    try {
      const tokenMintInfo = await connection.getAccountInfo(communityTokenMintPubKey)
      if (!tokenMintInfo) {
        throw new Error(`Token mint account does not exist: ${tokenMint}`)
      }
      console.log(`[DAO Creation] Token mint account found, data length: ${tokenMintInfo.data.length}`)
    } catch (mintError) {
      console.error(`[DAO Creation] Error validating token mint:`, mintError)
      throw new Error(`Invalid token mint: ${mintError instanceof Error ? mintError.message : String(mintError)}`)
    }

    // Validate DAO parameters
    console.log(`[DAO Creation] Validating DAO parameters...`)
    if (minWeightBN.lte(new BN(0))) {
      throw new Error(`Invalid minCommunityWeightToCreateGovernance: ${minWeightBN.toString()}`)
    }
    if (daoCreationPayload.communityApprovalThreshold < 1 || daoCreationPayload.communityApprovalThreshold > 100) {
      throw new Error(`Invalid communityApprovalThreshold: ${daoCreationPayload.communityApprovalThreshold}`)
    }
    if (daoCreationPayload.councilApprovalThreshold < 1 || daoCreationPayload.councilApprovalThreshold > 100) {
      throw new Error(`Invalid councilApprovalThreshold: ${daoCreationPayload.councilApprovalThreshold}`)
    }
    
    // Prepare the MintMaxVoteWeightSource
    const communityMintMaxVoterWeightSource = {
      type: daoCreationPayload.communityMintMaxVoterWeightSourceType,
      amount: new BN(daoCreationPayload.communityMintMaxVoterWeightSourceValue)
    }
    console.log(`[DAO Creation] Parameters validated successfully`)

    
    // Create realm instruction with council token
    console.log(`[DAO Creation] Creating realm instruction...`)
    console.log(`[DAO Creation] Realm name: ${daoCreationPayload.name}`)
    console.log(`[DAO Creation] Community token mint: ${communityTokenMintPubKey.toString()}`)
    console.log(`[DAO Creation] Min community weight BN: ${minWeightBN.toString()}`)
    console.log(`[DAO Creation] Max voter weight source:`, communityMintMaxVoterWeightSource)
    
    const councilTokenMint = new PublicKey("sVr1ni6ryQ4Q2b176j54Yp7qnngVTdRR7Ztbn4U6ufA")
    
    let createRealmInstruction
    try {
      createRealmInstruction = await splGovernance.createRealmInstruction(
        daoCreationPayload.name,
        communityTokenMintPubKey,
        minWeightBN, // Use BN instead of number
        payerPubKey,
        communityMintMaxVoterWeightSource,
        councilTokenMint, // council token
        daoCreationPayload.communityTokenType,
        daoCreationPayload.councilTokenType
      )
      console.log(`[DAO Creation] Realm instruction created successfully`)
    } catch (realmError) {
      console.error(`[DAO Creation] Error creating realm instruction:`, realmError)
      throw new Error(`Failed to create realm instruction: ${realmError instanceof Error ? realmError.message : String(realmError)}`)
    }

    const realmPubKey = createRealmInstruction.keys[0].pubkey
    console.log(`[DAO Creation] Realm public key: ${realmPubKey.toString()}`)

    // Create governance instruction with new parameters
    console.log(`[DAO Creation] Creating governance instruction...`)
    const governanceConfig = {
      communityVoteThreshold: { yesVotePercentage: { 0: daoCreationPayload.communityApprovalThreshold } },
      minCommunityWeightToCreateProposal: minWeightBN, // Use same BN value
      minTransactionHoldUpTime: daoCreationPayload.minTransactionHoldUpTime,
      votingBaseTime: daoCreationPayload.votingBaseTime,
      communityVoteTipping: { disabled: {} },
      councilVoteThreshold: { yesVotePercentage: { 0: daoCreationPayload.councilApprovalThreshold } },
      councilVetoVoteThreshold: { disabled: {} },
      minCouncilWeightToCreateProposal: daoCreationPayload.minCouncilWeightToCreateProposal,
      councilVoteTipping: { strict: {} },
      communityVetoVoteThreshold: { disabled: {} },
      votingCoolOffTime: daoCreationPayload.votingCoolOffTime,
      depositExemptProposalCount: daoCreationPayload.depositExemptProposalCount,
    }
    console.log(`[DAO Creation] Governance config:`, governanceConfig)
    
    let createGovernanceInstruction
    try {
      createGovernanceInstruction = await splGovernance.createGovernanceInstruction(
        governanceConfig,
        realmPubKey,
        payerPubKey,
        undefined,
        payerPubKey
      )
      console.log(`[DAO Creation] Governance instruction created successfully`)
    } catch (governanceError) {
      console.error(`[DAO Creation] Error creating governance instruction:`, governanceError)
      throw new Error(`Failed to create governance instruction: ${governanceError instanceof Error ? governanceError.message : String(governanceError)}`)
    }

    const governancePubKey = createGovernanceInstruction.keys[1].pubkey

    // Create native treasury instruction
    const createNativeTreasuryInstruction = await splGovernance.createNativeTreasuryInstruction(
      governancePubKey,
      payerPubKey
    )

    // Extract treasury address from the treasury instruction
    // Based on the transaction structure, the treasury address is the second account (keys[1])
    // keys[0] is the governance account, keys[1] is the actual treasury account
    const treasuryPubKey = createNativeTreasuryInstruction.keys[1].pubkey
    console.log("Treasury address:", treasuryPubKey.toBase58())

    // Build and send transaction
    const transaction = new Transaction().add(
      createRealmInstruction,
      createGovernanceInstruction,
      createNativeTreasuryInstruction
    )

    const { blockhash } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = payerPubKey

    // Sign and send transaction
    transaction.sign(wallet)
    const signature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    })

    // Wait for confirmation with extended timeout for devnet
    try {
      const confirmation = await Promise.race([
        connection.confirmTransaction(signature, 'confirmed'),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
        )
      ])
      console.log(`DAO created for token ${tokenMint} with signature: ${signature}`)
    } catch (timeoutError) {
      console.log(`Confirmation timeout for ${tokenMint}, checking transaction status...`)
      
      try {
        const transactionStatus = await connection.getSignatureStatus(signature)
        if (transactionStatus.value?.confirmationStatus === 'confirmed' || 
            transactionStatus.value?.confirmationStatus === 'finalized') {
          console.log(`DAO creation confirmed via status check for token ${tokenMint}`)
        } else {
          console.log(`Transaction status for ${tokenMint}:`, transactionStatus.value)
          if (transactionStatus.value?.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(transactionStatus.value.err)}`)
          }
          console.log(`Transaction for ${tokenMint} may still be processing`)
        }
      } catch (statusError) {
        console.error(`Error checking transaction status for ${tokenMint}:`, statusError)
      }
    }
    
    console.log(`DAO address for token ${tokenMint}: ${realmPubKey.toBase58()}`)
    console.log(`Treasury address for token ${tokenMint}: ${treasuryPubKey.toBase58()}`)
    return {
      daoAddress: realmPubKey.toBase58(),
      treasuryAddress: treasuryPubKey.toBase58()
    }

  } catch (error) {
    console.error(`Error creating DAO for token ${tokenMint}:`, error)
    throw error
  }
}

// Function to migrate a graduated token to DAMM V2
async function migrateToDammV2({
  tokenMint,
  wallet,
  connection,
  poolConfigKey
}: {
  tokenMint: string
  wallet: Keypair
  connection: Connection
  poolConfigKey: string
}): Promise<{ signature: string; dammV2PoolAddress?: string }> {
  console.log(`Starting DAMM V2 migration for token ${tokenMint}`)
  
  // Use the specific Meteora Dynamic Bonding Curve Program ID for migration
  const client = new DynamicBondingCurveClient(connection, "confirmed")
  // Note: Using the specific program ID dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN for Meteora DBC
  const baseMint = new PublicKey(tokenMint)
  
  // Get pool by deriving the address (same as in main function)
  const solMint = new PublicKey('So11111111111111111111111111111111111111112') // SOL
  const poolConfig = new PublicKey(poolConfigKey)
  const derivedPoolAddress = deriveDbcPoolAddress(solMint, baseMint, poolConfig)
  
  const virtualPoolState = await client.state.getPool(derivedPoolAddress)
  if (!virtualPoolState) {
    throw new Error(`Pool not found for address: ${derivedPoolAddress.toString()}`)
  }

  const configKey = virtualPoolState.config
  if (!configKey) {
    throw new Error("Pool config is undefined")
  }

  const poolConfigState = await client.state.getPoolConfig(configKey)
  console.log("Pool config state:", poolConfigState)

  const quoteMintKey = new PublicKey(poolConfigState.quoteMint)
  const migrationFeeOption = poolConfigState.migrationFeeOption
  const dammConfigAddress = new PublicKey(DAMM_V2_MIGRATION_FEE_ADDRESS[migrationFeeOption])
  
  // Check if fee claimer is the same as our wallet
  const feeClaimer = poolConfigState.feeClaimer
  const leftoverReceiver = poolConfigState.leftoverReceiver
  console.log("Fee claimer:", feeClaimer.toString())
  console.log("Leftover receiver:", leftoverReceiver.toString())
  console.log("Our wallet:", wallet.publicKey.toString())
  
  const isFeeClaimerOurWallet = feeClaimer.toString() === wallet.publicKey.toString()
  const isLeftoverReceiverOurWallet = leftoverReceiver.toString() === wallet.publicKey.toString()
  
  console.log("Is fee claimer our wallet:", isFeeClaimerOurWallet)
  console.log("Is leftover receiver our wallet:", isLeftoverReceiverOurWallet)
  
  if (!isFeeClaimerOurWallet || !isLeftoverReceiverOurWallet) {
    console.error("Migration requires fee claimer and leftover receiver to be the same as migration wallet")
    console.error(`Expected wallet: ${wallet.publicKey.toString()}`)
    console.error(`Fee claimer: ${feeClaimer.toString()}`)
    console.error(`Leftover receiver: ${leftoverReceiver.toString()}`)
    return { signature: "fee_claimer_mismatch" }
  }
  
  console.log("✅ Wallet verification passed - proceeding with migration")

  const migrationPoolAddress = deriveDbcPoolAddress(quoteMintKey, baseMint, configKey)
  console.log("Pool address for migration:", migrationPoolAddress.toString())
  console.log("DAMM config address:", dammConfigAddress.toString())
  console.log("Migration fee option:", migrationFeeOption)

  // Check if DAMM config exists
  const dammConfigAccount = await connection.getAccountInfo(dammConfigAddress)
  if (!dammConfigAccount) {
    console.error(`DAMM config account does not exist: ${dammConfigAddress.toString()}`)
    console.log("Skipping migration - DAMM V2 config not deployed yet")
    return { signature: "config_not_found" }
  }
  console.log("DAMM config account owner:", dammConfigAccount.owner.toString())
  
  // Verify the config is owned by the DAMM V2 program
  const expectedDammV2ProgramId = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
  if (dammConfigAccount.owner.toString() !== expectedDammV2ProgramId) {
    console.error(`DAMM config owned by wrong program. Expected: ${expectedDammV2ProgramId}, Got: ${dammConfigAccount.owner.toString()}`)
    return { signature: "wrong_program_owner" }
  }

  // Check if already migrated
  if (virtualPoolState.isMigrated !== 0) {
    console.log("Pool already migrated to DAMM V2")
    return { signature: "already_migrated" }
  }

  // Check if migration metadata exists
  console.log("Checking if migration metadata exists...")
  const migrationMetadata = deriveDammV2MigrationMetadataAddress(migrationPoolAddress)
  console.log("Migration metadata address:", migrationMetadata.toString())

  const metadataAccount = await connection.getAccountInfo(migrationMetadata)
  let metadataTx: Transaction | null = null
  if (!metadataAccount) {
    console.log("Creating migration metadata...")
    metadataTx = await client.migration.createDammV2MigrationMetadata({
      payer: wallet.publicKey,
      virtualPool: migrationPoolAddress,
      config: configKey,
    })
    
    // Log metadata transaction details
    if (metadataTx) {
      console.log("=== METADATA TRANSACTION DETAILS ===")
      console.log("Metadata transaction has", metadataTx.instructions.length, "instructions")
      
      metadataTx.instructions.forEach((instruction, index) => {
        console.log(`Metadata instruction ${index} has`, instruction.keys.length, "accounts")
        instruction.keys.forEach((key, keyIndex) => {
          console.log(`  Account ${keyIndex}: ${key.pubkey.toString()} | Signer: ${key.isSigner} | Writable: ${key.isWritable}`)
        })
      })
    }
  } else {
    console.log("Migration metadata already exists")
  }

  // Create locker if needed
  let lockerTx: Transaction | null = null
  if (poolConfigState.lockedVestingConfig.amountPerPeriod.gt(new BN(0))) {
    const base = deriveBaseKeyForLocker(migrationPoolAddress)
    const escrow = deriveEscrow(base)
    const escrowAccount = await connection.getAccountInfo(escrow)

    if (!escrowAccount) {
      console.log("Locker not found, creating locker...")
      lockerTx = await client.migration.createLocker({
        virtualPool: migrationPoolAddress,
        payer: wallet.publicKey,
      })
      
      // Log locker transaction details
      if (lockerTx) {
        console.log("=== LOCKER TRANSACTION DETAILS ===")
        console.log("Locker transaction has", lockerTx.instructions.length, "instructions")
        
        lockerTx.instructions.forEach((instruction, index) => {
          console.log(`Locker instruction ${index} has`, instruction.keys.length, "accounts")
          instruction.keys.forEach((key, keyIndex) => {
            console.log(`  Account ${keyIndex}: ${key.pubkey.toString()} | Signer: ${key.isSigner} | Writable: ${key.isWritable}`)
          })
        })
      }
    } else {
      console.log("Locker already exists, skipping creation")
    }
  } else {
    console.log("No locked vesting found, skipping locker creation")
  }

  // Create migration transaction
  console.log("Creating DAMM V2 migration transaction...")
  let migrateTx
  try {
    migrateTx = await client.migration.migrateToDammV2({
      payer: wallet.publicKey,
      virtualPool: migrationPoolAddress,
      dammConfig: dammConfigAddress,
    })
    console.log("✅ Migration transaction created successfully")
  } catch (error) {
    console.error("❌ Failed to create migration transaction:", error)
    throw error
  }
  
  // Log detailed transaction information for debugging
  console.log("=== MIGRATION TRANSACTION DETAILS ===")
  console.log("Transaction has", migrateTx.transaction.instructions.length, "instructions")
  
  if (migrateTx.transaction.instructions.length > 0) {
    const migrationInstruction = migrateTx.transaction.instructions[0]
    console.log("Migration instruction has", migrationInstruction.keys.length, "accounts")
    
    // Log each account in the migration instruction with details
    migrationInstruction.keys.forEach((key, index) => {
      console.log(`Account ${index}: ${key.pubkey.toString()} | Signer: ${key.isSigner} | Writable: ${key.isWritable}`)
    })
  } else {
    console.log("⚠️ No instructions found in migration transaction")
  }
  
  // Log NFT keypairs if available
  if (migrateTx.firstPositionNftKeypair) {
    console.log("First position NFT:", migrateTx.firstPositionNftKeypair.publicKey.toString())
  } else {
    console.log("⚠️ No first position NFT keypair found")
  }
  if (migrateTx.secondPositionNftKeypair) {
    console.log("Second position NFT:", migrateTx.secondPositionNftKeypair.publicKey.toString())
  } else {
    console.log("⚠️ No second position NFT keypair found")
  }
  
  console.log("=== END MIGRATION TRANSACTION DETAILS ===")

  // Extract DAMM V2 pool address from migration transaction
  // The DAMM V2 pool is typically one of the writable accounts in the migration instruction
  console.log("=== STARTING POOL ADDRESS EXTRACTION ===")
  let dammV2PoolAddress: string | null = null
  if (migrateTx.transaction.instructions.length > 0) {
    const migrationInstruction = migrateTx.transaction.instructions[0]
    
    console.log("=== POOL ADDRESS EXTRACTION DEBUG ===")
    console.log("Migration instruction has", migrationInstruction.keys.length, "accounts")
    
    // Log all accounts in the migration instruction for debugging
    migrationInstruction.keys.forEach((key, index) => {
      console.log(`[DEBUG] Account ${index}: ${key.pubkey.toString()} | Signer: ${key.isSigner} | Writable: ${key.isWritable}`)
    })
    
    // Primary method: Based on the transaction analysis, the DAMM V2 pool is typically 
    // the 5th account (index 4) in the migration instruction, which is marked as writable
    if (migrationInstruction.keys.length > 4) {
      const potentialPoolAccount = migrationInstruction.keys[4]
      if (potentialPoolAccount.isWritable) {
        const potentialAddress = potentialPoolAccount.pubkey.toString()
        console.log(`[DAMM V2] Found potential DAMM V2 pool address at index 4: ${potentialAddress}`)
        
        // Validate this is actually a DAMM V2 pool by checking its owner
        try {
          const poolAccountInfo = await connection.getAccountInfo(new PublicKey(potentialAddress))
          if (poolAccountInfo) {
            const expectedDammV2ProgramId = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
            console.log(`[DEBUG] Account ${potentialAddress} owner: ${poolAccountInfo.owner.toString()}`)
            console.log(`[DEBUG] Expected DAMM V2 program: ${expectedDammV2ProgramId}`)
            
            if (poolAccountInfo.owner.toString() === expectedDammV2ProgramId) {
              dammV2PoolAddress = potentialAddress
              console.log(`[DAMM V2] ✅ Validated DAMM V2 pool address: ${dammV2PoolAddress}`)
            } else {
              console.log(`[DAMM V2] ⚠️ Account at index 4 (${potentialAddress}) is not owned by DAMM V2 program (owner: ${poolAccountInfo.owner.toString()}), trying fallback methods`)
            }
          } else {
            console.log(`[DAMM V2] ⚠️ Account at index 4 does not exist, trying fallback methods`)
          }
        } catch (validationError) {
          console.log(`[DAMM V2] ⚠️ Could not validate pool account at index 4:`, validationError)
        }
      } else {
        console.log(`[DAMM V2] Account at index 4 is not writable, trying fallback methods`)
      }
    } else {
      console.log(`[DAMM V2] Migration instruction has fewer than 5 accounts (${migrationInstruction.keys.length}), trying fallback methods`)
    }
    
    // Fallback: Look for the DAMM V2 pool address by examining the account structure
    // The DAMM V2 pool is typically a writable account that appears after the virtual pool
    if (!dammV2PoolAddress) {
      console.log("[DAMM V2] Trying fallback method 1: looking for accounts after virtual pool")
      const virtualPoolIndex = migrationInstruction.keys.findIndex(key => 
        key.pubkey.toString() === migrationPoolAddress.toString()
      )
      
      console.log(`[DEBUG] Virtual pool found at index: ${virtualPoolIndex}`)
      
      if (virtualPoolIndex !== -1 && virtualPoolIndex + 1 < migrationInstruction.keys.length) {
        // Look for the next writable account after the virtual pool, which is likely the DAMM V2 pool
        for (let i = virtualPoolIndex + 1; i < migrationInstruction.keys.length; i++) {
          const account = migrationInstruction.keys[i]
          console.log(`[DEBUG] Checking account at index ${i}: ${account.pubkey.toString()} | Writable: ${account.isWritable}`)
          
          if (account.isWritable && account.pubkey.toString() !== migrationPoolAddress.toString()) {
            // Validate this is actually a DAMM V2 pool
            try {
              const poolAccountInfo = await connection.getAccountInfo(account.pubkey)
              if (poolAccountInfo) {
                const expectedDammV2ProgramId = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
                console.log(`[DEBUG] Account ${account.pubkey.toString()} owner: ${poolAccountInfo.owner.toString()}`)
                
                if (poolAccountInfo.owner.toString() === expectedDammV2ProgramId) {
                  dammV2PoolAddress = account.pubkey.toString()
                  console.log(`[DAMM V2] ✅ Found and validated DAMM V2 pool address at index ${i}: ${dammV2PoolAddress}`)
                  break
                } else {
                  console.log(`[DEBUG] Account at index ${i} is not owned by DAMM V2 program`)
                }
              }
            } catch (validationError) {
              console.log(`[DAMM V2] Could not validate account at index ${i}:`, validationError)
            }
          }
        }
      } else {
        console.log(`[DEBUG] Virtual pool not found or no accounts after it`)
      }
    }
    
    // Additional fallback: if we couldn't find it by position, try to identify it by looking for
    // writable accounts that are owned by the DAMM V2 program
    if (!dammV2PoolAddress) {
      console.log("[DAMM V2] Trying fallback method 2: searching all writable accounts for DAMM V2 ownership")
      const expectedDammV2ProgramId = "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG"
      
      for (let i = 0; i < migrationInstruction.keys.length; i++) {
        const account = migrationInstruction.keys[i]
        if (account.isWritable) {
          console.log(`[DEBUG] Checking writable account at index ${i}: ${account.pubkey.toString()}`)
          
          try {
            const accountInfo = await connection.getAccountInfo(account.pubkey)
            if (accountInfo) {
              console.log(`[DEBUG] Account ${account.pubkey.toString()} owner: ${accountInfo.owner.toString()}`)
              
              if (accountInfo.owner.toString() === expectedDammV2ProgramId) {
                dammV2PoolAddress = account.pubkey.toString()
                console.log(`[DAMM V2] ✅ Found DAMM V2 pool by program ownership at index ${i}: ${dammV2PoolAddress}`)
                break
              } else {
                console.log(`[DEBUG] Account at index ${i} is not owned by DAMM V2 program`)
              }
            } else {
              console.log(`[DEBUG] Account at index ${i} does not exist`)
            }
          } catch (validationError) {
            console.log(`[DEBUG] Could not validate account at index ${i}:`, validationError)
            // Skip accounts we can't validate
          }
        }
      }
    }
    
    if (dammV2PoolAddress) {
      console.log(`[DAMM V2] Extracted DAMM V2 pool address from migration transaction: ${dammV2PoolAddress}`)
    } else {
      console.log(`[DAMM V2] Could not determine DAMM V2 pool address from migration transaction`)
    }
  } else {
    console.log("⚠️ No migration instructions found for pool address extraction")
  }
  
  console.log("=== POOL ADDRESS EXTRACTION COMPLETED ===")
  console.log("Final DAMM V2 pool address:", dammV2PoolAddress)

  console.log("Migration transaction details:")
  console.log("- Transaction signatures before signing:", migrateTx.transaction.signatures.map(sig => ({
    publicKey: sig.publicKey?.toString(),
    signature: sig.signature ? "present" : "missing"
  })))
  console.log("- First position NFT keypair:", migrateTx.firstPositionNftKeypair?.publicKey.toString())
  console.log("- Second position NFT keypair:", migrateTx.secondPositionNftKeypair?.publicKey.toString())
  console.log("- Transaction instructions count:", migrateTx.transaction.instructions.length)
  console.log("- Transaction accounts:", migrateTx.transaction.instructions.map(ix => 
    ix.keys.map(key => ({
      pubkey: key.pubkey.toString(),
      isSigner: key.isSigner,
      isWritable: key.isWritable
    }))
  ))

  // Create tip transaction
  const tipTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: JITO_TIP_ACCOUNT,
      lamports: 3_000_000, // 0.003 SOL tip
    })
  )

  // Helper function to prepare and sign a transaction with fresh blockhash
  const prepareTransaction = async (tx: Transaction, signers: Keypair[]) => {
    const { blockhash } = await connection.getLatestBlockhash("confirmed")
    tx.recentBlockhash = blockhash
    tx.feePayer = wallet.publicKey
    tx.sign(...signers)
    return tx
  }

  // Prepare metadata transaction if needed
  if (metadataTx) {
    await prepareTransaction(metadataTx, [wallet])
  }
  
  // Prepare locker transaction if needed
  if (lockerTx) {
    await prepareTransaction(lockerTx, [wallet])
  }
  
  // Prepare migration transaction - include all NFT keypairs as signers
  const requiredSigners = [wallet] // Always include the fee payer
  
  // Check which accounts in the transaction are marked as signers
  const signerAccounts = migrateTx.transaction.instructions.flatMap(ix => 
    ix.keys.filter(key => key.isSigner).map(key => key.pubkey.toString())
  )
  
  console.log("Transaction requires signers:", signerAccounts)
  console.log("Available NFT keypairs:", {
    first: migrateTx.firstPositionNftKeypair?.publicKey.toString(),
    second: migrateTx.secondPositionNftKeypair?.publicKey.toString()
  })
  
  // Always add NFT keypairs when they exist - the SDK may not mark them as signers in the transaction structure
  // but they are required for the migration to work properly
  if (migrateTx.firstPositionNftKeypair) {
    requiredSigners.push(migrateTx.firstPositionNftKeypair)
    console.log("Added first NFT keypair as signer")
  }
  if (migrateTx.secondPositionNftKeypair) {
    requiredSigners.push(migrateTx.secondPositionNftKeypair)
    console.log("Added second NFT keypair as signer")
  }
  
  console.log("Signing with keypairs:", requiredSigners.map(signer => signer.publicKey.toString()))
  await prepareTransaction(migrateTx.transaction, requiredSigners)
  
  // Prepare tip transaction (will get fresh blockhash when needed)
  // Don't prepare it yet - we'll do it right before sending

  // Helper function to confirm transaction with timeout handling
  const confirmTransactionWithTimeout = async (signature: string, description: string) => {
    try {
      await Promise.race([
        connection.confirmTransaction(signature, 'confirmed'),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Confirmation timeout')), 60000)
        )
      ])
      console.log(`${description} transaction confirmed:`, signature)
    } catch (timeoutError) {
      console.log(`Confirmation timeout for ${description}, checking transaction status...`)
      
      try {
        const transactionStatus = await connection.getSignatureStatus(signature)
        if (transactionStatus.value?.confirmationStatus === 'confirmed' || 
            transactionStatus.value?.confirmationStatus === 'finalized') {
          console.log(`${description} confirmed via status check`)
        } else {
          console.log(`Transaction status for ${description}:`, transactionStatus.value)
          if (transactionStatus.value?.err) {
            throw new Error(`Transaction failed: ${JSON.stringify(transactionStatus.value.err)}`)
          }
          console.log(`Transaction for ${description} may still be processing`)
        }
      } catch (statusError) {
        console.error(`Error checking transaction status for ${description}:`, statusError)
      }
    }
  }

  // For Cloudflare Workers, we'll send transactions sequentially instead of using Jito bundles
  // as Jito SDK might not be available in the Workers environment
  try {
    const signatures: string[] = []
    
    // Send metadata transaction first if needed
    if (metadataTx) {
      console.log("Sending migration metadata transaction...")
      const metadataSignature = await connection.sendRawTransaction(metadataTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      })
      await confirmTransactionWithTimeout(metadataSignature, "Metadata")
      signatures.push(metadataSignature)
    }

    // Send locker transaction if needed
    if (lockerTx) {
      console.log("Sending locker transaction...")
      const lockerSignature = await connection.sendRawTransaction(lockerTx.serialize(), {
        skipPreflight: false,
        maxRetries: 3,
      })
      await confirmTransactionWithTimeout(lockerSignature, "Locker")
      signatures.push(lockerSignature)
    }

    // Send migration transaction
    console.log("=== ABOUT TO SEND MIGRATION TRANSACTION ===")
    console.log("Transaction has", migrateTx.transaction.instructions.length, "instructions")
    console.log("Sending migration transaction...")
    const migrationSignature = await connection.sendRawTransaction(migrateTx.transaction.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })
    await confirmTransactionWithTimeout(migrationSignature, "Migration")
    signatures.push(migrationSignature)

    // Send tip transaction with fresh blockhash
    console.log("Sending tip transaction...")
    await prepareTransaction(tipTx, [wallet])
    const tipSignature = await connection.sendRawTransaction(tipTx.serialize(), {
      skipPreflight: false,
      maxRetries: 3,
    })
    await confirmTransactionWithTimeout(tipSignature, "Tip")
    signatures.push(tipSignature)

    console.log(`DAMM V2 migration completed for token ${tokenMint}!`)
    return { 
      signature: migrationSignature,
      dammV2PoolAddress: dammV2PoolAddress || undefined
    }

  } catch (error) {
    console.error(`Failed to migrate token ${tokenMint} to DAMM V2:`, error)
    throw error
  }
}
