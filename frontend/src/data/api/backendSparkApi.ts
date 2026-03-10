import {
  CreateUsernameRequestSchema, // Make sure this schema is correctly imported
  GetTokensResponse,
  TokenModel,
  DaoModel,
  GetUserTokensResponse,
  GetTokenMarketResponse,
  GetTokenBalanceResponse,
  GetGovernanceDataResponse,
  AdminAuthFields
} from "../../../shared/models.ts"
import { GitHubScoreData } from "../../../shared/services/githubScore"
import { deduplicateRequest, createRequestKey } from "../../utils/requestDeduplication"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api`

const POST_CREATE_USER = API_BASE_URL + "/user"
const GET_USER = API_BASE_URL + "/user"
const GET_TOKENS = API_BASE_URL + "/gettokens"
const GET_TOKEN = API_BASE_URL + "/gettoken"
const CREATE_DAO = API_BASE_URL + "/createdao"
const GET_DAO = API_BASE_URL + "/getdao"
const GET_USER_TOKENS = API_BASE_URL + "/getusertokens"
const GET_TOKEN_MARKET = API_BASE_URL + "/gettokenmarket"
const GET_TOKEN_BALANCE = API_BASE_URL + "/gettokenbalance"
const GET_SOL_BALANCE = API_BASE_URL + "/getsolbalance"
const SEND_TRANSACTION = API_BASE_URL + "/sendtransaction"
const GET_BLOCKHASH = API_BASE_URL + "/getblockhash"
const GET_ACCOUNT_INFO = API_BASE_URL + "/getaccountinfo"
const GET_GOVERNANCE_DATA = API_BASE_URL + "/getgovernancedata"
const GET_APPLICATIONS = API_BASE_URL + "/applications"
const GITHUB_SCORE = API_BASE_URL + "/github-score"
const IS_ADMIN_URL = API_BASE_URL + "/admin/isadmin"
const GET_TOKEN_VOLUME = API_BASE_URL + "/gettokenvolume"
const GET_CREATORS = API_BASE_URL + "/getcreators"
const TWITTER_OAUTH_URL = API_BASE_URL + "/twitter-oauth-url"
const TWITTER_OAUTH_TOKEN = API_BASE_URL + "/twitter-oauth-token"
const GET_LEADERBOARD = API_BASE_URL + "/getleaderboard"
const REWARD_CREATOR = API_BASE_URL + "/reward_creator"
const GET_TOTAL_FEES = API_BASE_URL + "/get_total_fees"
const GET_TOKEN_BALANCE_NEW = API_BASE_URL + "/gettokenbalance"
const SIMULATE_TRANSACTION = API_BASE_URL + "/simulatetransaction"
const GOVERNANCE_TRANSACTION = API_BASE_URL + "/governancetransaction"
const VOTE_TRANSACTION = API_BASE_URL + "/votetransaction"
const IDEAS_URL = API_BASE_URL + "/ideas"
const IDEA_COMMENTS_URL = API_BASE_URL + "/idea-comments"
const AGENT_PROJECTS_URL = API_BASE_URL + "/agent-projects"
const AGENT_PROJECT_COMMENTS_URL = API_BASE_URL + "/agent-project-comments"
const AGENT_PROJECT_INVESTMENTS_URL = API_BASE_URL + "/agent-project-investments"


type PostCreateUserStatusArgs = {
  address: string 
  // email: string
  username: string
}

const isAdmin = async (auth: AdminAuthFields): Promise<void> => {
  const url = new URL(IS_ADMIN_URL, window.location.href)

  const response = await fetch(url, {
    method: "POST",
    body: JSON.stringify(auth),
    headers: {
      "Content-Type": "application/json",
    },
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.message)
  return json
}

const postCreateUserStatus = async ({ address, username }: PostCreateUserStatusArgs): Promise<boolean> => {
  // Create complete URL for the request
  const url = new URL(POST_CREATE_USER)
  
  const body = JSON.stringify({
    publicKey: address, // Make sure this matches the expected schema on the server
    // email,
    username,
  })

  const response = await fetch(url, {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
    },
    // Use 'same-origin' instead of 'include' if not crossing domains
    credentials: "same-origin"
  })
  
  if (!response.ok) {
    const json = await response.json().catch(() => ({ message: "Unknown error" }))
    throw new Error(json.message || "Request failed")
  }
  
  const json = await response.json()
  return json
}

type GetUserArgs = {
  address: string
}

type UserModelJson = {
  address: string
  username: string
}

const getUser = async ({ address }: GetUserArgs): Promise<UserModelJson> => {
  const url = new URL(GET_USER)
  url.searchParams.set("address", address)
  const response = await fetch(url)
  const json = await response.json()
  return json
}

type GetTokensArgs = {
  isGraduated: string
  orderBy?: string
  orderDirection?: string
}

const getTokens = async ({ isGraduated, orderBy, orderDirection }: GetTokensArgs): Promise<GetTokensResponse> => {
  const url = new URL(GET_TOKENS)
  url.searchParams.set("isGraduated", isGraduated)
  if (orderBy) {
    url.searchParams.set("orderBy", orderBy)
  }
  if (orderDirection) {
    url.searchParams.set("orderDirection", orderDirection)
  }
  const response = await fetch(url)
  const json = await response.json()
  return json
}

type GetTokenArgs = {
  mint: string
}

type GetTokenResponse = {
  token: TokenModel
}

const getToken = async ({ mint }: GetTokenArgs): Promise<GetTokenResponse> => {
  const url = new URL(GET_TOKEN)
  url.searchParams.set("mint", mint)
  console.log(url)
  const response = await fetch(url)
  const json = await response.json()
  return json
}

type CreateDaoArgs = {
  name: string
  communityTokenMint: string
  minCommunityWeightToCreateGovernance?: number
  communityTokenType?: "liquid" | "membership" | "dormant"
  councilTokenType?: "liquid" | "membership" | "dormant"
  councilTokenMint?: string
  communityMintMaxVoterWeightSourceType?: "absolute" | "supplyFraction"
  communityMintMaxVoterWeightSourceValue?: number
  communityApprovalThreshold?: number
  councilApprovalThreshold?: number
  minCouncilWeightToCreateProposal?: number
  minTransactionHoldUpTime?: number
  votingBaseTime?: number
  votingCoolOffTime?: number
  depositExemptProposalCount?: number
  communityVoteTipping?: "disabled" | "early" | "strict"
  councilVoteTipping?: "disabled" | "early" | "strict"
  communityVetoVoteThreshold?: "disabled" | "enabled"
  councilVetoVoteThreshold?: "disabled" | "enabled"
}

type CreateDaoResponse = {
  success: boolean
  txSignature2?: string
  realmAddress?: string
  governanceAddress?: string
  treasuryAddress?: string
  message?: string
  transaction?: string
  realmName?: string
}

const createDao = async (args: CreateDaoArgs): Promise<CreateDaoResponse> => {
  const url = new URL(CREATE_DAO)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(args),
  })
  
  if (!response.ok) {
    const json = await response.json().catch(() => ({ message: "Unknown error" }))
    throw new Error(json.message || "DAO creation failed")
  }
  
  const json = await response.json()
  return json
}

type GetDaoArgs = {
  address: string
}

type GetDaoResponse = {
  dao: DaoModel
}

const getDao = async ({ address }: GetDaoArgs): Promise<GetDaoResponse> => {
  const url = new URL(GET_DAO)
  url.searchParams.set("address", address)
  const response = await fetch(url)
  const json = await response.json()
  return json
}

type GetUserTokensArgs = {
  address: string
}

const getUserTokens = async ({ address }: GetUserTokensArgs): Promise<GetUserTokensResponse> => {
  const url = new URL(GET_USER_TOKENS)
  url.searchParams.set("address", address)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch user tokens: ${response.statusText}`)
  }
  const json = await response.json()
  return json
}

