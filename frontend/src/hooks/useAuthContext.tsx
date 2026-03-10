/**
 * Context Boilerplate
 */

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react"
import { useWalletContext } from "./useWalletContext"
import { useMutation } from "@tanstack/react-query"
import { backendSparkApi } from "@/data/api/backendSparkApi"
import { AdminAuthFields } from "shared/models"
import { toast } from "react-toastify"
import { useNavigate } from "react-router-dom"

type Context = {
  isSignedIn: boolean
  isPending: boolean
}

const AuthContext = createContext<Context | undefined>(undefined)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) throw new Error("Component is outside of the <AuthProvider />")
  return context
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isSignedIn, setIsSignedIn] = useState(false)
  const { signMessage, address, isWalletConnected } = useWalletContext()
  const navigate = useNavigate()

  // fetch Analyst and token via sessionId
  const { mutate: checkIfUserIsAdmin, isPending } = useMutation({
    mutationFn: async (auth: AdminAuthFields) => backendSparkApi.isAdmin(auth),
    onError: (error) => {
      toast.error(error.message)
      navigate("/", { replace: true })
    },
    onSuccess: () => {
      setIsSignedIn(true)
    },
    gcTime: 0,
  })

  const checkIfUserIsAdminHandler = useCallback(async () => {
    try {
      console.log("🚀 ~ checkIfUserIsAdminHandler")
      const message = "I confirm that I'm admin"
      const signature = Array.from(await signMessage(message))
      const auth = { address, message, signature }

      checkIfUserIsAdmin(auth)
    } catch (e) {
      toast.warning("admin authorization not confirmed", { theme: "colored" })
      navigate("/", { replace: true })
    }
  }, [address, checkIfUserIsAdmin, navigate, signMessage])

  useEffect(() => {
    if (!isSignedIn && isWalletConnected) {
      checkIfUserIsAdminHandler()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWalletConnected])

  // check if user signed out
  useEffect(() => {
    if (!isWalletConnected || !address) {
      setIsSignedIn(false)
      return
    }
  }, [isWalletConnected, address, isSignedIn, checkIfUserIsAdminHandler])

  return <AuthContext.Provider value={{ isSignedIn, isPending }}>{children}</AuthContext.Provider>
}
