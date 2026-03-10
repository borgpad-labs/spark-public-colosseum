import { ScrollRestoration, useNavigate, useLocation } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/Button/Button"
import { Input } from "@/components/Input/Input"
import { Icon } from "@/components/Icon/Icon"
import { useLoginWithEmail } from '@privy-io/react-auth';
import { useState } from 'react';
import { ROUTES } from "@/utils/routes"
import { useQuery } from "@tanstack/react-query"
import { GetTokenMarketResponse, GetTokensResponse, TokenModel } from "shared/models"
import { backendSparkApi } from "@/data/api/backendSparkApi"
import Img from "@/components/Image/Img"
import logoSvg from "@/assets/logos/logo.svg"
import { useDeviceDetection } from "@/hooks/useDeviceDetection"

// Helper component to fetch and display market data for a single token
const TokenCard = ({ token, isLoading }: { token: TokenModel, isLoading: boolean }) => {
  const { data: marketData } = useQuery<GetTokenMarketResponse>({
    queryFn: () =>
      backendSparkApi.getTokenMarket({
        address: token.mint,
      }),
    queryKey: ["getTokenMarket", token.mint],
    enabled: Boolean(token.mint),
  })

  const navigate = useNavigate()
  const { isDesktop } = useDeviceDetection()

  const marketCap = marketData?.tokenMarketData?.marketCap
    ? marketData.tokenMarketData.marketCap >= 1_000_000
      ? `$${(marketData.tokenMarketData.marketCap / 1_000_000).toFixed(2)}M`
      : marketData.tokenMarketData.marketCap >= 1_000
        ? `$${(marketData.tokenMarketData.marketCap / 1_000).toFixed(2)}K`
        : `$${marketData.tokenMarketData.marketCap}`
    : "N/A"
  
  const tokenPrice = marketData?.tokenMarketData?.price
    ? `$${marketData.tokenMarketData.price.toFixed(4)}`
    : "N/A"

  return (
    <div 
      className={`flex items-center gap-4 p-6 bg-secondary rounded-xl cursor-pointer hover:bg-secondary/80 transition-all hover:scale-[1.02] ${isDesktop ? 'shadow-lg' : ''}`}
      onClick={() => navigate(`${ROUTES.PROJECTS}/${token.mint}`, { state: { from: ROUTES.PROJECTS } })}
    >
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
  )
}

const Projects = () => {
  const { data: sparksData, isLoading: sparksLoading, refetch: sparksRefetch } = useQuery<GetTokensResponse>({
    queryFn: () =>
      backendSparkApi.getTokens({
        isGraduated: "false",
      }),
    queryKey: ["getTokens", "isGraduated", "false"],
  })
  const { data: blazesData, isLoading: blazesLoading, refetch: blazesRefetch } = useQuery<GetTokensResponse>({
    queryFn: () =>
      backendSparkApi.getTokens({
        isGraduated: "true",
      }),
    queryKey: ["getTokens", "isGraduated", "true"],
  })

  console.log(sparksData)
  console.log(blazesData)
  
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('sparks');
  const { isDesktop, isMobile } = useDeviceDetection();

  // Get the referrer from URL state or default to discover
  const getBackRoute = () => {
    const state = location.state as { from?: string } | null
    return state?.from || ROUTES.DISCOVER
  }

  return (
    <main className="relative z-[10] flex min-h-screen w-full max-w-[100vw] flex-col items-center pt-[48px] font-normal lg:pt-[72px]">
      <div className="absolute left-4 top-2 z-50">
        <Button
          onClick={() => navigate(getBackRoute())}
          size="lg"
          className="bg-brand-primary hover:bg-brand-primary/80"
        >
          <Icon icon="SvgArrowLeft" className="text-xl text-fg-primary" />
        </Button>
      </div>
      <div className="absolute right-4 top-4 z-50">
        <Button
          onClick={() => {
            navigate(ROUTES.SEARCH)
          }}
          size="lg"
          className="flex-1 bg-brand-primary hover:bg-brand-primary/80"
        >
          <Icon icon="SvgLoupe" className="text-xl text-fg-primary" />
        </Button>
      </div>
      <section className={`z-[1] flex h-full w-full flex-1 flex-col items-center justify-between px-5 pb-[60px] pt-10 md:pb-[56px] md:pt-[40px] ${isDesktop ? 'max-w-[1400px]' : ''}`}>
        <div className="flex w-full flex-col items-center">
          <h2 className={`font-medium tracking-[-0.4px] mb-4 font-satoshi ${isDesktop ? 'text-[56px] leading-[60px]' : 'text-[40px] leading-[48px] md:text-[68px] md:leading-[74px]'}`}>
            <span className="bg-gradient-to-r from-[#F29F04] to-[#F25C05] bg-clip-text text-transparent">Explore</span>
          </h2>

          <Img
            src={logoSvg}
            size="custom"
            customClass={`w-full object-cover rounded-lg ${isDesktop ? 'max-w-[1200px] h-[300px]' : 'max-w-[400px] h-[130px]'}`}
            imgClassName="object-contain scale-100" // logo even smaller and more zoom
            alt="Explore Banner"
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
              <div className={`grid gap-6 ${isDesktop ? 'grid-cols-1 lg:grid-cols-2' : ''}`}>
                {(sparksData?.tokens || []).map((token) => (
                  <TokenCard key={token.mint} token={token} isLoading={sparksLoading} />
                ))}
              </div>
            </div>

            {/* Blazes Section */}
            <div className="w-full">
              <h3 className={`font-medium mb-6 ${isDesktop ? 'text-3xl' : 'text-2xl'}`}>Blazes</h3>
              <div className="grid gap-6">
                {(blazesData?.tokens || []).map((token) => (
                  <TokenCard key={token.mint} token={token} isLoading={blazesLoading} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
      <ScrollRestoration />
    </main>
  )
}

export default Projects