type GetTokenMarketArgs = {
  address: string
}

const getTokenMarket = async ({ address }: GetTokenMarketArgs): Promise<GetTokenMarketResponse> => {
  const url = new URL(GET_TOKEN_MARKET)
  url.searchParams.set("address", address)
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch token market data: ${response.statusText}`)
  }
  const json = await response.json()
  return json
}

type GetTokenBalanceArgs = {
  userAddress: string
  tokenMint: string
  cluster?: string
}

type GetSolBalanceArgs = {
  userAddress: string
  cluster?: string
}

type GetSolBalanceResponse = {
  success: boolean
  balance: number
  userAddress: string
  cluster: string
}

type SendTransactionArgs = {
  signedTransaction: string
  commitment?: string
}

type SendTransactionResponse = {
  success: boolean
  signature?: string
  error?: string
}

type GetBlockhashResponse = {
  success: boolean
  blockhash?: string
  lastValidBlockHeight?: number
  error?: string
}

type GetAccountInfoArgs = {
  address: string
}

type GetAccountInfoResponse = {
  success: boolean
  exists?: boolean
  data?: any
  error?: string
}

// Jupiter/RPC API types
type GetTokenBalanceNewArgs = {
  userAddress: string
  tokenMint: string
  cluster?: string
}

type GetTokenBalanceNewResponse = {
  success: boolean
  balance?: number
  error?: string
}

type SimulateTransactionArgs = {
  transaction: string // Base64 encoded transaction
  cluster?: string
}

type SimulateTransactionResponse = {
  success: boolean
  valid?: boolean
  error?: string
  logs?: string[]
}

type GovernanceTransactionArgs = {
  action: 'deposit' | 'withdraw'
  userAddress: string
  realmAddress: string
  tokenMint: string
  amount?: string
  cluster?: string
}

type GovernanceTransactionResponse = {
  success: boolean
  transaction?: string
  error?: string
}

type VoteTransactionArgs = {
  action: 'cast' | 'relinquish' | 'check'
  userAddress: string
  realmAddress: string
  proposalAddress: string
  tokenMint: string
  voteChoice?: 'yes' | 'no'
  cluster?: string
}

type VoteTransactionResponse = {
  success: boolean
  transaction?: string
  hasVoted?: boolean
  vote?: 'yes' | 'no' | null
  error?: string
}

const getTokenBalance = async ({ userAddress, tokenMint, cluster = "mainnet" }: GetTokenBalanceArgs): Promise<GetTokenBalanceResponse> => {
  const requestKey = createRequestKey("getTokenBalance", { userAddress, tokenMint, cluster })
  
  return deduplicateRequest(requestKey, async () => {
    const url = new URL(GET_TOKEN_BALANCE)
    url.searchParams.set("userAddress", userAddress)
    url.searchParams.set("tokenMint", tokenMint)
    url.searchParams.set("cluster", cluster)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch token balance: ${response.statusText}`)
    }
    const json = await response.json()
    return json
  })
}

