import {
  AdminAuthFields,
} from "../../../shared/models.ts"
import {
  AnalysisSortBy,
  AnalysisSortDirection,
  AnalystRoleEnum,
  analystSchema,
  GetListOfAnalysisResponse,
  NewAnalysisSchemaType,
} from "../../../shared/schemas/analysis-schema.ts"
import { Analyst, Analysis } from "../../../shared/drizzle-schema.ts"
import { BP_JWT_TOKEN } from "@/utils/constants.ts"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? `${window.location.origin}/api`

const GET_SESSION = API_BASE_URL + "/session"

// analysis & analyst
const GET_TWITTER_AUTH_URL = API_BASE_URL + "/analyst/twitterauthurl"
const GET_ANALYST_URL = API_BASE_URL + "/analyst"
const POST_ANALYSIS = API_BASE_URL + "/analysis"
const GET_ANALYSIS_LIST = API_BASE_URL + "/analysis"
const MANUALLY_ADD_ANALYSIS = API_BASE_URL + "/analysis/manuallyadd"
const REFRESH_ANALYSIS = API_BASE_URL + "/analysis/refreshstats"
const getTwitterAuthUrl = async (): Promise<{ twitterAuthUrl: string }> => {
  const url = new URL(GET_TWITTER_AUTH_URL, window.location.href)

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
    },
  })
  const json = await response.json()
  return json
}
const getAnalyst = async ({ analystId }: { analystId: string }): Promise<Analyst> => {
  const url = new URL(`${GET_ANALYST_URL}/${analystId}`, window.location.href)

  const response = await fetch(url)
  const json = await response.json()
  try {
    const parsedJson = analystSchema.parse(json)
    return parsedJson
  } catch (e) {
    console.error("GET /analysts/[id] validation error!")
    throw e
  }
}
const postNewAnalysis = async ({ newAnalysis }: { newAnalysis: NewAnalysisSchemaType }): Promise<Analysis> => {
  const url = new URL(POST_ANALYSIS, window.location.href)
  const request = JSON.stringify(newAnalysis)
  const token = localStorage.getItem(BP_JWT_TOKEN)
  if (!token) throw new Error("Missing token!")

  const response = await fetch(url, {
    method: "POST",
    body: request,
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
    },
  })
  const json = await response.json()
  localStorage.removeItem(BP_JWT_TOKEN)
  if (!response.ok) throw new Error(json.message)
  return json
}

export type UpdateAnalysisApproval = {
  analysisId: string
  action: "decline" | "approve"
  auth: {
    address: string
    message: string
    signature: number[]
  }
}
const updateAnalysisApproval = async ({ analysisId, ...rest }: UpdateAnalysisApproval): Promise<void> => {
  const url = new URL(`${POST_ANALYSIS}/${analysisId}`, window.location.href)
  const request = JSON.stringify({ isApproved: rest.action === "approve", ...rest })
  const response = await fetch(url, {
    method: "POST",
    body: request,
    headers: {
      "Content-Type": "application/json",
    },
  })
  if (!response.ok) throw new Error("Analysis update error!")
}
export type GetListOfAnalysisRequest = {
  projectId?: string
  isApproved?: boolean
  sortDirection?: AnalysisSortDirection
  sortBy?: AnalysisSortBy
}
const getAnalysisList = async ({
  projectId,
  isApproved,
  sortBy,
  sortDirection,
}: GetListOfAnalysisRequest): Promise<GetListOfAnalysisResponse> => {
  const url = new URL(GET_ANALYSIS_LIST, window.location.href)

  // search params
  projectId && url.searchParams.set("projectId", projectId)
  sortBy && url.searchParams.set("sortBy", sortBy)
  sortDirection && url.searchParams.set("sortDirection", sortDirection)
  if (typeof isApproved === "boolean") {
    url.searchParams.set("isApproved", String(isApproved))
  }

  const response = await fetch(url)
  const json = await response.json()

  return json
}

type ManuallyAddAnalysisArgs = {
  projectId: string
  articleUrl: string
  analystRole: AnalystRoleEnum
  auth: {
    address: string
    message: string
    signature: number[]
  }
}

const manuallyAddAnalysis = async (args: ManuallyAddAnalysisArgs): Promise<Analysis> => {
  const url = new URL(MANUALLY_ADD_ANALYSIS, window.location.href)
  const request = JSON.stringify(args)
  const response = await fetch(url, {
    method: "POST",
    body: request,
    headers: {
      "Content-Type": "application/json",
    },
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.message)
  return json
}

const getSession = async (sessionId: string): Promise<{ analyst: Analyst; token: string }> => {
  const url = new URL(GET_SESSION, window.location.href)
  url.searchParams.set("sessionId", sessionId)

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.message)
  return json
}

const refreshAnalysis = async ({ auth }: { auth: AdminAuthFields }): Promise<void> => {
  const url = new URL(REFRESH_ANALYSIS, window.location.href)
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ auth })
  })
  if (!response.ok) {
    const json = await response.json()
    throw new Error(json.message || 'Failed to refresh analysis')
  }
  // Don't try to parse JSON if response is empty
  if (response.status === 200) return
  const json = await response.json()
  return json
}


export const analysisApi = {
  getTwitterAuthUrl,
  getAnalyst,
  postNewAnalysis,
  getAnalysisList,
  updateAnalysisApproval,
  manuallyAddAnalysis,
  getSession,
  refreshAnalysis,
}
