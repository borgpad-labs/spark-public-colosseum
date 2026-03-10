/**
 * Context Boilerplate
 */

import { createContext, ReactNode, useContext } from "react"

type Context = {
  example: string
}

const PlaceholderContext = createContext<Context | undefined>(undefined)

export function usePlaceholderContext() {
  const context = useContext(PlaceholderContext)
  if (!context)
    throw new Error("Component is outside of the <PlaceholderProvider />")
  return context
}

export function PlaceholderProvider({ children }: { children: ReactNode }) {
  const example = "string"

  return (
    <PlaceholderContext.Provider
      value={{
        example,
      }}
    >
      {children}
    </PlaceholderContext.Provider>
  )
}