const getSolBalance = async ({ userAddress, cluster = "mainnet" }: GetSolBalanceArgs): Promise<GetSolBalanceResponse> => {
  const requestKey = createRequestKey("getSolBalance", { userAddress, cluster })
  
  return deduplicateRequest(requestKey, async () => {
    const url = new URL(GET_SOL_BALANCE)
    url.searchParams.set("userAddress", userAddress)
    url.searchParams.set("cluster", cluster)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch SOL balance: ${response.statusText}`)
    }
    const json = await response.json()
    return json
  })
}

const sendTransaction = async ({ signedTransaction, commitment = "confirmed" }: SendTransactionArgs): Promise<SendTransactionResponse> => {
  const requestKey = createRequestKey("sendTransaction", { signedTransaction: signedTransaction.slice(0, 16), commitment })
  
  return deduplicateRequest(requestKey, async () => {
    const response = await fetch(SEND_TRANSACTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signedTransaction,
        commitment
      })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to send transaction: ${response.statusText}`)
    }
    const json = await response.json()
    return json
  })
}

const getBlockhash = async (): Promise<GetBlockhashResponse> => {
  const requestKey = createRequestKey("getBlockhash", {})
  
  return deduplicateRequest(requestKey, async () => {
    const response = await fetch(GET_BLOCKHASH)
    
    if (!response.ok) {
      throw new Error(`Failed to get blockhash: ${response.statusText}`)
    }
    const json = await response.json()
    return json
  })
}

const getAccountInfo = async ({ address }: GetAccountInfoArgs): Promise<GetAccountInfoResponse> => {
  const requestKey = createRequestKey("getAccountInfo", { address })
  
  return deduplicateRequest(requestKey, async () => {
    const response = await fetch(GET_ACCOUNT_INFO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address })
    })
    
    if (!response.ok) {
      throw new Error(`Failed to get account info: ${response.statusText}`)
    }
    const json = await response.json()
    return json
  })
}

