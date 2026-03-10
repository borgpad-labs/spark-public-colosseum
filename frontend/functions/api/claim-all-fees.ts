import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"
import { Connection, PublicKey, Keypair } from '@solana/web3.js'
import { CpAmm } from '@meteora-ag/cp-amm-sdk'
import BN from 'bn.js'
import bs58 from "bs58"

type ENV = {
  DB: D1Database
  RPC_URL: string
  PRIVATE_KEY: string
  ADMIN_API_KEY: string
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    // Check admin authorization
    // const authHeader = ctx.request.headers.get('Authorization')
    // if (authHeader !== ctx.env.ADMIN_API_KEY) {
    //   return jsonResponse({ message: "Unauthorized" }, 401)
    // }

    console.log('Starting fee claim process for all pools...')

    // Initialize connection and client
    const connection = new Connection(ctx.env.RPC_URL, 'confirmed')
    const cpAmm = new CpAmm(connection)

    // Get wallet from private key
    const privateKeyUint8Array = bs58.decode(ctx.env.PRIVATE_KEY)
    const wallet = Keypair.fromSecretKey(privateKeyUint8Array)
    const partnerPublicKey = wallet.publicKey

    // Get all tokens with DAOs from database first
    const tokensWithDao = await ctx.env.DB
      .prepare(`
        SELECT t.mint, t.name, t.twitter_account, t.dao
        FROM tokens t
        WHERE t.dao IS NOT NULL 
        AND t.dao != ''
      `)
      .all()

    console.log(`Found ${tokensWithDao.results?.length || 0} tokens with DAOs in database`)

    if (!tokensWithDao.results || tokensWithDao.results.length === 0) {
      return jsonResponse({
        success: true,
        summary: {
          totalPools: 0,
          tokensWithDao: 0,
          successfulClaims: 0,
          failedClaims: 0,
          totalClaimed: 0
        },
        claimedPools: []
      }, 200)
    }

    // Get all pools from Meteora
    const pools = await cpAmm.getAllPools()
    console.log(`Found ${pools.length} total pools on Meteora`)

    // Create a set of token mints for faster lookup
    const tokenMints = new Set(tokensWithDao.results.map(token => token.mint))
    console.log(`Looking for pools containing these token mints: ${Array.from(tokenMints).join(', ')}`)

    // Filter pools to only those containing our tokens
    let relevantPoolsCount = 0
    const relevantPools = pools.filter(pool => {
      const tokenAMint = pool.account.tokenAMint.toString()
      const tokenBMint = pool.account.tokenBMint.toString()
      const isRelevant = tokenMints.has(tokenAMint) || tokenMints.has(tokenBMint)
      
      return isRelevant
    })

    console.log(`Found ${relevantPools.length} pools containing our tokens`)
    
    // If no relevant pools found, let's check a few random pools to see what tokens are in them
    if (relevantPools.length === 0) {
      console.log('🔍 Debug: Checking first 10 pools to see what tokens are available:')
      pools.slice(0, 10).forEach((pool, index) => {
        const tokenAMint = pool.account.tokenAMint.toString()
        const tokenBMint = pool.account.tokenBMint.toString()
        console.log(`Pool ${index + 1}: ${tokenAMint} - ${tokenBMint}`)
      })
      
      // Search for pools containing our specific tokens
      console.log('🔍 Searching for pools containing our specific tokens:')
      tokensWithDao.results.forEach(token => {
        console.log(`\nLooking for pools containing token: ${token.name} (${token.mint})`)
        const poolsWithToken = pools.filter(pool => {
          const tokenAMint = pool.account.tokenAMint.toString()
          const tokenBMint = pool.account.tokenBMint.toString()
          return tokenAMint === token.mint || tokenBMint === token.mint
        })
        
        if (poolsWithToken.length > 0) {
          console.log(`✅ Found ${poolsWithToken.length} pools for ${token.name}:`)
          poolsWithToken.forEach((pool, index) => {
            const tokenAMint = pool.account.tokenAMint.toString()
            const tokenBMint = pool.account.tokenBMint.toString()
            console.log(`  Pool ${index + 1}: ${pool.publicKey.toString()}`)
            console.log(`    Token A: ${tokenAMint}`)
            console.log(`    Token B: ${tokenBMint}`)
          })
        } else {
          console.log(`❌ No pools found for ${token.name} (${token.mint})`)
        }
      })
    }

    let totalClaimed = 0
    let successfulClaims = 0
    let failedClaims = 0
    const claimedPools = []

    // Process each relevant pool
    for (const pool of relevantPools) {
      try {
        const poolAddress = pool.publicKey.toString()
        const tokenAMint = pool.account.tokenAMint.toString()
        const tokenBMint = pool.account.tokenBMint.toString()

        console.log(`Processing pool: ${poolAddress}`)
        console.log(`- Token A: ${tokenAMint}`)
        console.log(`- Token B: ${tokenBMint}`)

        // Find the matching token from our database
        const matchingToken = tokensWithDao.results?.find(token => 
          token.mint === tokenAMint || token.mint === tokenBMint
        )

        if (!matchingToken) {
          console.log(`❌ No matching token found for pool ${poolAddress}`)
          continue
        }

        console.log(`✅ Found matching token: ${matchingToken.name} (${matchingToken.mint}) with DAO: ${matchingToken.dao}`)

        // Skip pools without partner fees (we know these pools don't have partner fees configured)
        console.log(`⚠️ Skipping pool ${poolAddress} - no partner fees configured`)
        continue

        // Claim partner fees
        const claimTx = await cpAmm.claimPartnerFee({
          partner: partnerPublicKey,
          pool: pool.publicKey,
          maxAmountA: new BN(1000000000), // 1 token A (adjust based on your needs)
          maxAmountB: new BN(1000000000)  // 1 token B (adjust based on your needs)
        })

        // Get recent blockhash and set it on the transaction
        const { blockhash } = await connection.getLatestBlockhash()
        claimTx.recentBlockhash = blockhash
        claimTx.feePayer = wallet.publicKey

        // Sign and send transaction
        claimTx.sign(wallet)
        const txSignature = await connection.sendRawTransaction(claimTx.serialize(), {
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        })

        console.log(`Successfully claimed fees for pool ${poolAddress}: ${txSignature}`)

        // Update database with claimed fees
        await ctx.env.DB
          .prepare(`
            UPDATE tokens 
            SET fees_claimed = fees_claimed + ? 
            WHERE mint = ?
          `)
          .bind(1000000000, matchingToken.mint) // Update with actual claimed amount
          .run()

        // Update twitter_users if twitter_account exists
        if (matchingToken.twitter_account) {
          await ctx.env.DB
            .prepare(`
              UPDATE twitter_users 
              SET fees_claimed = fees_claimed + ? 
              WHERE username = ?
            `)
            .bind(1000000000, matchingToken.twitter_account) // Update with actual claimed amount
            .run()
        }

        successfulClaims++
        totalClaimed += 1000000000 // Update with actual claimed amount
        claimedPools.push({
          poolAddress,
          tokenName: matchingToken.name,
          tokenMint: matchingToken.mint,
          txSignature
        })

        // Add delay between claims to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`Failed to claim fees for pool ${pool.publicKey.toString()}:`, error)
        failedClaims++
      }
    }

    console.log(`Fee claim process completed:`)
    console.log(`- Successful claims: ${successfulClaims}`)
    console.log(`- Failed claims: ${failedClaims}`)
    console.log(`- Total claimed: ${totalClaimed}`)

    return jsonResponse({
      success: true,
      summary: {
        totalPools: pools.length,
        tokensWithDao: tokensWithDao.results?.length || 0,
        successfulClaims,
        failedClaims,
        totalClaimed
      },
      claimedPools
    }, 200)

  } catch (e) {
    await reportError(ctx.env.DB, e)
    return jsonResponse({ message: "Something went wrong..." }, 500)
  }
}

// Helper function to check if partner fees are available
async function checkPartnerFeesAvailable(cpAmm, poolAddress, partnerAddress) {
  try {
    // This is a placeholder - you'll need to implement the actual logic
    // to check if there are partner fees available for claiming
    // You might need to query the pool state or use specific SDK methods
    
    // For now, return true to attempt claiming
    return true
  } catch (error) {
    console.error('Error checking partner fees:', error)
    return false
  }
} 