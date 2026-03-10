
export default {
    async scheduled(event, env, ctx) {
      try {
        const { ADMIN_API_KEY, REFRESH_EXCHANGE_DATA_API } = env
  
        if (!ADMIN_API_KEY || !REFRESH_EXCHANGE_DATA_API) throw new Error('Misconfigured env!')
  
        console.log(`Refetching exchange data. (${new Date().toISOString()})`)
        
        const response = await fetch(REFRESH_EXCHANGE_DATA_API, {
          method: 'POST',
          headers: { 'Authorization': ADMIN_API_KEY },
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }
        
        console.log(`Refetching exchange data successful. Date=(${new Date().toISOString()}). Status=${JSON.stringify(await response.text())}`)
      } catch (e) {
        console.error('Something went wrong...')
        console.error(e)
        console.error(e.message)
        // rethrow error so that invocation is reported as errored
        throw e
      }
    },
  }
  
  