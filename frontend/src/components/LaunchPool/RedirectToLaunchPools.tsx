import { ROUTES } from "@/utils/routes"
import { Navigate, useLocation } from "react-router-dom"

/**
 * this function serves only to redirect from  "/goat-pools/*" and "/blitz-pools/*" to new path "/launch-pools/*" 
 */
const RedirectToLaunchPools = () => {
  const { pathname } = useLocation()
  const projectId = pathname.split("/")[2]
  return <Navigate to={`${ROUTES.LAUNCH_POOLS}/${projectId ?? ""}`} replace />
}

export default RedirectToLaunchPools
