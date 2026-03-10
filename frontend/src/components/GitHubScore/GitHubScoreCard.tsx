import React from 'react'
import { GitHubScoreData } from '../../../shared/services/githubScore'

interface GitHubScoreCardProps {
  scoreData: GitHubScoreData
  className?: string
}

export const GitHubScoreCard: React.FC<GitHubScoreCardProps> = ({ scoreData, className = '' }) => {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-100'
    if (score >= 80) return 'text-blue-600 bg-blue-100'
    if (score >= 70) return 'text-yellow-600 bg-yellow-100'
    if (score >= 60) return 'text-orange-600 bg-orange-100'
    return 'text-red-600 bg-red-100'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Exceptional'
    if (score >= 80) return 'Excellent'
    if (score >= 70) return 'Good'
    if (score >= 60) return 'Fair'
    return 'Poor'
  }

  const getTrustLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'high': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">GitHub Trust Score</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(scoreData.totalScore)}`}>
            {scoreData.totalScore}/100
          </span>
          <span className="text-sm text-gray-500">{getScoreLabel(scoreData.totalScore)}</span>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">Profile Score</div>
          <div className="text-xl font-bold text-gray-900">
            {Math.round(scoreData.scoreBreakdown.profileScore)}
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">Repository Score</div>
          <div className="text-xl font-bold text-gray-900">
            {Math.round(scoreData.scoreBreakdown.repositoryScore)}
          </div>
        </div>
      </div>

      {/* Developer Persona */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">Developer Profile</h4>
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-sm font-medium text-blue-900 mb-1">
            {scoreData.persona.type}
          </div>
          <div className="text-xs text-blue-700">
            {scoreData.persona.devStyle.join(' • ')}
          </div>
        </div>
      </div>

      {/* Skills */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">Key Skills</h4>
        <div className="flex flex-wrap gap-2">
          {scoreData.skills.languages.slice(0, 5).map((lang, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
            >
              {lang.name} ({lang.usagePercent}%)
            </span>
          ))}
          {scoreData.skills.web3 && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
              Web3
            </span>
          )}
          {scoreData.skills.isFullstack && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
              Full-Stack
            </span>
          )}
        </div>
      </div>

      {/* Trust Assessment */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-2">Trust Assessment</h4>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Trust Level:</span>
            <span className={`text-sm font-medium ${getTrustLevelColor(scoreData.recommendation.trustLevel)}`}>
              {scoreData.recommendation.trustLevel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Confidence:</span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round(scoreData.confidenceScore * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Strengths */}
      {scoreData.recommendation.notableStrengths.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Notable Strengths</h4>
          <ul className="space-y-1">
            {scoreData.recommendation.notableStrengths.slice(0, 3).map((strength, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-center">
                <span className="text-green-500 mr-2">✓</span>
                {strength}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Factors */}
      {scoreData.recommendation.riskFactors.length > 0 && (
        <div className="mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-2">Risk Factors</h4>
          <ul className="space-y-1">
            {scoreData.recommendation.riskFactors.slice(0, 3).map((risk, index) => (
              <li key={index} className="text-sm text-gray-700 flex items-center">
                <span className="text-yellow-500 mr-2">⚠</span>
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggested Roles */}
      {scoreData.recommendation.suggestedRoles.length > 0 && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-2">Recommended Roles</h4>
          <div className="space-y-2">
            {scoreData.recommendation.suggestedRoles.slice(0, 2).map((role, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-3">
                <div className="text-sm font-medium text-gray-900">{role.title}</div>
                <div className="text-xs text-gray-600">{role.reason}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default GitHubScoreCard 