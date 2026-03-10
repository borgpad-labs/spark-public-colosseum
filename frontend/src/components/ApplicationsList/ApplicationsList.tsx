import React, { useState, useEffect } from 'react'
import { backendSparkApi, ApplicationResponse } from '../../data/api/backendSparkApi'

interface ApplicationsListProps {
  projectId?: string
  showGitHubScores?: boolean
}

export const ApplicationsList: React.FC<ApplicationsListProps> = ({ 
  projectId, 
  showGitHubScores = true 
}) => {
  const [applications, setApplications] = useState<ApplicationResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedApplication, setSelectedApplication] = useState<ApplicationResponse | null>(null)

  useEffect(() => {
    loadApplications()
  }, [projectId])

  const loadApplications = async () => {
    try {
      setLoading(true)
      let response

      if (projectId) {
        response = await backendSparkApi.getApplicationsByProjectId({ projectId })
      } else {
        response = await backendSparkApi.getAllApplications()
      }

      setApplications(response.applications)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">Loading applications...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (applications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No applications found.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">
        {projectId ? 'Project Applications' : 'All Applications'}
      </h2>

      <div className="grid gap-6">
        {applications.map((application) => (
          <div
            key={application.id}
            className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {application.deliverableName}
                </h3>
                <p className="text-sm text-gray-600">
                  by @{application.githubUsername}
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                {application.githubScore !== undefined && (
                  <div className="text-right">
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(application.githubScore)}`}>
                      {application.githubScore}/100
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {getScoreLabel(application.githubScore)}
                    </div>
                  </div>
                )}
                
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  application.status === 'approved' ? 'bg-green-100 text-green-800' :
                  application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {application.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
              <div>
                <span className="text-gray-500">Price:</span>
                <div className="font-medium">${application.requestedPrice}</div>
              </div>
              <div>
                <span className="text-gray-500">Deadline:</span>
                <div className="font-medium">
                  {new Date(application.estimatedDeadline).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Submitted:</span>
                <div className="font-medium">
                  {new Date(application.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-gray-500">Project ID:</span>
                <div className="font-medium">{application.projectId}</div>
              </div>
            </div>

            <div className="mb-4">
              <span className="text-gray-500 text-sm">Description:</span>
              <p className="text-gray-900 mt-1">{application.featureDescription}</p>
            </div>

            {showGitHubScores && application.githubScore !== undefined && (
              <div className="border-t pt-4">
                <div className="text-sm text-gray-600">
                  GitHub Trust Score: <span className="font-medium">{application.githubScore}/100</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ApplicationsList 