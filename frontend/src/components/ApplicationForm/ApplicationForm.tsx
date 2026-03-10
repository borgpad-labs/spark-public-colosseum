import React, { useState } from 'react'
import { backendSparkApi, SubmitApplicationRequest } from '../../data/api/backendSparkApi'

interface ApplicationFormProps {
  projectId: string
  onSubmit?: (applicationId: string, githubScore?: number) => void
}

export const ApplicationForm: React.FC<ApplicationFormProps> = ({ projectId, onSubmit }) => {
  const [formData, setFormData] = useState<SubmitApplicationRequest>({
    projectId,
    githubUsername: '',
    githubId: '',
    deliverableName: '',
    requestedPrice: 0,
    estimatedDeadline: '',
    featureDescription: '',
    solanaWalletAddress: '',
    githubAccessToken: '',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate GitHub access token is provided
    if (!formData.githubAccessToken) {
      setError('GitHub access token is required to calculate your trust score. Please provide a valid GitHub access token.')
      setLoading(false)
      return
    }

    try {
      // Submit application with GitHub score calculation
      const result = await backendSparkApi.submitApplication(formData)
      
      console.log('Application submitted successfully:', result)
      
      // Application submitted successfully
      console.log('Application submitted with GitHub score:', result.githubScore)

      onSubmit?.(result.applicationId, result.githubScore)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit application')
    } finally {
      setLoading(false)
    }
  }

  const testGitHubApi = async () => {
    if (!formData.githubAccessToken) {
      setError('GitHub access token is required to test API')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await backendSparkApi.testGitHubApi(formData.githubAccessToken)
      console.log('GitHub API test result:', result)
      alert(`GitHub API test successful! Username: ${result.user?.username}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test GitHub API')
    } finally {
      setLoading(false)
    }
  }

  const generateGitHubScore = async () => {
    if (!formData.githubUsername || !formData.githubAccessToken) {
      setError('GitHub username and access token are required to generate GitHub score')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await backendSparkApi.generateGitHubScore({
        githubUsername: formData.githubUsername,
        githubAccessToken: formData.githubAccessToken,
      })

      if (result.success && result.githubScore) {
        console.log('GitHub score generated:', result.githubScore)
        alert(`GitHub score generated: ${result.githubScore}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate GitHub score')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Submit Application</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Username *
          </label>
          <input
            type="text"
            name="githubUsername"
            value={formData.githubUsername}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub ID *
          </label>
          <input
            type="text"
            name="githubId"
            value={formData.githubId}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Access Token (Required for score calculation)
          </label>
          <input
            type="password"
            name="githubAccessToken"
            value={formData.githubAccessToken}
            onChange={handleInputChange}
            placeholder="ghp_..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="text-xs text-gray-600 mt-2 space-y-1">
            <p>🔑 <strong>How to get a GitHub Access Token:</strong></p>
            <ol className="list-decimal list-inside ml-2 space-y-1">
              <li>Go to <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">GitHub Settings → Developer Settings → Personal Access Tokens</a></li>
              <li>Click "Generate new token (classic)"</li>
              <li>Give it a name like "Spark IT Score Calculation"</li>
              <li>Select these scopes: <code className="bg-gray-100 px-1 rounded">read:user</code>, <code className="bg-gray-100 px-1 rounded">user:email</code>, <code className="bg-gray-100 px-1 rounded">repo</code>, <code className="bg-gray-100 px-1 rounded">read:org</code>, <code className="bg-gray-100 px-1 rounded">gist</code></li>
              <li>Click "Generate token" and copy the token (starts with <code className="bg-gray-100 px-1 rounded">ghp_</code>)</li>
            </ol>
            <p className="text-orange-600 mt-2">⚠️ Keep your token secure and don't share it with anyone!</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Deliverable Name *
          </label>
          <input
            type="text"
            name="deliverableName"
            value={formData.deliverableName}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requested Price (USD) *
          </label>
          <input
            type="number"
            name="requestedPrice"
            value={formData.requestedPrice}
            onChange={handleInputChange}
            required
            min="0"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Estimated Deadline *
          </label>
          <input
            type="date"
            name="estimatedDeadline"
            value={formData.estimatedDeadline}
            onChange={handleInputChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Feature Description *
          </label>
          <textarea
            name="featureDescription"
            value={formData.featureDescription}
            onChange={handleInputChange}
            required
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Solana Wallet Address *
          </label>
          <input
            type="text"
            name="solanaWalletAddress"
            value={formData.solanaWalletAddress}
            onChange={handleInputChange}
            required
            placeholder="ABC123..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          {formData.githubAccessToken && (
            <>
              <button
                type="button"
                onClick={testGitHubApi}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50"
              >
                {loading ? 'Testing...' : 'Test GitHub API'}
              </button>
              <button
                type="button"
                onClick={generateGitHubScore}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Calculating...' : 'Calculate GitHub Score'}
              </button>
            </>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>

      {/* GitHub Score Display */}
      {/* Score is now only stored as a number, detailed display removed */}
    </div>
  )
}

export default ApplicationForm 