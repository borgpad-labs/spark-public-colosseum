import { jsonResponse, reportError } from "./cfPagesFunctionsUtils"

type ENV = {
  DB: D1Database
  TWITTER_CLIENT_ID: string
  TWITTER_CLIENT_SECRET: string
  VITE_ENVIRONMENT_TYPE?: string
}

type TwitterOAuthTokenRequest = {
  code: string
  redirect_uri: string
  code_verifier: string
}

type TwitterTokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
  scope: string
  token_type: string
}

type TwitterUserResponse = {
  data: {
    id: string
    username: string
    name: string
    profile_image_url?: string
  }
}

export const onRequestPost: PagesFunction<ENV> = async (ctx) => {
  try {
    console.log('🔐 Starting Twitter OAuth token exchange...')
    const requestBody = await ctx.request.json()
    console.log('📝 Request body received:', { 
      hasCode: !!requestBody.code, 
      hasRedirectUri: !!requestBody.redirect_uri, 
      hasCodeVerifier: !!requestBody.code_verifier,
      redirectUri: requestBody.redirect_uri 
    })
    
    const { code, redirect_uri, code_verifier }: TwitterOAuthTokenRequest = requestBody

    // Validate required fields
    if (!code || !redirect_uri || !code_verifier) {
      console.error('❌ Missing required fields:', { 
        code: !!code, 
        redirect_uri: !!redirect_uri, 
        code_verifier: !!code_verifier 
      })
      return jsonResponse({ 
        message: "Missing required fields",
        details: {
          code: !!code,
          redirect_uri: !!redirect_uri,
          code_verifier: !!code_verifier
        }
      }, 400)
    }

    // Validate environment variables
    if (!ctx.env.TWITTER_CLIENT_ID || !ctx.env.TWITTER_CLIENT_SECRET) {
      console.error('❌ Twitter OAuth environment variables not configured')
      return jsonResponse({ message: "Twitter OAuth not configured" }, 500)
    }

    console.log('✅ All validations passed, calling Twitter API...')

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${ctx.env.TWITTER_CLIENT_ID}:${ctx.env.TWITTER_CLIENT_SECRET}`)}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
        code_verifier: code_verifier
      })
    })

    console.log(`🐦 Twitter API response status: ${tokenResponse.status}`)

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('❌ Twitter token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        errorData
      })
      return jsonResponse({ 
        message: "Failed to exchange authorization code",
        twitterError: errorData,
        status: tokenResponse.status
      }, 400)
    }

    const tokenData: TwitterTokenResponse = await tokenResponse.json()
    console.log('✅ Successfully got Twitter tokens')

    // Get user information using the access token
    console.log('👤 Fetching user information from Twitter...')
    const userResponse = await fetch('https://api.twitter.com/2/users/me?user.fields=profile_image_url', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    })

    console.log(`👤 Twitter user API response status: ${userResponse.status}`)

    if (!userResponse.ok) {
      const userErrorData = await userResponse.text()
      console.error('❌ Failed to get user information:', {
        status: userResponse.status,
        statusText: userResponse.statusText,
        errorData: userErrorData
      })
      return jsonResponse({ 
        message: "Failed to get user information",
        twitterError: userErrorData,
        status: userResponse.status
      }, 400)
    }

    const userData: TwitterUserResponse = await userResponse.json()
    console.log('✅ Successfully got user data:', {
      id: userData.data.id,
      username: userData.data.username,
      name: userData.data.name
    })

    // Store user data in database, preserving existing fees_claimed
    console.log('💾 Saving user data to database...')
    try {
      const dbResult = await ctx.env.DB
        .prepare(`
          INSERT INTO twitter_users (twitter_id, username, name, profile_image_url, access_token, refresh_token, expires_at, fees_claimed, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          ON CONFLICT(twitter_id) 
          DO UPDATE SET 
            username = excluded.username,
            name = excluded.name,
            profile_image_url = excluded.profile_image_url,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            expires_at = excluded.expires_at,
            updated_at = CURRENT_TIMESTAMP
        `)
        .bind(
          userData.data.id,
          userData.data.username,
          userData.data.name,
          userData.data.profile_image_url || null,
          tokenData.access_token,
          tokenData.refresh_token,
          new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        )
        .run()
      
      console.log('✅ Successfully saved user to database:', dbResult)
    } catch (dbError) {
      console.error('❌ Database save failed:', dbError)
      return jsonResponse({ 
        message: "Failed to save user data to database",
        error: dbError instanceof Error ? dbError.message : 'Database error'
      }, 500)
    }

    return jsonResponse({
      success: true,
      user: {
        id: userData.data.id,
        username: userData.data.username,
        name: userData.data.name,
        profile_image_url: userData.data.profile_image_url
      }
    }, 200)

  } catch (e) {
    await reportError(ctx.env.DB, e)
    return jsonResponse({ message: "Something went wrong..." }, 500)
  }
}

export const onRequestOptions: PagesFunction<ENV> = async (ctx) => {
  try {
    if (ctx.env.VITE_ENVIRONMENT_TYPE !== "develop") return
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': 'http://localhost:5173',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })
  } catch (error) {
    return jsonResponse({ message: error }, 500)
  }
} 