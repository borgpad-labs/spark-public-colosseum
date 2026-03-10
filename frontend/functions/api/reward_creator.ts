import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"
import { Connection, PublicKey, Keypair, SystemProgram, Transaction } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, createTransferInstruction } from '@solana/spl-token'
import bs58 from "bs58"
import BN from 'bn.js'

type ENV = {
  DB: D1Database
  RPC_URL: string
  FEES_PRIVATE_KEY: string
}

interface RequestBody {
  walletAddress: string
  twitterAccount: string
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    const requestBody: RequestBody = await ctx.request.json()
    
    if (!requestBody.walletAddress || !requestBody.twitterAccount) {
      return jsonResponse({ message: "Missing required fields: walletAddress and twitterAccount" }, 400)
    }

    console.log(`🎯 Processing creator reward for ${requestBody.twitterAccount} to wallet ${requestBody.walletAddress} for ALL unclaimed fees`)

    // Initialize connection
    const connection = new Connection(ctx.env.RPC_URL, 'confirmed')
    console.log(`🔗 Connected to RPC: ${ctx.env.RPC_URL}`)

    // Get wallet from private key
    const privateKeyUint8Array = bs58.decode(ctx.env.FEES_PRIVATE_KEY)
    const payerWallet = Keypair.fromSecretKey(privateKeyUint8Array)
    console.log(`💰 Payer wallet address: ${payerWallet.publicKey.toString()}`)

    // Check payer wallet balance first
    const payerBalance = await connection.getBalance(payerWallet.publicKey)
    const payerBalanceSOL = payerBalance / 1_000_000_000
    console.log(`💳 Payer wallet balance: ${payerBalanceSOL} SOL (${payerBalance} lamports)`)

    // Get total fees earned from all tokens for this user
    console.log(`🔍 Querying total fees for twitter account: ${requestBody.twitterAccount}`)
    const tokenFeesQuery = `
      SELECT 
        t.name as token_name,
        t.mint as token_mint,
        COALESCE(t.fees_claimed, 0) as fees_earned,
        COALESCE(t.user_fees_claimed, 0) as user_fees_claimed
      FROM tokens t 
      WHERE t.twitter_account = ? AND t.dao IS NOT NULL AND t.dao != ''
    `
    
    const tokenFeesResult = await ctx.env.DB.prepare(tokenFeesQuery)
      .bind(requestBody.twitterAccount)
      .all()

    console.log('💰 Token fees result:', tokenFeesResult)

    if (!tokenFeesResult.results || tokenFeesResult.results.length === 0) {
      console.log(`❌ No tokens found for Twitter account ${requestBody.twitterAccount}`)
      return jsonResponse({ 
        message: `No tokens found for Twitter account ${requestBody.twitterAccount} or tokens don't have a DAO`,
        twitterAccount: requestBody.twitterAccount
      }, 404)
    }

    // Calculate total fees earned across all tokens
    const tokenBreakdown = tokenFeesResult.results.map((row: any) => ({
      tokenName: row.token_name,
      tokenMint: row.token_mint,
      feesEarned: parseFloat(row.fees_earned || '0'),
      userFeesClaimed: parseFloat(row.user_fees_claimed || '0')
    }))

    const totalFeesEarned = tokenBreakdown.reduce((sum, token) => sum + token.feesEarned, 0) / 10 // Divide by 10 to make amounts more reasonable
    const totalUserFeesClaimed = tokenBreakdown.reduce((sum, token) => sum + token.userFeesClaimed, 0)
    console.log(`💎 Total fees earned across all tokens: ${totalFeesEarned} SOL (divided by 10)`)
    console.log(`💸 Total user fees already claimed: ${totalUserFeesClaimed} SOL`)

    // Use the new user_fees_claimed from tokens table (more reliable)
    const totalFeesClaimed = totalUserFeesClaimed
    console.log(`📋 Total fees already claimed (from tokens.user_fees_claimed): ${totalFeesClaimed} SOL`)

    // Calculate available reward: remaining fees that haven't been claimed yet
    const availableReward = Math.max(0, totalFeesEarned - totalFeesClaimed)
    
    console.log(`🎯 Available reward to claim: ${availableReward} SOL`)
    console.log(`📊 Verification: Total (${totalFeesEarned}) = Already Claimed (${totalFeesClaimed}) + Available (${availableReward})`)
    
    if (availableReward <= 0) {
      console.log(`❌ No available reward for ${requestBody.twitterAccount}`)
      return jsonResponse({ 
        message: "No available reward to claim",
        totalFeesEarned,
        totalFeesClaimed,
        availableReward: 0
      }, 400)
    }

    // Use the available reward amount (fees are in SOL, convert to lamports)
    const rewardAmountSOL = availableReward
    const grossRewardLamports = Math.floor(rewardAmountSOL * 1_000_000_000) // Convert SOL to lamports
    
