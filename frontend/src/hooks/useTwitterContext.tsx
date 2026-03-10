import { createContext, ReactNode, useContext, useEffect } from "react"
import { useSearchParams } from "react-router-dom"

/**
 * Find available scopes here: https://developer.x.com/en/docs/authentication/oauth-2-0/authorization-code
 * Available ones we might need: 'tweet.read', 'users.read', 'follows.read', 'offline.access'
 * These two ('tweet.read', 'users.read') are needed to fetch authenticated user's data https://developer.x.com/en/docs/authentication/guides/v2-authentication-mapping
 */
const TWITTER_AUTH_SCOPE = ["tweet.read", "users.read", "follows.read"].join(
  " ",
)
const TWITTER_OAUTH_BASE_URL = "https://twitter.com/i/oauth2/authorize"
const TWITTER_API_OAUTH2_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
const TWITTER_API_GET_ME_URL =
  "https://api.twitter.com/2/users/me?user.fields=profile_image_url"
/**
 * Because Twitter API doesn't support CORS, we're forced to go through a proxy.
 * CORS Proxy is currently realized through a CloudFlare Worker, deployed on the same url as the CF Page.
 * Twitter CORS issues: https://devcommunity.x.com/t/twitter-api-v2-public-client-no-access-control-allow-origin-header-present-cors/170402/3
 */
const CORS_PROXY_URL = window.location.origin + "/api/corsproxy"

const CLIENT_ID = import.meta.env.VITE_TWITTER_CLIENT_ID
const REDIRECT_URI = window.location.origin + "/api/twittercallback"

//////////////////////////////////
///////// Context Code ///////////
//////////////////////////////////

type Context = unknown

const TwitterContext = createContext<Context | undefined>(undefined)

export function useTwitterContext() {
  const context = useContext(TwitterContext)
  if (!context)
    throw new Error("Component is outside of the <TwitterProvider />")
  return context
}

export function TwitterProvider({ children }: { children: ReactNode }) {
  const [searchParams, setSearchParams] = useSearchParams()

  async function signInWithCode() {
    const state = searchParams.get("state")
    const code = searchParams.get("code")

    if (state !== "state" || !code) return

    const twitterAuthUrl = new URL(TWITTER_API_OAUTH2_TOKEN_URL)
    twitterAuthUrl.searchParams.set("code", code)
    twitterAuthUrl.searchParams.set("grant_type", "authorization_code")
    twitterAuthUrl.searchParams.set("client_id", CLIENT_ID)
    twitterAuthUrl.searchParams.set("redirect_uri", REDIRECT_URI)
    twitterAuthUrl.searchParams.set("code_verifier", "challenge")

    const proxiedTwitterAuthUrl = new URL(CORS_PROXY_URL)
    proxiedTwitterAuthUrl.searchParams.set("url", twitterAuthUrl.href)

    const authRes = await fetch(proxiedTwitterAuthUrl, {
      method: "post",
    })
    const authResponse = await authRes.json()

    const accessToken = authResponse["access_token"]
    const refreshToken = authResponse["refresh_token"]

    localStorage.setItem("twitterAccessToken", accessToken)
    localStorage.setItem("twitterRefreshToken", refreshToken)

    const proxiedTwitterGetMeUrl = new URL(CORS_PROXY_URL)
    proxiedTwitterGetMeUrl.searchParams.set("url", TWITTER_API_GET_ME_URL)

    const getMeRes = await fetch(proxiedTwitterGetMeUrl, {
      method: "get",
      headers: {
        Authorization: "Bearer " + accessToken,
      },
    })
    const getMeResponse = await getMeRes.json()

    // eslint-disable-next-line
    console.log({ getMeResponse })

    setSearchParams((searchParams) => {
      searchParams.delete("state")
      searchParams.delete("code")
      return searchParams
    })
  }

  useEffect(() => {
    signInWithCode()
    // eslint-disable-next-line
  }, [searchParams, setSearchParams])

  return (
    <TwitterContext.Provider value={{}}>{children}</TwitterContext.Provider>
  )
}

export function getSignInWithTwitterUrl(): string {
  const url = new URL(TWITTER_OAUTH_BASE_URL)

  const address = localStorage.getItem("address")

  const redirectUri = REDIRECT_URI + "?address=" + address

  url.searchParams.set("client_id", CLIENT_ID)
  url.searchParams.set("redirect_uri", redirectUri)
  url.searchParams.set("scope", TWITTER_AUTH_SCOPE)

  url.searchParams.set("response_type", "code")
  url.searchParams.set("state", "state")
  url.searchParams.set("code_challenge", "challenge")
  url.searchParams.set("code_challenge_method", "plain")

  return url.href
}
