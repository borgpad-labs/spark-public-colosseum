export default {
  async scheduled(event, env, ctx) {
    try {
      const { ADMIN_API_KEY, CLAIM_ALL_FEES_API } = env

      if (!ADMIN_API_KEY || !CLAIM_ALL_FEES_API) throw new Error('Misconfigured env!')

      console.log(`Claiming fees from all pools. (${new Date().toISOString()})`)
      
      const response = await fetch(CLAIM_ALL_FEES_API, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${ADMIN_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          network: 'mainnet' // Optional, defaults to mainnet
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API request failed: ${response.status} - ${errorText}`)
      }
      
      const result = await response.json()
      console.log(`Fee claim process completed. Date=(${new Date().toISOString()}). Result=${JSON.stringify(result)}`)
    } catch (e) {
      console.error('Something went wrong...')
      console.error(e)
      console.error(e.message)
      // rethrow error so that invocation is reported as errored
      throw e
    }
  },
} 