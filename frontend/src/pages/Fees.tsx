import { useNavigate } from "react-router-dom"
import { Button } from "@/components/Button/Button"
import { Icon } from "@/components/Icon/Icon"
import { useState, useEffect } from 'react'
import { ROUTES } from "@/utils/routes"
import { useDeviceDetection } from "@/hooks/useDeviceDetection"
import { backendSparkApi, GetTotalFeesResponse, GetCreatorsResponse } from "@/data/api/backendSparkApi"
import { GetTokensResponse } from "../../shared/models"

const Fees = () => {
  const navigate = useNavigate()
  const { isDesktop } = useDeviceDetection()
  
  // State for fees data
  const [totalFeesData, setTotalFeesData] = useState<GetTotalFeesResponse | null>(null)
  const [tokensData, setTokensData] = useState<GetTokensResponse | null>(null)
  const [creatorsData, setCreatorsData] = useState<GetCreatorsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch all project data
  const fetchAllProjectData = async () => {
    setIsLoading(true)
    try {
      // Fetch graduated tokens (projects that have generated fees) ordered by fees_claimed descending
      const tokensResponse = await backendSparkApi.getTokens({ 
        isGraduated: "true",
        orderBy: "fees_claimed",
        orderDirection: "desc"
      })
      setTokensData(tokensResponse)
      
      // Log the response for debugging
      console.log("=== TOKENS API RESPONSE ===")
      console.log("Total tokens:", tokensResponse.tokens.length)
      console.log("First 3 tokens:", tokensResponse.tokens.slice(0, 3).map(t => ({
        name: t.name,
        mint: t.mint,
        fees_claimed: t.fees_claimed,
        fees_claimed_type: typeof t.fees_claimed,
        dao: t.dao
      })))
      
      // Log the raw token data to see the structure
      console.log("=== RAW TOKEN DATA ===")
      console.log("Sample token:", tokensResponse.tokens[0])

      // Fetch creators data to get fee information
      const creatorsResponse = await backendSparkApi.getCreators()
      setCreatorsData(creatorsResponse)

      // Calculate total fees from tokens data (which already has fees_claimed)
      const totalFeesEarned = tokensResponse.tokens.reduce((total, token) => {
        const feeAmount = parseFeeAmount(token.fees_claimed)
        console.log(`Token ${token.name}: fees_claimed = ${token.fees_claimed}, parsed = ${feeAmount} SOL`)
        return total + feeAmount
      }, 0)
      
      console.log("=== FEE CALCULATIONS ===")
      console.log("Total fees earned:", totalFeesEarned)

      // Calculate total claimed fees from actual user_fees_claimed values
      const totalFeesClaimed = tokensResponse.tokens.reduce((total, token) => {
        const claimedAmount = parseFeeAmount(token.user_fees_claimed || 0)
        console.log(`Token ${token.name}: user_fees_claimed = ${token.user_fees_claimed}, parsed = ${claimedAmount} SOL`)
        return total + claimedAmount
      }, 0)
      
      // Calculate available fees (total earned - total claimed)
      const availableToClaim = totalFeesEarned - totalFeesClaimed
      
      console.log("=== FEE CALCULATIONS ===")
      console.log("Total fees earned:", totalFeesEarned, "SOL")
      console.log("Total fees claimed:", totalFeesClaimed, "SOL")
      console.log("Available to claim:", availableToClaim, "SOL")

      // Create a comprehensive fees overview
      const feesOverview = {
        success: true,
        totalFeesEarned,
        totalFeesClaimed,
        availableToClaim,
        tokenBreakdown: tokensResponse.tokens.map(token => {
          // Use the fees_claimed directly from the token
          const feesEarned = parseFeeAmount(token.fees_claimed)
          // Use user_fees_claimed if available, otherwise 0
          const userFeesClaimed = parseFeeAmount(token.user_fees_claimed || 0)
          console.log(`Mapping token ${token.name}: fees_claimed = ${token.fees_claimed}, feesEarned = ${feesEarned} SOL, userFeesClaimed = ${userFeesClaimed} SOL`)
          
          return {
            tokenName: token.name,
            tokenMint: token.mint,
            feesEarned,
            userFeesClaimed,
          }
        }).filter(token => token.feesEarned > 0), // Only show tokens with fees
        error: undefined,
        errorName: undefined,
        timestamp: new Date().toISOString()
      }
      
      setTotalFeesData(feesOverview)
      setError(null)
    } catch (error) {
      console.error('Failed to fetch project data:', error)
      setError('Failed to fetch project data. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Fetch data on component mount
  useEffect(() => {
    fetchAllProjectData()
  }, [])



  // Navigate to claim fees page
  const handleClaimFees = () => {
    navigate(ROUTES.CLAIM_FEES)
  }

  // Parse and format fee amounts (handles both lamports and SOL)
  const parseFeeAmount = (feeValue: any): number => {
    if (feeValue === null || feeValue === undefined || feeValue === '') {
      return 0
    }
    
    const numValue = parseFloat(feeValue)
    if (isNaN(numValue)) {
      return 0
    }
    
    // If the value is very large (> 1000), assume it's in lamports and convert to SOL
    // If it's small (< 1000), assume it's already in SOL
    if (numValue > 1000) {
      return numValue / 1e9 // Convert lamports to SOL
    } else {
      return numValue // Already in SOL
    }
  }

  // Format SOL amount
  const formatSol = (solAmount: number) => {
    return solAmount.toFixed(4)
  }

  // Sort projects by fees earned (descending)
  const sortedProjects = totalFeesData?.tokenBreakdown
    ? [...totalFeesData.tokenBreakdown].sort((a, b) => b.feesEarned - a.feesEarned)
    : []

  return (
    <div className="min-h-screen bg-accent">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-fg-primary">Fees Overview</h1>
          <p className="text-sm text-fg-secondary">View fees generated by all projects</p>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Fees Overview */}
        {totalFeesData && (
          <>
            {/* Total Fees Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-fg-secondary mb-2">Total Fees Earned</h3>
                <p className="text-3xl font-bold text-brand-primary">
                  {formatSol(totalFeesData.totalFeesEarned)} SOL
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-fg-secondary mb-2">Total Fees Claimed</h3>
                <p className="text-3xl font-bold text-green-500">
                  {formatSol(totalFeesData.totalFeesClaimed)} SOL
                </p>
              </div>
              
              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-fg-secondary mb-2">Available to Claim</h3>
                <p className="text-3xl font-bold text-orange-500">
                  {formatSol(totalFeesData.availableToClaim)} SOL
                </p>
              </div>

              <div className="bg-card border border-border rounded-lg p-6">
                <h3 className="text-lg font-medium text-fg-secondary mb-2">Active Projects</h3>
                <p className="text-3xl font-bold text-blue-500">
                  {tokensData?.tokens.length || 0}
                </p>
                <p className="text-sm text-fg-secondary mt-1">
                  {creatorsData?.creators.length || 0} creators
                </p>
              </div>
            </div>

                        {/* Navigation to Claim Fees */}
            <div className="text-center mb-8">
              <p className="text-fg-secondary mb-4">
                Ready to claim your fees? Visit the Claim Fees page to withdraw your earnings.
              </p>
              <Button
                onClick={handleClaimFees}
                className="bg-brand-primary hover:bg-brand-primary/80 text-white px-6 py-3 rounded-lg"
              >
                <Icon icon="SvgWalletFilled" className="mr-2" />
                Go to Claim Fees
              </Button>
            </div>

            {/* Projects by Fees */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-fg-primary mb-6">
                Project Fee Breakdown
              </h2>
              <p className="text-fg-secondary mb-6">
                See how much fees each of your projects has generated
              </p>
              
              {sortedProjects.length > 0 ? (
                <div className="space-y-4">
                  {sortedProjects.map((project, index) => (
                    <div
                      key={project.tokenMint}
                      className="flex items-center justify-between p-4 bg-background rounded-lg border border-border"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-8 h-8 bg-brand-primary rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-medium text-fg-primary">{project.tokenName}</h3>
                          <p className="text-sm text-fg-secondary font-mono">
                            {project.tokenMint.slice(0, 8)}...{project.tokenMint.slice(-8)}
                          </p>
                          {/* Show additional project info if available */}
                          {tokensData && (() => {
                            const tokenInfo = tokensData.tokens.find((t: GetTokensResponse['tokens'][0]) => t.mint === project.tokenMint)
                            return tokenInfo ? (
                              <div className="flex gap-2 mt-1">
                                {tokenInfo.dao && (
                                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                    DAO
                                  </span>
                                )}
                                {tokenInfo.damm_pool_address && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                    DAMM V2
                                  </span>
                                )}
                              </div>
                            ) : null
                          })()}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-lg font-semibold text-brand-primary">
                          {formatSol(project.feesEarned)} SOL
                        </p>
                        <p className="text-sm text-fg-secondary">
                          Claimed: {formatSol(project.userFeesClaimed)} SOL
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-fg-secondary">No projects found</p>
                </div>
              )}
            </div>

            {/* Refresh Button */}
            <div className="text-center mt-8">
              <Button
                onClick={fetchAllProjectData}
                disabled={isLoading}
                className="bg-border hover:bg-border/80 text-fg-primary px-6 py-3 rounded-lg"
              >
                {isLoading ? (
                  <>
                    <Icon icon="SvgLoader" className="animate-spin mr-2" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <Icon icon="SvgGear" className="mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <Button
                onClick={fetchAllProjectData}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Try Again
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <Icon icon="SvgLoader" className="animate-spin text-4xl text-brand-primary mx-auto mb-4" />
            <p className="text-fg-secondary">Loading project fees data...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Fees
