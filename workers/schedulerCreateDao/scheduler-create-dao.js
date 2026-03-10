
export default {
    async scheduled(event, env, ctx) {
      try {
        const { ADMIN_API_KEY, CREATE_DAO_API } = env
  
        if (!ADMIN_API_KEY || !CREATE_DAO_API) throw new Error('Misconfigured env!')
  
        console.log(`Creating DAO. (${new Date().toISOString()})`)
        
        const response = await fetch(CREATE_DAO_API, {
          method: 'POST',
          headers: { 'Authorization': ADMIN_API_KEY },
        })

        if (!response.ok) {
          throw new Error(await response.text())
        }
        
        console.log(`Creating DAO successful. Date=(${new Date().toISOString()}). Status=${JSON.stringify(await response.text())}`)
      } catch (e) {
        console.error('Something went wrong...')
        console.error(e)
        console.error(e.message)
        // rethrow error so that invocation is reported as errored
        throw e
      }
    },
  }
  
  