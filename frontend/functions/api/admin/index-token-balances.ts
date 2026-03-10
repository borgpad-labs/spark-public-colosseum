import { getRpcUrlForCluster } from '../../../shared/solana/rpcUtils'
import { isApiKeyValid } from '../../services/apiKeyService'
import { jsonResponse, reportError } from "../cfPagesFunctionsUtils"
import { bigDecimal } from 'js-big-decimal'

const BorgMintAddress = '3dQTr7ror2QPKQ3GbBCokJUmjErGg8kTJzdnYjNfvi3Z'
const BorgDecimals = 9

type ENV = {
  DB: D1Database
  SOLANA_RPC_URL: string
}
export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  const db = ctx.env.DB
  try {
    // load/validate env
    const { SOLANA_RPC_URL } = ctx.env
    if (!SOLANA_RPC_URL) throw new Error('Misconfigured env!')
    const rpcUrl = getRpcUrlForCluster(SOLANA_RPC_URL, 'mainnet')

    // authorize request
    if (!await isApiKeyValid({ ctx, permissions: ['write'] })) {
      return jsonResponse(null, 401)
    }

    // happy flow
    const now = new Date()
    
    console.log('Fetching token accounts...')
    const tokenAccounts: TokenAccount[] = []
    let page = 1
    while (true) {
      const requestBody = {
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenAccounts",
        params: {
          page,
          limit: 1000,
          mint: BorgMintAddress,
        }
      }

      console.log(`Fetching token accounts - solana RPC request: page=${page}`)
      const response = await fetch(rpcUrl, {
        method: "post",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const responseJson = await response.json() as RpcResponse

      if (responseJson.result.token_accounts.length === 0) {
        break
      }
      
      tokenAccounts.push(...responseJson.result.token_accounts)
      
      // sleep for half a second to avoid rate limiting
      // rate limit for Helius Free Tier DAS APIs is 2req/s, we have a better tier, but let's cover this one also
      await sleep(500)
      page += 1
    }
    console.log('Fetching token accounts done.')
    
    console.log('Storing token balances in the database...')
    const batches = splitIntoBatches(tokenAccounts, 25)
    for (const batch of batches) {
      const placeholders = []
      const values = []
      let index = 1
      for (const tokenAccount of batch) {
        placeholders.push(`($${index}, $${index + 1}, $${index + 2}, $${index + 3})`)
        
        const ownerAddress = tokenAccount.owner
        const tokenMintAddress = tokenAccount.mint
        const quotedAt = now.toISOString()
        const uiAmount = bigDecimal.divide(
          tokenAccount.amount,  // dividend
          Math.pow(10, BorgDecimals),  // divisor
          BorgDecimals,  // precision (default precision 8, we need more, e.g. 9 for Borg)
        )
        values.push(ownerAddress, tokenMintAddress, quotedAt, uiAmount)
        
        index += 4
      }
      const query = `
        REPLACE INTO token_balance (owner_address, token_mint_address, quoted_at, ui_amount)
        VALUES ${placeholders.join(', ')};
      `;

      await db.prepare(query).bind(...values).run()
    }
    console.log('Storing token balances in the database done.')
    
    return jsonResponse()
  } catch (e) {
    await reportError(db, e)
    return jsonResponse({ message: "Something went wrong..." }, 500)
  }
}

type RpcResponse = {
  id: string
  jsonrpc: string
  result: {
    total: number
    limit: number
    page: number
    token_accounts: TokenAccount[]
  }
}

type TokenAccount = {
  address: string
  mint: string
  owner: string
  amount: number
  delegated_amount: number
  frozen: boolean
}

function splitIntoBatches<T>(list: T[], batchSize: number): T[][] {
  const batches: T[][] = [];

  for (let i = 0; i < list.length; i += batchSize) {
    const batch = list.slice(i, i + batchSize);
    batches.push(batch);
  }

  return batches;
}

function sleep(delayMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}
