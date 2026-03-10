import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"
import { drizzle } from "drizzle-orm/d1"
import { Connection, PublicKey, Keypair, sendAndConfirmTransaction } from "@solana/web3.js"
import { CpAmm, getTokenProgram } from "@meteora-ag/cp-amm-sdk"
import bs58 from "bs58"

type ENV = {
  DB: D1Database
  RPC_URL: string
  PRIVATE_KEY: string
}

interface ClaimPositionFeeRequest {
  receiver?: string            // The receiver of the claimed fees (optional, defaults to wallet)
  userAddress: string         // The user address to get positions for
  pool: string               // The pool address
  // Optional: specify which position to use, otherwise uses position with largest liquidity
  position?: string          // The specific position address (optional)
  positionNftAccount?: string // The specific position NFT account (optional)
  // Optional manual token parameters (fallback if fetchPoolState fails)
  tokenAVault?: string        // The pool's token A vault
  tokenBVault?: string        // The pool's token B vault
  tokenAMint?: string         // The mint of token A
  tokenBMint?: string         // The mint of token B
  tokenAFlag?: number         // Token A flag for program determination
  tokenBFlag?: number         // Token B flag for program determination
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const db = drizzle(ctx.env.DB, { logger: true })
  try {
    // parse request body
    const requestBody: ClaimPositionFeeRequest = await ctx.request.json()
    const { 
      receiver,
      userAddress,
      pool, 
      position, 
      positionNftAccount,
      tokenAVault,
      tokenBVault,
      tokenAMint,
      tokenBMint,
      tokenAFlag,
      tokenBFlag
    } = requestBody

    // validate required fields
    if (!userAddress || !pool) {
      return jsonResponse({
        message: "Must provide userAddress and pool parameters!"
      }, 400)
    }

    // validate address formats
    let receiverPubKey: PublicKey
    let userAddressPubKey: PublicKey
    let poolPubKey: PublicKey
    let positionPubKey: PublicKey | undefined
    let positionNftAccountPubKey: PublicKey | undefined

    try {
      userAddressPubKey = new PublicKey(userAddress)
      poolPubKey = new PublicKey(pool)
      if (position) positionPubKey = new PublicKey(position)
      if (positionNftAccount) positionNftAccountPubKey = new PublicKey(positionNftAccount)
    } catch (error) {
      return jsonResponse({
        message: "Invalid address format in one or more parameters!"
      }, 400)
    }

    // initialize wallet from private key
    const privateKeyString = ctx.env.PRIVATE_KEY
    if (!privateKeyString || typeof privateKeyString !== 'string') {
      throw new Error('Invalid private key format')
    }

    const privateKeyUint8Array = bs58.decode(privateKeyString)
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array)

    // receiver defaults to wallet if not provided
    receiverPubKey = receiver ? new PublicKey(receiver) : wallet.publicKey

    // initialize Solana connection and CP-AMM
    const connection = new Connection(ctx.env.RPC_URL, "confirmed")
    const cpAmm = new CpAmm(connection)

    // first, let's check the pool account info for debugging
    let poolAccountInfo
    try {
      poolAccountInfo = await connection.getAccountInfo(poolPubKey)
      console.log("Pool account info:", {
        owner: poolAccountInfo?.owner.toString(),
        dataLength: poolAccountInfo?.data.length,
        executable: poolAccountInfo?.executable,
        lamports: poolAccountInfo?.lamports
      })
    } catch (error) {
      console.error("Error getting pool account info:", error)
      return jsonResponse({
        message: "Failed to get pool account info. Pool may not exist.",
        error: error instanceof Error ? error.message : String(error),
        poolAddress: poolPubKey.toString()
      }, 400)
    }

    if (!poolAccountInfo) {
      return jsonResponse({
        message: "Pool account does not exist.",
        poolAddress: poolPubKey.toString()
      }, 400)
    }

    // get user positions if not manually specified
    let finalPosition: { position: PublicKey, positionNftAccount: PublicKey }
    
    if (positionPubKey && positionNftAccountPubKey) {
      // use manually provided position
      finalPosition = {
        position: positionPubKey,
        positionNftAccount: positionNftAccountPubKey
      }
      console.log("Using manually provided position")
    } else {
      // fetch user positions automatically
      try {
        const userPositions = await cpAmm.getUserPositionByPool(poolPubKey, userAddressPubKey)
        
        if (!userPositions || userPositions.length === 0) {
          return jsonResponse({
            message: "No positions found for this user in the specified pool.",
            poolAddress: poolPubKey.toString(),
            userAddress: userAddressPubKey.toString()
          }, 400)
        }

        // get position with largest liquidity (first one)
        finalPosition = userPositions[0]
        console.log(`Found ${userPositions.length} positions, using position with largest liquidity:`, finalPosition.position.toString())
        
      } catch (error) {
        console.error("Error fetching user positions:", error)
        return jsonResponse({
          message: "Failed to fetch user positions from pool.",
          error: error instanceof Error ? error.message : String(error),
          poolAddress: poolPubKey.toString(),
          userAddress: userAddressPubKey.toString()
        }, 400)
      }
    }

