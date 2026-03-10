import { ScrollRestoration, useNavigate } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { Icon } from "@/components/Icon/Icon"
import { useState, useEffect } from 'react';
import { ROUTES } from "@/utils/routes"
import { useQuery } from "@tanstack/react-query"
import { GetTokenMarketResponse, GetTokensResponse, TokenModel, TokenMarketData } from "shared/models"
import { backendSparkApi } from "@/data/api/backendSparkApi"
import Img from "@/components/Image/Img"
import logoSvg from "@/assets/logos/logo.svg"
import { useDeviceDetection } from "@/hooks/useDeviceDetection"
import { ConnectButton } from "@/components/Header/ConnectButton"
import SparkCard from "@/components/SparkLanding/SparkCard"
import SparkButton from "@/components/SparkLanding/SparkButton"
import { motion } from "framer-motion"

// Fetch fallback chart data when backend data is not available
const fetchFallbackChartData = async (tokenAddress: string): Promise<TokenMarketData | null> => {
  if (!tokenAddress) return null

  try {
    // Try DexScreener API first (free and reliable)
    const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    const dexResponse = await fetch(dexScreenerUrl)

    if (dexResponse.ok) {
      const dexData = await dexResponse.json()

      if (dexData.pairs && dexData.pairs.length > 0) {
        // Get the pair with highest liquidity (most reliable)
        const bestPair = dexData.pairs.reduce((prev: Record<string, unknown>, current: Record<string, unknown>) =>
          ((current.liquidity as Record<string, number>)?.usd || 0) > ((prev.liquidity as Record<string, number>)?.usd || 0) ? current : prev
        )

        if (bestPair) {
          // Create chart data structure similar to backend format
          const chartData: TokenMarketData = {
            address: tokenAddress,
            name: bestPair.baseToken?.name || "Unknown",
            symbol: bestPair.baseToken?.symbol || "UNKNOWN",
            price: parseFloat(bestPair.priceUsd || "0"),
            priceChange24h: parseFloat(bestPair.priceChange?.h24 || "0"),
            marketCap: bestPair.marketCap || 0,
            volume24h: parseFloat(bestPair.volume?.h24 || "0"),
            liquidity: parseFloat(bestPair.liquidity?.usd || "0"),
            fdv: bestPair.fdv || 0,
            priceChart: [],
            lastUpdated: new Date().toISOString()
          }

          return chartData
        }
      }
    }
  } catch (error) {
    console.warn("Failed to fetch fallback data from DexScreener:", error)
  }

  return null
}

// Helper component to fetch and display market data for a single token
const TokenCard = ({ token, isLoading }: { token: TokenModel, isLoading: boolean }) => {
  const [fallbackData, setFallbackData] = useState<TokenMarketData | null>(null)

  const { data: marketData, isLoading: marketLoading, error: marketError } = useQuery<GetTokenMarketResponse>({
    queryFn: () =>
      backendSparkApi.getTokenMarket({
        address: token.mint,
      }),
    queryKey: ["getTokenMarket", token.mint],
    enabled: Boolean(token.mint),
  })

  // Fetch fallback data when backend data is incomplete
  useEffect(() => {
    const loadFallbackData = async () => {
      if (token.mint && !marketLoading) {
        // Check if we should use fallback data
        const shouldUseFallback =
          marketError || // Backend error
          (marketData?.tokenMarketData && (
            !marketData.tokenMarketData.priceChart ||
            marketData.tokenMarketData.priceChart.length === 0 ||
            (marketData.tokenMarketData.price === 0 && marketData.tokenMarketData.marketCap === 0)
          ))

        if (shouldUseFallback) {
          const fallbackChartData = await fetchFallbackChartData(token.mint)
          setFallbackData(fallbackChartData)
        } else {
          setFallbackData(null)
        }
      }
    }

    loadFallbackData()
  }, [token.mint, marketError, marketLoading, marketData])

  const navigate = useNavigate()
  const { isDesktop } = useDeviceDetection()

  // Use fallback data if available, otherwise use market data
  const effectiveMarketData = fallbackData || marketData?.tokenMarketData

  const marketCap = effectiveMarketData?.marketCap
    ? effectiveMarketData.marketCap >= 1_000_000
      ? `$${(effectiveMarketData.marketCap / 1_000_000).toFixed(2)}M`
      : effectiveMarketData.marketCap >= 1_000
        ? `$${(effectiveMarketData.marketCap / 1_000).toFixed(2)}K`
        : `$${effectiveMarketData.marketCap}`
    : "N/A"
  
  const tokenPrice = effectiveMarketData?.price
    ? `$${effectiveMarketData.price.toFixed(4)}`
    : "N/A"

  return (
    <SparkCard
      variant="glass"
      onClick={() => navigate(`${ROUTES.PROJECTS}/${token.mint}`, { state: { from: ROUTES.DISCOVER } })}
      className="cursor-pointer"
    >
      <div className="flex items-center gap-4">
        <Img
          src={token.imageUrl}
          isFetchingLink={isLoading}
          customClass={`${isDesktop ? 'w-20 h-20' : 'w-16 h-16'} aspect-square`}
          imgClassName="rounded-full object-cover w-full h-full"
          isRounded={true}
          size="custom"
        />
        <div className="flex-1">
          <h4 className={`font-semibold ${isDesktop ? 'text-lg' : 'font-medium'}`}>{token.name}</h4>
          <div className={`flex gap-4 opacity-75 ${isDesktop ? 'text-base' : 'text-sm'}`}>
            <span>Market Cap: {marketCap}</span>
            <span>Token Price: {tokenPrice}</span>
          </div>
        </div>
      </div>
    </SparkCard>
  )
}