    // Deduct transaction fee from reward instead of requiring it separately
    const transactionFeeEstimate = 5000 // 0.000005 SOL for transaction fee
    const rewardAmountLamports = grossRewardLamports - transactionFeeEstimate
    const finalRewardSOL = rewardAmountLamports / 1_000_000_000
    
    console.log(`🎁 Reward calculation: ${availableReward} SOL = ${rewardAmountSOL} SOL (${grossRewardLamports} lamports)`)
    console.log(`💸 Deducting transaction fee: ${grossRewardLamports} - ${transactionFeeEstimate} = ${rewardAmountLamports} lamports (${finalRewardSOL} SOL)`)

    if (rewardAmountLamports <= 0) {
      console.log(`❌ Reward amount too small after fee deduction: ${finalRewardSOL} SOL`)
      return jsonResponse({ 
        message: "Reward amount is too small to transfer after deducting transaction fee",
        totalFeesEarned,
        totalFeesClaimed,
        availableReward,
        grossReward: rewardAmountSOL,
        netReward: finalRewardSOL,
        transactionFee: transactionFeeEstimate / 1_000_000_000
      }, 400)
    }

    // Validate recipient wallet address
    let recipientPublicKey: PublicKey
    try {
      recipientPublicKey = new PublicKey(requestBody.walletAddress)
    } catch (error) {
      return jsonResponse({ message: "Invalid wallet address format" }, 400)
    }

    // Check if we have enough balance (only need reward amount since fee is deducted from reward)
    const currentPayerBalance = await connection.getBalance(payerWallet.publicKey)
    const requiredAmount = grossRewardLamports + transactionFeeEstimate // Need gross amount to pay net reward + fee
    
    console.log(`💰 Balance check:`)
    console.log(`   - Available: ${currentPayerBalance / 1_000_000_000} SOL (${currentPayerBalance} lamports)`)
    console.log(`   - Net reward to send: ${finalRewardSOL} SOL (${rewardAmountLamports} lamports)`)
    console.log(`   - Transaction fee: ${transactionFeeEstimate / 1_000_000_000} SOL (${transactionFeeEstimate} lamports)`)
    console.log(`   - Total required: ${requiredAmount / 1_000_000_000} SOL (${requiredAmount} lamports)`)
    
    if (currentPayerBalance < requiredAmount) {
      const shortfall = requiredAmount - currentPayerBalance
      console.log(`❌ INSUFFICIENT BALANCE! Short by ${shortfall / 1_000_000_000} SOL (${shortfall} lamports)`)
      return jsonResponse({ 
        message: "Insufficient balance in payer wallet",
        required: requiredAmount,
        requiredSOL: requiredAmount / 1_000_000_000,
        available: currentPayerBalance,
        availableSOL: currentPayerBalance / 1_000_000_000,
        shortfall: shortfall,
        shortfallSOL: shortfall / 1_000_000_000,
        payerWallet: payerWallet.publicKey.toString()
      }, 500)
    }

    console.log(`✅ Balance check passed! Sending ${finalRewardSOL} SOL (${rewardAmountLamports} lamports) to ${requestBody.walletAddress}`)

    // Create transfer transaction
    console.log(`🔄 Creating SOL transfer transaction...`)
    const transaction = new Transaction()
    
    // Add SOL transfer instruction
    const transferInstruction = SystemProgram.transfer({
      fromPubkey: payerWallet.publicKey,
      toPubkey: recipientPublicKey,
      lamports: rewardAmountLamports
    })
    
    transaction.add(transferInstruction)
    console.log(`📝 Added transfer instruction: ${rewardAmountLamports} lamports from ${payerWallet.publicKey.toString()} to ${recipientPublicKey.toString()}`)

    // Get recent blockhash and set fee payer
    const { blockhash } = await connection.getLatestBlockhash('confirmed')
    transaction.recentBlockhash = blockhash
    transaction.feePayer = payerWallet.publicKey
    console.log(`🔗 Set blockhash: ${blockhash}`)

    // Sign and send transaction
    transaction.sign(payerWallet)
    console.log(`✍️ Transaction signed, sending to network...`)
    
