import React from "react"

export interface StatusIconProps {
  isValid: boolean | null
  isLoading?: boolean
}

export const StatusIcon: React.FC<StatusIconProps> = ({ isValid, isLoading }) => {
  if (isLoading) {
    return <span className="flex h-5 w-5 items-center justify-center animate-spin">⟳</span>
  }

  if (isValid === null) {
    return <span className="flex h-5 w-5 items-center justify-center text-gray-400">?</span>
  }

  return isValid ? (
    <span className="flex h-5 w-5 items-center justify-center text-green-500">✓</span>
  ) : (
    <span className="flex h-5 w-5 items-center justify-center text-red-500">✗</span>
  )
} 