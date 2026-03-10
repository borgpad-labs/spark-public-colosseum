export type GitHubUser = {
  id: string
  username: string
  name: string
  email: string
  avatar_url: string
}

export type GitHubAuthData = {
  accessToken: string
  user: GitHubUser
}

type GitHubEmail = {
  email: string
  primary: boolean
  verified: boolean
  visibility: string | null
}

const REDIRECT_URI = `${window.location.origin}/apply`

export class GitHubAuth {
  private static STORAGE_KEY = 'github_auth_data'

  // Get OAuth URL from backend
  static async getAuthUrl(): Promise<string> {
    const state = Math.random().toString(36).substring(2, 15)
    localStorage.setItem('github_oauth_state', state)
    
    const response = await fetch('/api/github-oauth-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        redirect_uri: REDIRECT_URI,
        state: state,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to get GitHub OAuth URL')
    }

    const data = await response.json()
    return data.authUrl
  }

  // Handle OAuth callback
  static async handleCallback(code: string, state: string): Promise<GitHubAuthData> {
    // Verify state parameter
    const storedState = localStorage.getItem('github_oauth_state')
    if (state !== storedState) {
      throw new Error('Invalid state parameter')
    }
    localStorage.removeItem('github_oauth_state')

    console.log('Exchanging GitHub OAuth code for token...')

    // Exchange code for access token via our backend API
    const tokenResponse = await fetch('/api/github-oauth-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code: code,
        redirect_uri: REDIRECT_URI,
      }),
    })

    console.log('Token exchange response status:', tokenResponse.status)

    if (!tokenResponse.ok) {
      let errorData: Record<string, unknown> = {}
      let errorText = ''
      
      try {
        // Try to parse as JSON first
        const responseText = await tokenResponse.text()
        errorText = responseText
        console.log('Raw error response:', responseText)
        
        try {
          errorData = JSON.parse(responseText)
        } catch (parseError) {
          console.log('Response is not JSON, treating as text')
          errorData = { message: responseText }
        }
      } catch (readError) {
        console.error('Failed to read error response:', readError)
        errorData = { message: 'Failed to read response' }
      }
      
      console.error('Token exchange failed:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        headers: Object.fromEntries(tokenResponse.headers.entries()),
        errorData,
        errorText: errorText.substring(0, 200)
      })
      
      if (tokenResponse.status === 500) {
        throw new Error('Server configuration error. Please check if GitHub OAuth environment variables are set.')
      }
      
      throw new Error(String(errorData.message) || errorText || 'Failed to exchange code for token')
    }

    const tokenData = await tokenResponse.json()
    console.log('Token exchange successful')
    
    if (tokenData.error) {
      throw new Error(tokenData.error_description || 'OAuth error')
    }
    
    const accessToken = tokenData.access_token

    console.log('Fetching GitHub user info...')

    // Get user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    })

    if (!userResponse.ok) {
      console.error('Failed to get GitHub user info:', userResponse.status)
      throw new Error('Failed to get user info')
    }

    const userInfo = await userResponse.json()

    // Get user email
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    })

    let primaryEmail = userInfo.email
    if (emailResponse.ok) {
      const emails: GitHubEmail[] = await emailResponse.json()
      const primary = emails.find((email: GitHubEmail) => email.primary)
      if (primary) {
        primaryEmail = primary.email
      }
    }

    const user: GitHubUser = {
      id: userInfo.id.toString(),
      username: userInfo.login,
      name: userInfo.name || userInfo.login,
      email: primaryEmail,
      avatar_url: userInfo.avatar_url,
    }

    const authData: GitHubAuthData = {
      accessToken,
      user,
    }

    // Store in localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData))

    console.log('GitHub OAuth completed successfully for user:', user.username)
    return authData
  }

  // Get stored auth data
  static getStoredAuth(): GitHubAuthData | null {
    const stored = localStorage.getItem(this.STORAGE_KEY)
    if (!stored) return null
    
    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  // Clear stored auth data
  static clearAuth(): void {
    localStorage.removeItem(this.STORAGE_KEY)
    localStorage.removeItem('github_oauth_state')
  }

  // Initiate OAuth flow
  static async login(): Promise<void> {
    try {
      const authUrl = await this.getAuthUrl()
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to initiate GitHub OAuth:', error)
      throw error
    }
  }
} 