import { ScrollRestoration, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/Button/Button"
import { Input } from "@/components/Input/Input"
import { Icon } from "@/components/Icon/Icon"
import { SimpleModal } from "@/components/Modal/SimpleModal"
import { backendSparkApi, DaoResponse } from "@/data/api/backendSparkApi"
import { ROUTES } from "@/utils/routes"
import { toast } from "react-toastify"
import Img from "@/components/Image/Img"
import { GitHubAuth, GitHubAuthData } from "@/utils/githubAuth"

type ApplicationFormData = {
  deliverableName: string
  requestedPrice: string
  estimatedDeadline: string
  featureDescription: string
  solanaWalletAddress: string
}

const Apply = () => {
  const navigate = useNavigate()
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false)
  const [selectedDao, setSelectedDao] = useState<DaoResponse | null>(null)
  const [applicationForm, setApplicationForm] = useState<ApplicationFormData>({
    deliverableName: "",
    requestedPrice: "",
    estimatedDeadline: "",
    featureDescription: "",
    solanaWalletAddress: "",
  })
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [termsOfUseAccepted, setTermsOfUseAccepted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [githubAuth, setGithubAuth] = useState<GitHubAuthData | null>(null)
  const [isHandlingCallback, setIsHandlingCallback] = useState(false)

  // Check if user is authenticated with GitHub
  const isGitHubAuthenticated = githubAuth !== null

  // Check for stored GitHub auth on component mount
  useEffect(() => {
    const storedAuth = GitHubAuth.getStoredAuth()
    if (storedAuth) {
      setGithubAuth(storedAuth)
    }
  }, [])

  // Handle OAuth callback
  useEffect(() => {
    const handleOAuthCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      const state = urlParams.get('state')
      
      if (code && state) {
        setIsHandlingCallback(true)
        try {
          const authData = await GitHubAuth.handleCallback(code, state)
          setGithubAuth(authData)
          toast.success(`Welcome, ${authData.user.username}!`)
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname)
        } catch (error) {
          console.error('GitHub OAuth callback error:', error)
          toast.error((error as Error).message || 'GitHub authentication failed')
        } finally {
          setIsHandlingCallback(false)
        }
      }
    }

    handleOAuthCallback()
  }, [])

  // Fetch all DAOs
  const { data: daosData, isLoading: isLoadingDaos } = useQuery({
    queryKey: ['daos-for-apply'],
    queryFn: () => backendSparkApi.getDaos(),
    enabled: true,
  })

  // Handle GitHub authentication
  const handleGitHubAuth = async () => {
    try {
      await GitHubAuth.login()
    } catch (error) {
      console.error('GitHub authentication failed:', error)
      toast.error('Failed to connect to GitHub. Please try again.')
    }
  }

  // Handle opening application modal
  const handleApplyClick = (dao: DaoResponse) => {
    if (!isGitHubAuthenticated) {
      toast.error("Please authenticate with GitHub first")
      return
    }
    setSelectedDao(dao)
    setIsApplicationModalOpen(true)
  }

  // Handle form input changes
  const handleInputChange = (field: keyof ApplicationFormData, value: string) => {
    setApplicationForm(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Handle form submission
  const handleSubmitApplication = async () => {
    if (!selectedDao || !githubAuth) {
      toast.error("Missing required information")
      return
    }

    if (!rulesAccepted || !termsOfUseAccepted) {
      toast.error("Please accept all requirements and terms of use")
      return
    }

    // Validate form
    const { deliverableName, requestedPrice, estimatedDeadline, featureDescription, solanaWalletAddress } = applicationForm
    if (!deliverableName || !requestedPrice || !estimatedDeadline || !featureDescription || !solanaWalletAddress) {
      toast.error("Please fill in all required fields")
      return
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(estimatedDeadline)) {
      toast.error("Please select a valid deadline date")
      return
    }

    setIsSubmitting(true)
    try {
      console.log('Submitting application with GitHub auth:', {
        username: githubAuth.user.username,
        hasAccessToken: !!githubAuth.accessToken,
        tokenPrefix: githubAuth.accessToken?.substring(0, 10) + '...'
      })
      
      const result = await backendSparkApi.submitApplication({
        projectId: selectedDao.id,
        githubUsername: githubAuth.user.username,
        githubId: githubAuth.user.id.toString(),
        deliverableName,
        requestedPrice: parseFloat(requestedPrice),
        estimatedDeadline,
        featureDescription,
        solanaWalletAddress,
        githubAccessToken: githubAuth.accessToken, // Add the access token from OAuth
      })
      
      console.log('Application submission result:', result)

      toast.success("Application submitted successfully!")
      handleModalClose()
    } catch (error) {
      console.error('Application submission error:', error)
      toast.error((error as Error).message || 'Failed to submit application')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setApplicationForm({
      deliverableName: "",
      requestedPrice: "",
      estimatedDeadline: "",
      featureDescription: "",
      solanaWalletAddress: "",
    })
    setRulesAccepted(false)
    setTermsOfUseAccepted(false)
  }

  // Handle modal close
  const handleModalClose = () => {
    setIsApplicationModalOpen(false)
    setSelectedDao(null)
    resetForm()
  }

  if (isHandlingCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-accent">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-fg-primary text-lg">Completing GitHub authentication...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-accent text-fg-primary">
      <ScrollRestoration />
      
      {/* Header */}
      <div className="bg-accent border-b border-fg-primary/10 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-brand-primary">Developer Applications</h1>
              <p className="text-fg-secondary">Apply to build for active DAOs and get funded</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate(ROUTES.PROJECTS)}
                color="secondary"
                size="sm"
              >
                Back to Projects
              </Button>
              {!isGitHubAuthenticated ? (
                <Button
                  onClick={handleGitHubAuth}
                  className="bg-gray-800 hover:bg-gray-700 text-white"
                  size="sm"
                >
                  <Icon icon="SvgExternalLink" className="w-4 h-4 mr-2" />
                  Connect GitHub
                </Button>
              ) : (
                <div className="flex items-center gap-2 text-sm text-fg-secondary">
                  <Icon icon="SvgExternalLink" className="w-4 h-4" />
                  <span>Connected: {githubAuth?.user.username}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* GitHub Authentication Notice */}
        {!isGitHubAuthenticated && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <Icon icon="SvgQuestionCircle" className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-yellow-500 font-medium">GitHub Authentication Required</p>
                <p className="text-fg-secondary text-sm">
                  You need to authenticate with GitHub to apply to DAOs. This helps us verify your developer credentials.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* DAOs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoadingDaos ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-bg-secondary rounded-lg p-6 animate-pulse">
                <div className="w-16 h-16 bg-fg-primary/10 rounded-lg mb-4"></div>
                <div className="h-4 bg-fg-primary/10 rounded mb-2"></div>
                <div className="h-3 bg-fg-primary/10 rounded mb-4"></div>
                <div className="h-8 bg-fg-primary/10 rounded"></div>
              </div>
            ))
          ) : (
            daosData?.daos?.map((dao) => (
              <div key={dao.id} className="bg-bg-secondary rounded-lg p-6 hover:bg-bg-secondary/80 transition-colors">
                <div className="flex items-center gap-4 mb-4">
                  <Img
                    src={dao.imageUrl || '/images/default-dao-logo.png'}
                    alt={dao.name}
                    imgClassName="w-16 h-16 rounded-lg"
                  />
                  <div>
                    <h3 className="font-semibold text-fg-primary">{dao.name}</h3>
                    <p className="text-sm text-fg-secondary">DeFi</p>
                  </div>
                </div>
                
                <p className="text-fg-secondary text-sm mb-4 line-clamp-3">
                  {dao.name} - An active DAO seeking talented developers to build innovative solutions
                </p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-secondary">Available Funds:</span>
                    <span className="text-fg-primary font-medium">
                      $100,000
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-fg-secondary">Chain:</span>
                    <span className="text-fg-primary">Solana</span>
                  </div>
                </div>
                
                <Button
                  onClick={() => handleApplyClick(dao)}
                  className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white"
                  disabled={!isGitHubAuthenticated}
                >
                  Apply
                </Button>
              </div>
            ))
          )}
        </div>

        {daosData?.daos?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-fg-secondary text-lg">No active DAOs available for applications at the moment.</p>
          </div>
        )}
      </div>

      {/* Application Modal */}
      <SimpleModal
        isOpen={isApplicationModalOpen}
        onClose={handleModalClose}
        className="max-w-7xl max-h-[95vh] w-[95vw] mx-auto my-4"
      >
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header with Close Button */}
          <div className="border-b border-fg-primary/10 pb-6 mb-6 flex-shrink-0 mx-6 mt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Img
                  src={selectedDao?.imageUrl || '/images/default-dao-logo.png'}
                  alt={selectedDao?.name}
                  imgClassName="w-16 h-16 rounded-lg"
                />
                <div>
                  <h2 className="text-2xl font-bold text-fg-primary">Apply to {selectedDao?.name}</h2>
                  <p className="text-fg-secondary">Submit your development proposal</p>
                </div>
              </div>
              <button
                onClick={handleModalClose}
                className="p-2 hover:bg-bg-secondary rounded-lg transition-colors group flex items-center justify-center"
                type="button"
              >
                <svg 
                  className="w-6 h-6 text-fg-secondary group-hover:text-fg-primary transition-colors" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-2">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mx-auto max-w-6xl">
              {/* Form Section */}
              <div className="lg:col-span-2 space-y-6">
                <div className="space-y-5">
                  {/* Project Details Section */}
                  <div className="bg-gradient-to-r from-brand-primary/5 to-brand-secondary/5 rounded-lg p-6 border border-brand-primary/20">
                    <h3 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
                      <Icon icon="SvgDocument" className="w-5 h-5 text-brand-primary" />
                      Project Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-fg-primary mb-2">
                          Deliverable Name *
                        </label>
                        <Input
                          value={applicationForm.deliverableName}
                          onChange={(e) => handleInputChange('deliverableName', e.target.value)}
                          placeholder="e.g., Mobile Trading App"
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-fg-primary mb-2">
                          Estimated Deadline *
                        </label>
                        <Input
                          type="date"
                          value={applicationForm.estimatedDeadline}
                          onChange={(e) => handleInputChange('estimatedDeadline', e.target.value)}
                          placeholder="YYYY-MM-DD"
                          className="w-full [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Financial Details Section */}
                  <div className="bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-lg p-6 border border-green-500/20">
                    <h3 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
                      <Icon icon="SvgChartLine" className="w-5 h-5 text-green-500" />
                      Financial Details
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-fg-primary mb-2">
                          Requested Price (SOL) *
                        </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-secondary">SOL</span>
                            <Input
                              type="number"
                              value={applicationForm.requestedPrice}
                              onChange={(e) => handleInputChange('requestedPrice', e.target.value)}
                              placeholder="10"
                              className="w-full pl-12"
                            />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-fg-primary mb-2">
                          Solana Wallet Address *
                        </label>
                        <Input
                          value={applicationForm.solanaWalletAddress}
                          onChange={(e) => handleInputChange('solanaWalletAddress', e.target.value)}
                          placeholder="Your wallet address"
                          className="w-full font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Technical Description Section */}
                  <div className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-lg p-6 border border-blue-500/20">
                    <h3 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
                      <Icon icon="SvgList" className="w-5 h-5 text-blue-500" />
                      Technical Description
                    </h3>
                    <div>
                      <label className="block text-sm font-medium text-fg-primary mb-2">
                        Feature Description *
                      </label>
                      <textarea
                        value={applicationForm.featureDescription}
                        onChange={(e) => handleInputChange('featureDescription', e.target.value)}
                        placeholder="Describe the features, technical architecture, and functionality you plan to build. Include details about user experience, backend systems, and integration requirements..."
                        className="w-full h-40 px-4 py-3 bg-bg-secondary border border-fg-primary/20 rounded-lg text-black resize-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                        rows={6}
                      />
                      <div className="flex justify-between items-center mt-2 text-xs text-fg-secondary">
                        <span>Be specific about deliverables and timeline</span>
                        <span>{applicationForm.featureDescription.length}/1000</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* GitHub Profile */}
                <div className="bg-bg-secondary rounded-lg p-6 border border-fg-primary/10">
                  <h3 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
                    <Icon icon="SvgExternalLink" className="w-5 h-5 text-purple-500" />
                    Developer Profile
                  </h3>
                  {githubAuth && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-3 bg-bg-primary rounded-lg">
                        <img 
                          src={githubAuth.user.avatar_url} 
                          alt={githubAuth.user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium text-fg-primary">{githubAuth.user.name}</p>
                          <p className="text-sm text-fg-secondary">@{githubAuth.user.username}</p>
                        </div>
                      </div>
                      
                      {/* Debug info - remove in production */}
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                        <p className="text-xs text-green-600 font-medium mb-1">GitHub Auth Status:</p>
                        <p className="text-xs text-green-600">✅ Connected</p>
                        <p className="text-xs text-green-600">🔑 Token: {githubAuth.accessToken ? 'Present' : 'Missing'}</p>
                        <p className="text-xs text-green-600">📊 Score calculation: Enabled</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Requirements */}
                <div className="bg-gradient-to-br from-orange-500/5 to-red-500/5 rounded-lg p-6 border border-orange-500/20">
                  <h3 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
                    <Icon icon="SvgQuestionCircle" className="w-5 h-5 text-orange-500" />
                    Requirements
                  </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg">
                      <Icon icon="SvgCircledCheckmark" className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-fg-primary">Open Source Code</p>
                        <p className="text-fg-secondary">All code must be publicly available on GitHub</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg">
                      <Icon icon="SvgCircledCheckmark" className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-fg-primary">Product Hosting</p>
                        <p className="text-fg-secondary">Deploy and maintain V1 on production servers</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg">
                      <Icon icon="SvgCircledCheckmark" className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-fg-primary">Ongoing Support</p>
                        <p className="text-fg-secondary">Provide initial maintenance and bug fixes</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-bg-primary rounded-lg">
                      <Icon icon="SvgCircledCheckmark" className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-fg-primary">Terms of Use</p>
                        <p className="text-fg-secondary">Accept and agree to the terms and conditions</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-fg-primary/10">
                    <div className="flex items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        id="rulesAccepted"
                        checked={rulesAccepted}
                        onChange={(e) => setRulesAccepted(e.target.checked)}
                        className="w-5 h-5 text-brand-primary bg-bg-secondary border-fg-primary/20 rounded focus:ring-brand-primary"
                      />
                      <label htmlFor="rulesAccepted" className="text-sm font-medium text-fg-primary">
                        I accept and agree to follow all requirements
                      </label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="termsOfUseAccepted"
                        checked={termsOfUseAccepted}
                        onChange={(e) => setTermsOfUseAccepted(e.target.checked)}
                        className="w-5 h-5 text-brand-primary bg-bg-secondary border-fg-primary/20 rounded focus:ring-brand-primary"
                      />
                      <label htmlFor="termsOfUseAccepted" className="text-sm font-medium text-fg-primary">
                        I accept and agree to the{' '}
                        <a 
                          href={ROUTES.TERMS_OF_USE} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-primary hover:text-brand-primary/80 underline"
                        >
                          Terms of Use
                        </a>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Estimated Timeline */}
                <div className="bg-bg-secondary rounded-lg p-6 border border-fg-primary/10">
                                      <h3 className="text-lg font-semibold text-fg-primary mb-4 flex items-center gap-2">
                      <Icon icon="SvgLoader" className="w-5 h-5 text-blue-500" />
                      Process Timeline
                    </h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Review Period:</span>
                      <span className="text-fg-primary font-medium">3-5 days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Response Time:</span>
                      <span className="text-fg-primary font-medium">7 days max</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-fg-secondary">Project Start:</span>
                      <span className="text-fg-primary font-medium">Within 2 weeks</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-fg-primary/10 pt-6 mt-6 flex-shrink-0 mx-6 mb-6">
            <div className="flex flex-col sm:flex-row gap-3 mx-auto max-w-6xl">
              <Button
                onClick={handleModalClose}
                color="secondary"
                className="sm:w-auto"
                size="lg"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitApplication}
                className="flex-1 bg-gradient-to-r from-brand-primary to-brand-secondary hover:from-brand-primary/90 hover:to-brand-secondary/90 text-white font-semibold"
                disabled={isSubmitting || !rulesAccepted || !termsOfUseAccepted}
                size="lg"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Submitting Application...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Icon icon="SvgArrowRight" className="w-4 h-4" />
                    Submit Application
                  </div>
                )}
              </Button>
            </div>
            <p className="text-xs text-fg-secondary mt-3 text-center">
              By submitting this application, you agree to our terms and the DAO&apos;s specific requirements.
            </p>
          </div>
        </div>
      </SimpleModal>
    </div>
  )
}

export default Apply 