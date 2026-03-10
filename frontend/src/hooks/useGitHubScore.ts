import { useState, useCallback } from 'react'
import { GitHubScoreData } from '../../shared/services/githubScore'

interface UseGitHubScoreReturn {
  scoreData: GitHubScoreData | null
  loading: boolean
  error: string | null
  generateScore: (githubUsername: string, githubAccessToken: string, applicationId?: string) => Promise<void>
  clearError: () => void
}

export const useGitHubScore = (): UseGitHubScoreReturn => {
  const [scoreData, setScoreData] = useState<GitHubScoreData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateScore = useCallback(async (
    githubUsername: string, 
    githubAccessToken: string, 
    applicationId?: string
  ) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/github-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          githubUsername,
          githubAccessToken,
          applicationId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to generate GitHub score')
      }

      if (data.success) {
        setScoreData(data.githubScoreData)
      } else {
        throw new Error(data.message || 'Failed to generate GitHub score')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('GitHub score generation error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    scoreData,
    loading,
    error,
    generateScore,
    clearError,
  }
} 