    const txSignature = await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed',
      maxRetries: 3
    })
    console.log(`📡 Transaction sent! Signature: ${txSignature}`)

    // Check transaction status with multiple attempts
    console.log(`⏳ Checking transaction status...`)
    let transactionConfirmed = false
    let attempts = 0
    const maxAttempts = 10
    
    while (!transactionConfirmed && attempts < maxAttempts) {
      attempts++
      console.log(`🔍 Attempt ${attempts}/${maxAttempts} - Checking transaction status...`)
      
      try {
        // Check transaction signature status
        const signatureStatus = await connection.getSignatureStatus(txSignature)
        console.log(`📊 Signature status:`, signatureStatus)
        
        if (signatureStatus?.value?.confirmationStatus === 'confirmed' || 
            signatureStatus?.value?.confirmationStatus === 'finalized') {
          transactionConfirmed = true
          console.log(`✅ Transaction confirmed! Status: ${signatureStatus.value.confirmationStatus}`)
          break
        }
        
        if (signatureStatus?.value?.err) {
          console.log(`❌ Transaction failed with error:`, signatureStatus.value.err)
          throw new Error(`Transaction failed: ${JSON.stringify(signatureStatus.value.err)}`)
        }
        
        // If not confirmed yet, wait 1 second before next attempt
        if (attempts < maxAttempts) {
          console.log(`⏱️ Transaction not confirmed yet, waiting 1 second...`)
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
        
      } catch (statusError) {
        console.log(`⚠️ Error checking transaction status (attempt ${attempts}):`, statusError)
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }
    
    if (!transactionConfirmed) {
      console.log(`⏰ Transaction status check timed out after ${maxAttempts} attempts`)
      console.log(`🔍 Manual check required: https://solscan.io/tx/${txSignature}`)
      
      // Check one more time with getTransaction to see if it exists
      try {
        const transaction = await connection.getTransaction(txSignature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0
        })
        
        if (transaction) {
          console.log(`✅ Transaction found in ledger, treating as successful`)
          transactionConfirmed = true
        } else {
          console.log(`❌ Transaction not found in ledger`)
          throw new Error(`Transaction was not confirmed within ${maxAttempts} seconds. Please check manually: https://solscan.io/tx/${txSignature}`)
        }
      } catch (getTransactionError) {
        console.log(`⚠️ Error getting transaction details:`, getTransactionError)
        throw new Error(`Transaction confirmation failed. Please check manually: https://solscan.io/tx/${txSignature}`)
      }
    }

    // Update user_fees_claimed in tokens table to prevent duplicate claims
    console.log(`📝 Updating user_fees_claimed in tokens table...`)
    const newTotalClaimed = totalFeesClaimed + availableReward
    
    try {
      // Update user_fees_claimed for all tokens owned by this user
      const updateQuery = `
        UPDATE tokens 
        SET user_fees_claimed = user_fees_claimed + ?
        WHERE twitter_account = ? AND dao IS NOT NULL AND dao != ''
      `
      
      console.log(`📝 Updating user_fees_claimed for ${requestBody.twitterAccount}, adding ${availableReward} SOL`)
      
      const updateResult = await ctx.env.DB.prepare(updateQuery)
        .bind(availableReward.toString(), requestBody.twitterAccount)
        .run()
      
      console.log(`✅ Updated user_fees_claimed: ${totalFeesClaimed} + ${availableReward} = ${newTotalClaimed} SOL`)
      console.log(`📊 Database update result:`, updateResult)
      
      if (updateResult.meta.changes === 0) {
        console.error(`⚠️ Unexpected: No tokens updated for ${requestBody.twitterAccount}`)
      } else {
        console.log(`🎉 Successfully updated ${updateResult.meta.changes} token(s) in tokens table`)
      }
      
    } catch (dbError) {
      console.error(`⚠️ Failed to update user_fees_claimed in database:`, dbError)
      // Don't fail the transaction since the SOL transfer was successful
    }

    console.log(`Creator reward sent: ${finalRewardSOL} SOL (net after fees) to ${requestBody.walletAddress} for ${requestBody.twitterAccount}`)

    return jsonResponse({
      success: true,
      message: "Creator reward sent successfully",
      transactionSignature: txSignature,
      totalFeesEarned,
      totalFeesClaimed,
      availableReward,
      grossRewardAmount: rewardAmountSOL,
      rewardAmount: finalRewardSOL,
      rewardAmountLamports,
      transactionFee: transactionFeeEstimate / 1_000_000_000,
      recipientWallet: requestBody.walletAddress,
      tokenBreakdown,
      newTotalClaimed
    }, 200)

  } catch (error) {
    console.error('❌ Failed to send creator reward:', error)
    
    // Enhanced error logging
    if (error instanceof Error) {
      console.error(`Error name: ${error.name}`)
      console.error(`Error message: ${error.message}`)
      console.error(`Error stack: ${error.stack}`)
    }
    
    await reportError(ctx.env.DB, error)
    return jsonResponse({ 
      message: "Failed to send creator reward",
      error: error instanceof Error ? error.message : "Unknown error",
      errorName: error instanceof Error ? error.name : "Unknown",
      timestamp: new Date().toISOString()
    }, 500)
  }
}

export const onRequestOptions: PagesFunction<ENV> = async (ctx) => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'http://localhost:5173',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
