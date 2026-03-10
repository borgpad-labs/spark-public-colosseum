
export default {
    async scheduled(event, env, ctx) {
      try {
        const { ADMIN_API_KEY, REFRESH_TWITTER_STATS_URL } = env
  
        if (!ADMIN_API_KEY || !REFRESH_TWITTER_STATS_URL) throw new Error('Misconfigured env!')
  
        console.log(`Refetching twitter stats. (${new Date().toISOString()})`)
        
        const response = await fetch(REFRESH_TWITTER_STATS_URL, {
          method: "GET",
          headers: { Authorization: ADMIN_API_KEY },
        });

        if (!response.ok) {
          throw new Error(await response.text())
        }
        
        console.log(`Refetching twitter status successful. Date=(${new Date().toISOString()}). Status=${JSON.stringify(await response.text())}`)
      } catch (e) {
        console.error('Something went wrong...')
        console.error(e)
        console.error(e.message)
        // rethrow error so that invocation is reported as errored
        throw e
      }
    },
  }
  
  