const Discover = () => {
  const { data: sparksData, isLoading: sparksLoading } = useQuery<GetTokensResponse>({
    queryFn: () =>
      backendSparkApi.getTokens({
        isGraduated: "false",
      }),
    queryKey: ["getTokens", "isGraduated", "false"],
  })
  const { data: blazesData, isLoading: blazesLoading } = useQuery<GetTokensResponse>({
    queryFn: () =>
      backendSparkApi.getTokens({
        isGraduated: "true",
      }),
    queryKey: ["getTokens", "isGraduated", "true"],
  })
  
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('sparks');
  const { isDesktop } = useDeviceDetection();

  return (
    <main className="relative z-[10] flex min-h-screen w-full max-w-[100vw] flex-col items-center font-normal">
      <div className="absolute left-4 top-2 z-50">
        <SparkButton
          onClick={() => {
            navigate(ROUTES.PROFILE, { state: { from: ROUTES.DISCOVER } })
          }}
          size="md"
          variant="secondary"
          icon={<Icon icon="SvgGear" className="text-xl" />}
        />
      </div>
      <div className="absolute right-4 top-2 z-50">
        <ConnectButton 
          size="lg"
          color="primary"
          btnClassName="shiny-button bg-gradient-to-r from-[#F29F04] to-[#F25C05] text-white font-satoshi font-semibold px-6 py-3 rounded-full hover:scale-105 transition-all duration-300"
        />
      </div>
      <motion.section 
        className={`z-[1] flex h-full w-full flex-1 flex-col items-center justify-between px-5 pb-[60px] pt-10 md:pb-[56px] md:pt-[40px] ${isDesktop ? 'max-w-[1400px]' : ''}`}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        <div className="flex w-full flex-col items-center">
          <Img
            src={logoSvg}
            size="custom"
            customClass={`w-full object-cover rounded-lg ${isDesktop ? 'max-w-[1200px] h-[300px]' : 'max-w-[400px] h-[130px]'}`}
            imgClassName="object-contain scale-100" // logo even smaller and more zoom
            alt="Discover Banner"
          />

          {/* Mobile Tabs */}
          <div className="flex md:hidden w-full mb-4">
            <button
              className={twMerge(
                "flex-1 py-2 text-sm font-vcr border-b-2 transition-colors uppercase",
                activeTab === 'sparks'
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-fg-secondary"
              )}
              onClick={() => setActiveTab('sparks')}
            >
              Sparks
            </button>
            <button
              className={twMerge(
                "flex-1 py-2 text-sm font-vcr border-b-2 transition-colors uppercase",
                activeTab === 'blazes'
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-fg-secondary"
              )}
              onClick={() => setActiveTab('blazes')}
            >
              Blazes
            </button>
          </div>

          {/* Content for Mobile Tabs */}
          <div className="md:hidden w-full mt-4">
            {activeTab === 'sparks' ? (
              <div className="overflow-hidden">
                <div className="w-full">
                  <h3 className="text-2xl font-medium mb-6">Sparks</h3>
                  <div className="grid gap-6">
                    {(sparksData?.tokens || []).map((token) => (
                      <TokenCard key={token.mint} token={token} isLoading={sparksLoading} />
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden">
                <div className="w-full">
                  <h3 className="text-2xl font-medium mb-6">Blazes</h3>
                  <div className="grid gap-6">
                    {(blazesData?.tokens || []).map((token) => (
                      <TokenCard key={token.mint} token={token} isLoading={blazesLoading} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Layout */}
          <div className="hidden md:flex w-full gap-8">
            {/* Sparks Section */}
            <div className="w-full">
              <h3 className={`font-medium mb-6 ${isDesktop ? 'text-3xl' : 'text-2xl'}`}>Sparks</h3>
              <div className="grid gap-6 grid-cols-1">
                {(sparksData?.tokens || []).map((token) => (
                  <TokenCard key={token.mint} token={token} isLoading={sparksLoading} />
                ))}
              </div>
            </div>

            {/* Blazes Section */}
            <div className="w-full">
              <h3 className={`font-medium mb-6 ${isDesktop ? 'text-3xl' : 'text-2xl'}`}>Blazes</h3>
              <div className="grid gap-6 grid-cols-1">
                {(blazesData?.tokens || []).map((token) => (
                  <TokenCard key={token.mint} token={token} isLoading={blazesLoading} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.section>
      <ScrollRestoration />
    </main>
  )
}

export default Discover 