    // determine if we should use manual parameters or fetch pool state
    let tokenAVaultPubKey: PublicKey
    let tokenBVaultPubKey: PublicKey  
    let tokenAMintPubKey: PublicKey
    let tokenBMintPubKey: PublicKey
    let tokenAProgramPubKey: PublicKey
    let tokenBProgramPubKey: PublicKey

    const hasManualTokenParams = tokenAVault && tokenBVault && tokenAMint && tokenBMint && 
                                tokenAFlag !== undefined && tokenBFlag !== undefined

    if (hasManualTokenParams) {
      // use manually provided token parameters
      try {
        tokenAVaultPubKey = new PublicKey(tokenAVault!)
        tokenBVaultPubKey = new PublicKey(tokenBVault!)
        tokenAMintPubKey = new PublicKey(tokenAMint!)
        tokenBMintPubKey = new PublicKey(tokenBMint!)
        tokenAProgramPubKey = getTokenProgram(tokenAFlag!)
        tokenBProgramPubKey = getTokenProgram(tokenBFlag!)
        
        console.log("Using manually provided token parameters")
      } catch (error) {
        return jsonResponse({
          message: "Invalid format in manually provided token parameters!",
          error: error instanceof Error ? error.message : String(error)
        }, 400)
      }
    } else {
      // try to fetch pool state automatically
      let poolState
      try {
        poolState = await cpAmm.fetchPoolState(poolPubKey)
        
        tokenAVaultPubKey = poolState.tokenAVault
        tokenBVaultPubKey = poolState.tokenBVault
        tokenAMintPubKey = poolState.tokenAMint
        tokenBMintPubKey = poolState.tokenBMint
        tokenAProgramPubKey = getTokenProgram(poolState.tokenAFlag)
        tokenBProgramPubKey = getTokenProgram(poolState.tokenBFlag)
        
        console.log("Successfully fetched pool state automatically")
      } catch (error) {
        console.error("Error fetching pool state:", error)
        
        // If fetchPoolState fails due to buffer issues, we need the caller to provide the token info
        return jsonResponse({
          message: "Failed to fetch pool state due to SDK compatibility issue. Please provide tokenAVault, tokenBVault, tokenAMint, tokenBMint, tokenAFlag, and tokenBFlag parameters manually.",
          error: error instanceof Error ? error.message : String(error),
          poolAddress: poolPubKey.toString(),
          accountDataLength: poolAccountInfo.data.length,
          suggestedAction: "Use the original API format with all token parameters included"
        }, 400)
      }

      // verify pool state was fetched successfully
      if (!poolState) {
        return jsonResponse({
          message: "Pool state is null or undefined. The pool may not exist or be initialized.",
          poolAddress: poolPubKey.toString()
        }, 400)
      }
    }

    // create the claim position fee transaction
    let claimPositionFeesTx
    try {
      claimPositionFeesTx = await cpAmm.claimPositionFee({
        receiver: receiverPubKey,
        owner: userAddressPubKey,
        pool: poolPubKey,
        position: finalPosition.position,
        positionNftAccount: finalPosition.positionNftAccount,
        tokenAVault: tokenAVaultPubKey,
        tokenBVault: tokenBVaultPubKey,
        tokenAMint: tokenAMintPubKey,
        tokenBMint: tokenBMintPubKey,
        tokenAProgram: tokenAProgramPubKey,
        tokenBProgram: tokenBProgramPubKey,
      })
    } catch (error) {
      console.error("Error creating claim position fee transaction:", error)
      return jsonResponse({
        message: "Failed to create claim position fee transaction. Please verify the position and account addresses are correct.",
        error: error instanceof Error ? error.message : String(error),
        poolAddress: poolPubKey.toString(),
        positionAddress: finalPosition.position.toString()
      }, 400)
    }

    // verify transaction was created successfully
    if (!claimPositionFeesTx) {
      return jsonResponse({
        message: "Claim position fee transaction is null or undefined.",
        poolAddress: poolPubKey.toString(),
        positionAddress: finalPosition.position.toString()
      }, 400)
    }

    // set transaction properties
    claimPositionFeesTx.feePayer = wallet.publicKey
    const { blockhash } = await connection.getLatestBlockhash()
    claimPositionFeesTx.recentBlockhash = blockhash

    // simulate transaction first to check for errors
    const simulationResult = await connection.simulateTransaction(claimPositionFeesTx)
    if (simulationResult.value.err) {
      return jsonResponse({
        message: "Transaction simulation failed",
        error: simulationResult.value.err,
        logs: simulationResult.value.logs
      }, 400)
    }

    // send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      connection,
      claimPositionFeesTx,
      [wallet],
      {
        commitment: "confirmed",
      }
    )

    return jsonResponse({
      receiver: receiverPubKey.toString(),
      owner: userAddressPubKey.toString(),
      pool: poolPubKey.toString(),
      position: finalPosition.position.toString(),
      positionNftAccount: finalPosition.positionNftAccount.toString(),
      signature,
      success: true,
      message: "Position fees claimed successfully"
    }, 200)

  } catch (e) {
    await reportError(ctx.env.DB, e)
    return jsonResponse({ 
      message: "Something went wrong...",
      error: e instanceof Error ? e.message : String(e)
    }, 500)
  }
}
