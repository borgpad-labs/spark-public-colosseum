import { ProjectModel } from "shared/models"

export enum ROUTES {
  LANDING_PAGE = "/",
  GET_STARTED = "/get-started",
  CONNECTION = "/connection",
  EMAIL_CONNECTION = "/email-connection",
  USERNAME = "/username",
  TERMS = "/terms",
  PROJECTS = "/projects",
  DISCOVER = "/discover",
  PROFILE = "/profile",
  PUBLIC_PROFILE = "/profile/:username",
  SEARCH = "/search",
  PROJECT = "/project/:id",
  APPLY = "/apply",
  IDEAS = "/ideas",
  IDEA = "/ideas/:slug",
  AGENTS = "/agents",
  AGENT = "/agents/:slug",
  TEAMS = "/teams",
  EXPLANATION = "/explanation",
  ROADMAP = "/roadmap",
  GOAT_POOLS = "/goat-pools",
  LAUNCH_POOLS = "/launch-pools",
  BLITZ_POOLS = "/blitz-pools",
  DRAFT_PICKS = "/draft-picks",
  TERMS_OF_USE = "/terms-of-use",
  TERMS_AND_CONDITIONS = "/terms-and-conditions",
  DOCS = "https://docs.borgpad.com",
  BACK_OFFICE = "/back-office-dashboard-2025",
  VOLUME = "/volume",
  VOLUME_TOKEN = "/volume/:token",
  CLAIM_FEES = "/claimfees",
  FEES = "/fees",
  MCP = "/mcp",
}

const projectTypeRoutes: Record<ProjectModel["info"]["projectType"], string> = {
  goat: `${ROUTES.GOAT_POOLS}`,
  blitz: `${ROUTES.BLITZ_POOLS}`,
  "launch-pool": `${ROUTES.LAUNCH_POOLS}`,
  "draft-pick": `${ROUTES.DRAFT_PICKS}`,
}

export const getProjectRoute = (project: ProjectModel | undefined) => {
  if (!project) return ""
  if (["goat", "blitz"].includes(project.info.projectType)) {
    return `${ROUTES.LAUNCH_POOLS}/${project.id}`
  }
  return `${projectTypeRoutes[project.info.projectType]}/${project.id}`
}