type GetGovernanceDataArgs = {
  userAddress: string
  realmAddress: string
  tokenMint: string
  cluster?: string
}

const getGovernanceData = async ({ userAddress, realmAddress, tokenMint, cluster = "mainnet" }: GetGovernanceDataArgs): Promise<GetGovernanceDataResponse> => {
  const requestKey = createRequestKey("getGovernanceData", { userAddress, realmAddress, tokenMint, cluster })
  
  return deduplicateRequest(requestKey, async () => {
    const url = new URL(GET_GOVERNANCE_DATA)
    url.searchParams.set("userAddress", userAddress)
    url.searchParams.set("realmAddress", realmAddress)
    url.searchParams.set("tokenMint", tokenMint)
    url.searchParams.set("cluster", cluster)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch governance data: ${response.statusText}`)
    }
    const json = await response.json()
    return json
  })
}

// Applications API Types
export type ApplicationResponse = {
  id: string
  projectId: string
  githubUsername: string
  githubId: string
  deliverableName: string
  requestedPrice: number
  estimatedDeadline: string
  featureDescription: string
  solanaWalletAddress: string
  status: string
  githubScore?: number
  createdAt: string
  updatedAt: string
}

export type GetApplicationsResponse = {
  applications: ApplicationResponse[]
}

export type SubmitApplicationRequest = {
  projectId: string
  githubUsername: string
  githubId: string
  deliverableName: string
  requestedPrice: number
  estimatedDeadline: string
  featureDescription: string
  solanaWalletAddress: string
  githubAccessToken?: string
}

// Applications API Functions
type GetApplicationsByProjectIdArgs = {
  projectId: string
}

const getApplicationsByProjectId = async ({ projectId }: GetApplicationsByProjectIdArgs): Promise<GetApplicationsResponse> => {
  const url = new URL(GET_APPLICATIONS)
  url.searchParams.set("projectId", projectId)
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch applications")
  }
  
  const json = await response.json()
  return json
}

type GetAllApplicationsArgs = {
  sortBy?: string
  sortDirection?: string
}

const getAllApplications = async ({ sortBy, sortDirection }: GetAllApplicationsArgs = {}): Promise<GetApplicationsResponse> => {
  const url = new URL(GET_APPLICATIONS)
  
  if (sortBy) {
    url.searchParams.set("sortBy", sortBy)
  }
  if (sortDirection) {
    url.searchParams.set("sortDirection", sortDirection)
  }
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch applications")
  }
  
  const json = await response.json()
  return json
}

const submitApplication = async (applicationData: SubmitApplicationRequest): Promise<{ success: boolean; applicationId: string; githubScore?: number; message: string }> => {
  const url = new URL(GET_APPLICATIONS)
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(applicationData),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to submit application")
  }
  
  const json = await response.json()
  return json
}

// GitHub Score API Types
export type GenerateGitHubScoreRequest = {
  githubUsername: string
  githubAccessToken: string
  applicationId?: string
}

export type GenerateGitHubScoreResponse = {
  success: boolean
  githubScore?: number
  message: string
}

export type GetApplicationWithGitHubScoreResponse = {
  success: boolean
  application: ApplicationResponse
}

// GitHub Score API Functions
const generateGitHubScore = async (request: GenerateGitHubScoreRequest): Promise<GenerateGitHubScoreResponse> => {
  const url = new URL(GITHUB_SCORE)
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to generate GitHub score")
  }
  
  const json = await response.json()
  return json
}

const getApplicationWithGitHubScore = async (applicationId: string): Promise<GetApplicationWithGitHubScoreResponse> => {
  const url = new URL(GITHUB_SCORE)
  url.searchParams.set("applicationId", applicationId)
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch application with GitHub score")
  }
  
  const json = await response.json()
  return json
}

// Test GitHub API connectivity
const testGitHubApi = async (githubAccessToken: string): Promise<{ success: boolean; message: string; user?: { username: string; id: number; publicRepos: number } }> => {
  const url = new URL(`${API_BASE_URL}/test-github`)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ githubAccessToken }),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to test GitHub API")
  }
  
  const json = await response.json()
  return json
}

const testGitHubPermissions = async (githubAccessToken: string): Promise<{ success: boolean; message: string; results: Record<string, unknown> }> => {
  const url = new URL(`${API_BASE_URL}/test-github-permissions`)
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ githubAccessToken }),
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to test GitHub permissions")
  }
  
  const json = await response.json()
  return json
}

export type DaoResponse = {
  id: string
  name: string
  imageUrl: string | null
  dao: string
  tokenMint: string
}

export type GetDaosResponse = {
  daos: DaoResponse[]
}

const getDaos = async (): Promise<GetDaosResponse> => {
  const url = new URL(`${API_BASE_URL}/daos`, window.location.href)
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch DAOs")
  }
  
  const json = await response.json()
  return json
}

// Volume API Types
export type VolumeDataPoint = {
  timestamp: number
  volume: number
  price: number
  trades: number
}

export type Transaction = {
  id: string
  timestamp: number
  type: 'buy' | 'sell'
  amount: number
  price: number
  volume: number
  wallet: string
}

export type GetTokenVolumeResponse = {
  success: boolean
  tokenAddress: string
  timeFrame: string
  volumeData: VolumeDataPoint[]
  totalVolume: number
  totalTrades: number
  averageVolume: number
  recentTransactions: Transaction[]
}

// Volume API Functions
type GetTokenVolumeArgs = {
  address: string
  timeFrame?: string
}

const getTokenVolume = async ({ address, timeFrame = "24h" }: GetTokenVolumeArgs): Promise<GetTokenVolumeResponse> => {
  const url = new URL(GET_TOKEN_VOLUME)
  url.searchParams.set("address", address)
  url.searchParams.set("timeFrame", timeFrame)
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch token volume data")
  }
  
  const json = await response.json()
  return json
}

// Creators API Types
export type Creator = {
  twitterAccount: string;
  hasToken: boolean;
  tokenMint?: string;
  tokenName?: string;
  hasDao: boolean;
  daoAddress?: string;
  feesClaimed: number;
  feesClaimedRaw: number | string;
}

export type GetCreatorsResponse = {
  creators: Creator[]
}

const getCreators = async (): Promise<GetCreatorsResponse> => {
  const url = new URL(GET_CREATORS, window.location.href)
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch creators")
  }
  
  const json = await response.json()
  return json
}

// Twitter OAuth API Types
export type TwitterOAuthUrlRequest = {
  redirect_uri: string
  state: string
  code_challenge: string
  code_challenge_method: string
}

export type TwitterOAuthUrlResponse = {
  authUrl: string
}

export type TwitterOAuthTokenRequest = {
  code: string
  redirect_uri: string
  code_verifier: string
}

export type TwitterUser = {
  id: string
  username: string
  name: string
  profile_image_url?: string
}

export type TwitterOAuthTokenResponse = {
  success: boolean
  user: TwitterUser
}

const getTwitterOAuthUrl = async (request: TwitterOAuthUrlRequest): Promise<TwitterOAuthUrlResponse> => {
  const url = new URL(TWITTER_OAUTH_URL, window.location.href)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })
  
  if (!response.ok) {
    throw new Error("Failed to get Twitter OAuth URL")
  }
  
  const json = await response.json()
  return json
}

const exchangeTwitterOAuthToken = async (request: TwitterOAuthTokenRequest): Promise<TwitterOAuthTokenResponse> => {
  const url = new URL(TWITTER_OAUTH_TOKEN, window.location.href)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })
  
  if (!response.ok) {
    throw new Error("Failed to exchange Twitter OAuth token")
  }
  
  const json = await response.json()
  return json
}

// Leaderboard API Types
export type LeaderboardEntry = {
  username: string
  feesGenerated: number
  feesGeneratedSOL?: number
  rank: number
  tokenCount: number
}

export type GetLeaderboardResponse = {
  leaderboard: LeaderboardEntry[]
}

const getLeaderboard = async (): Promise<GetLeaderboardResponse> => {
  const url = new URL(GET_LEADERBOARD, window.location.href)
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch leaderboard")
  }
  
  const json = await response.json()
  return json
}

// Reward Creator API Types
export type RewardCreatorRequest = {
  walletAddress: string
  twitterAccount: string
}

export type RewardCreatorResponse = {
  success: boolean
  message: string
  transactionSignature?: string
  totalFeesEarned?: number
  totalFeesClaimed?: number
  unclaimedFees?: number
  grossRewardAmount?: number
  rewardAmount?: number
  rewardAmountLamports?: number
  transactionFee?: number
  recipientWallet?: string
  tokenBreakdown?: Array<{
    tokenName: string
    tokenMint: string
    feesEarned: number
  }>
  newTotalClaimed?: number
  error?: string
  errorName?: string
  timestamp?: string
}

// Get Total Fees API Types
export type GetTotalFeesRequest = {
  twitterAccount: string
}

export type GetTotalFeesResponse = {
  success: boolean
  totalFeesEarned: number
  totalFeesClaimed: number
  availableToClaim: number
  tokenBreakdown: Array<{
    tokenName: string
    tokenMint: string
    feesEarned: number
    userFeesClaimed: number
  }>
  error?: string
  errorName?: string
  timestamp?: string
}

const rewardCreator = async (request: RewardCreatorRequest): Promise<RewardCreatorResponse> => {
  const url = new URL(REWARD_CREATOR, window.location.href)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })
  
  const json = await response.json()
  
  if (!response.ok) {
    throw new Error(json.message || "Failed to send creator reward")
  }
  
  return json
}

const getTotalFees = async (request: GetTotalFeesRequest): Promise<GetTotalFeesResponse> => {
  const url = new URL(GET_TOTAL_FEES, window.location.href)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })
  
  const json = await response.json()
  
  if (!response.ok) {
    throw new Error(json.message || "Failed to get total fees")
  }
  
  return json
}

// New Jupiter/RPC API functions
const getTokenBalanceNew = async (args: GetTokenBalanceNewArgs): Promise<GetTokenBalanceNewResponse> => {
  const response = await fetch(GET_TOKEN_BALANCE_NEW, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  })
  
  const json = await response.json()
  
  if (!response.ok) {
    throw new Error(json.message || "Failed to get token balance")
  }
  
  return json
}

const simulateTransaction = async (args: SimulateTransactionArgs): Promise<SimulateTransactionResponse> => {
  const response = await fetch(SIMULATE_TRANSACTION, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  })
  
  let json
  try {
    json = await response.json()
  } catch (error) {
    throw new Error(`Failed to parse response: ${response.status} ${response.statusText}`)
  }
  
  if (!response.ok) {
    throw new Error(json?.message || json?.error || `Failed to simulate transaction: ${response.status} ${response.statusText}`)
  }
  
  return json
}

const governanceTransaction = async (args: GovernanceTransactionArgs): Promise<GovernanceTransactionResponse> => {
  const response = await fetch(GOVERNANCE_TRANSACTION, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  })
  
  const json = await response.json()
  
  if (!response.ok) {
    throw new Error(json.message || "Failed to create governance transaction")
  }
  
  return json
}

const voteTransaction = async (args: VoteTransactionArgs): Promise<VoteTransactionResponse> => {
  const response = await fetch(VOTE_TRANSACTION, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args)
  })
  
  const json = await response.json()
  
  if (!response.ok) {
    throw new Error(json.message || "Failed to process vote transaction")
  }
  
  return json
}

// Ideas API Types
export type IdeaModel = {
  id: string
  title: string
  slug: string
  description: string
  category: string
  author_username: string
  author_avatar: string
  author_twitter_id?: string
  source: 'user' | 'twitter'
  tweet_url?: string
  tweet_content?: string
  estimated_price?: number
  raised_amount?: number
  cap_reached_at?: string
  generated_image_url?: string
  market_analysis?: string
  token_address?: string
  timeline_phase?: number
  status: 'pending' | 'in_progress' | 'completed' | 'planned'
  upvotes: number
  downvotes: number
  votes?: number // Legacy field for compatibility
  comments_count: number
  created_at: string
  updated_at: string
}

export type IdeaVoteModel = {
  id: string
  idea_id: string
  user_id: string
  voter_twitter_id?: string
  voter_username?: string
  vote_type: 'up' | 'down'
  idea_title?: string
  idea_slug?: string
  idea_category?: string
  created_at: string
}

export type IdeaCommentModel = {
  id: string
  idea_id: string
  parent_comment_id?: string
  content: string
  author_username: string
  author_avatar: string
  author_twitter_id?: string
  is_team: boolean
  created_at: string
  upvotes?: number
  downvotes?: number
  author_investment?: number
}

export type GetIdeasResponse = {
  ideas: IdeaModel[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export type GetUserVotesResponse = {
  votes: IdeaVoteModel[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export type GetIdeaResponse = {
  idea: IdeaModel
  comments: IdeaCommentModel[]
}

export type SubmitIdeaRequest = {
  title: string
  description: string
  category: string
  authorUsername?: string
  authorAvatar?: string
  authorTwitterId?: string
  source?: 'user' | 'twitter'
  tweetUrl?: string
  tweetContent?: string
  estimatedPrice?: number
}

export type VoteIdeaRequest = {
  id: string
  action: 'vote' | 'upvote' | 'downvote'
  userId: string
  voterTwitterId?: string
  voterUsername?: string
  voteType?: 'up' | 'down'
}

export type VoteIdeaResponse = {
  success: boolean
  action: 'voted' | 'unvoted' | 'changed'
  voteType: 'up' | 'down' | null
}

export type SubmitCommentRequest = {
  ideaId: string
  parentCommentId?: string
  content: string
  authorUsername?: string
  authorAvatar?: string
  authorTwitterId?: string
  isTeam?: boolean
}

// Ideas API Functions
type GetIdeasArgs = {
  category?: string
  status?: string
  sortBy?: 'votes' | 'newest' | 'oldest' | 'raised' | 'downvotes'
  authorUsername?: string
  limit?: number
  offset?: number
}

const getIdeas = async ({ category, status, sortBy, authorUsername, limit, offset }: GetIdeasArgs = {}): Promise<GetIdeasResponse> => {
  const url = new URL(IDEAS_URL, window.location.href)
  
  if (category) url.searchParams.set("category", category)
  if (status) url.searchParams.set("status", status)
  if (sortBy) url.searchParams.set("sortBy", sortBy)
  if (authorUsername) url.searchParams.set("authorUsername", authorUsername)
  if (limit) url.searchParams.set("limit", limit.toString())
  if (offset) url.searchParams.set("offset", offset.toString())
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch ideas")
  }
  
  const json = await response.json()
  return json
}

const getUserVotes = async (voterUsername: string, limit?: number, offset?: number): Promise<GetUserVotesResponse> => {
  const url = new URL(IDEAS_URL, window.location.href)
  url.searchParams.set("voterUsername", voterUsername)
  if (limit) url.searchParams.set("limit", limit.toString())
  if (offset) url.searchParams.set("offset", offset.toString())
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch user votes")
  }
  
  const json = await response.json()
  return json
}

const getIdea = async (idOrSlug: string, bySlug: boolean = false): Promise<GetIdeaResponse> => {
  const url = new URL(IDEAS_URL, window.location.href)
  if (bySlug) {
    url.searchParams.set("slug", idOrSlug)
  } else {
    url.searchParams.set("id", idOrSlug)
  }
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch idea")
  }
  
  const json = await response.json()
  return json
}

const getIdeaBySlug = async (slug: string): Promise<GetIdeaResponse> => {
  return getIdea(slug, true)
}

const submitIdea = async (request: SubmitIdeaRequest): Promise<{ success: boolean; id: string; slug: string; url: string; message: string }> => {
  const url = new URL(IDEAS_URL, window.location.href)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to submit idea")
  }
  
  const json = await response.json()
  return json
}

const voteIdea = async (request: VoteIdeaRequest): Promise<VoteIdeaResponse> => {
  const url = new URL(IDEAS_URL, window.location.href)
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to vote on idea")
  }
  
  const json = await response.json()
  return json
}

const getIdeaComments = async (ideaId: string): Promise<{ comments: IdeaCommentModel[] }> => {
  const url = new URL(IDEA_COMMENTS_URL, window.location.href)
  url.searchParams.set("ideaId", ideaId)
  
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error("Failed to fetch comments")
  }
  
  const json = await response.json()
  return json
}

const submitIdeaComment = async (request: SubmitCommentRequest): Promise<{ success: boolean; id: string; message: string }> => {
  const url = new URL(IDEA_COMMENTS_URL, window.location.href)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to submit comment")
  }
  
  const json = await response.json()
  return json
}

// Agent Projects API Types
export type AgentProjectModel = {
  id: string
  title: string
  slug: string
  description: string
  team_name: string
  status: 'Draft' | 'Published'
  human_votes: number
  agent_votes: number
  total_votes: number
  colosseum_url: string
  colosseum_project_id: string
  estimated_price?: number
  raised_amount?: number
  treasury_wallet?: string
  generated_image_url?: string
  market_analysis?: string
  upvotes?: number
  downvotes?: number
  comments_count?: number
  created_at: string
  scraped_at: string
  updated_at: string
}

export type GetAgentProjectsResponse = {
  projects: AgentProjectModel[]
  pagination: {
    total: number
    limit: number
    offset: number
  }
}

export type GetAgentProjectResponse = {
  project: AgentProjectModel
  comments: IdeaCommentModel[] // Reuse comment model structure
}

type GetAgentProjectsArgs = {
  status?: 'Draft' | 'Published' | 'all'
  sortBy?: 'votes' | 'newest' | 'oldest' | 'raised' | 'colosseum_votes' | 'downvotes'
  limit?: number
  offset?: number
}

// Agent Projects API Functions
const getAgentProjects = async ({ status, sortBy, limit, offset }: GetAgentProjectsArgs = {}): Promise<GetAgentProjectsResponse> => {
  const url = new URL(AGENT_PROJECTS_URL, window.location.href)

  if (status && status !== 'all') url.searchParams.set("status", status)
  if (sortBy) url.searchParams.set("sortBy", sortBy)
  if (limit) url.searchParams.set("limit", limit.toString())
  if (offset) url.searchParams.set("offset", offset.toString())

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to fetch agent projects")
  }

  const json = await response.json()
  return json
}

const getAgentProject = async (idOrSlug: string, bySlug: boolean = false): Promise<GetAgentProjectResponse> => {
  const url = new URL(AGENT_PROJECTS_URL, window.location.href)
  if (bySlug) {
    url.searchParams.set("slug", idOrSlug)
  } else {
    url.searchParams.set("id", idOrSlug)
  }

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to fetch agent project")
  }

  const json = await response.json()
  return json
}

const getAgentProjectBySlug = async (slug: string): Promise<GetAgentProjectResponse> => {
  return getAgentProject(slug, true)
}

const voteAgentProject = async (request: VoteIdeaRequest): Promise<VoteIdeaResponse> => {
  const url = new URL(AGENT_PROJECTS_URL, window.location.href)
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to vote on agent project")
  }

  const json = await response.json()
  return json
}

const getAgentProjectComments = async (projectId: string): Promise<{ comments: IdeaCommentModel[] }> => {
  const url = new URL(AGENT_PROJECT_COMMENTS_URL, window.location.href)
  url.searchParams.set("projectId", projectId)

  const response = await fetch(url)

  if (!response.ok) {
    throw new Error("Failed to fetch comments")
  }

  const json = await response.json()
  return json
}

const submitAgentProjectComment = async (request: Omit<SubmitCommentRequest, 'ideaId'> & { projectId: string }): Promise<{ success: boolean; id: string; message: string }> => {
  const url = new URL(AGENT_PROJECT_COMMENTS_URL, window.location.href)
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Failed to submit comment")
  }

  const json = await response.json()
  return json
}

export const backendSparkApi = {
  postCreateUserStatus,
  getUser,
  getTokens,
  createDao,
  getToken,
  getDao,
  getUserTokens,
  getTokenMarket,
  getTokenBalance,
  getSolBalance,
  sendTransaction,
  getBlockhash,
  getAccountInfo,
  getGovernanceData,
  getApplicationsByProjectId,
  getAllApplications,
  submitApplication,
  getDaos,
  isAdmin,
  generateGitHubScore,
  getApplicationWithGitHubScore,
  testGitHubApi,
  testGitHubPermissions,
  getTokenVolume,
  getCreators,
  getTwitterOAuthUrl,
  exchangeTwitterOAuthToken,
  getLeaderboard,
  rewardCreator,
  getTotalFees,
  getTokenBalanceNew,
  simulateTransaction,
  governanceTransaction,
  voteTransaction,
  // Ideas API
  getIdeas,
  getIdea,
  getIdeaBySlug,
  getUserVotes,
  submitIdea,
  voteIdea,
  getIdeaComments,
  submitIdeaComment,
  // Agent Projects API
  getAgentProjects,
  getAgentProject,
  getAgentProjectBySlug,
  voteAgentProject,
  getAgentProjectComments,
  submitAgentProjectComment
}