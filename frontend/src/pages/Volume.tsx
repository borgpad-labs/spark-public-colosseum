import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { backendSparkApi } from '../data/api/backendSparkApi'
import { formatCompactNumber } from 'shared/utils/format'
import { useVolumeCache } from '../hooks/useVolumeCache'
import { ROUTES } from '../utils/routes'

interface TokenData {
  mint: string
  name: string
  imageUrl?: string
  volume24h: number
  price: number
  marketCap: number
}

const Volume: React.FC = () => {
  const [tokens, setTokens] = useState<TokenData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const { getCachedData, setCachedData } = useVolumeCache()

  const fetchTokensAndVolume = async () => {
    try {
      setError(null)
      
      // Check cache first
      const cacheKey = 'volume_overview'
      const cachedData = getCachedData(cacheKey)
      if (cachedData) {
        setTokens(cachedData)
        setLoading(false)
        return
      }

      // Fetch all tokens
      const tokensResponse = await backendSparkApi.getTokens({ isGraduated: 'all' })
      
      // Fetch market data for each token
      const tokensWithVolume: TokenData[] = []
      
      for (const token of tokensResponse.tokens) {
        try {
          console.log(`[Volume] Fetching market data for ${token.name} (${token.mint})`)
          const marketResponse = await backendSparkApi.getTokenMarket({ address: token.mint })
          console.log(`[Volume] Market response for ${token.name}:`, marketResponse)
          
          tokensWithVolume.push({
            mint: token.mint,
            name: token.name,
            imageUrl: token.imageUrl,
            volume24h: marketResponse.tokenMarketData.volume24h || 0,
            price: marketResponse.tokenMarketData.price || 0,
            marketCap: marketResponse.tokenMarketData.marketCap || 0
          })
        } catch (error) {
          console.error(`Failed to fetch market data for ${token.name}:`, error)
          // Add token with zero values if market data fails
          tokensWithVolume.push({
            mint: token.mint,
            name: token.name,
            imageUrl: token.imageUrl,
            volume24h: 0,
            price: 0,
            marketCap: 0
          })
        }
      }

      // Sort by volume (highest first)
      tokensWithVolume.sort((a, b) => b.volume24h - a.volume24h)
      
      setTokens(tokensWithVolume)
      
      // Cache the data for 5 minutes
      setCachedData(cacheKey, tokensWithVolume, 5 * 60 * 1000)
      
    } catch (error) {
      console.error('Error fetching tokens:', error)
      setError('Failed to load token data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTokensAndVolume()
  }, [])

  const handleTokenClick = (tokenMint: string) => {
    navigate(`${ROUTES.VOLUME_TOKEN.replace(':token', tokenMint)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-orange-400 text-xl">Loading token volumes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-xl mb-4">{error}</p>
          <button
            onClick={fetchTokensAndVolume}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-8 py-12 max-w-7xl">
        <div className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-6xl font-bold text-orange-400 mb-4">Token Volume Overview</h1>
            <p className="text-gray-300 text-xl">Real-time trading volume for all tokens</p>
          </div>
          <button
            onClick={() => {
              setLoading(true)
              const cacheKey = 'volume_overview'
              setCachedData(cacheKey, null, 0) // Expire immediately
              fetchTokensAndVolume()
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Refresh Data
          </button>
        </div>

        <div className="grid gap-6">
          {tokens.map((token) => (
            <div
              key={token.mint}
              onClick={() => handleTokenClick(token.mint)}
              className="bg-gray-900 rounded-xl p-8 border border-orange-500/30 hover:border-orange-500/60 transition-all cursor-pointer hover:bg-gray-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-6">
                  {token.imageUrl && (
                    <img
                      src={token.imageUrl}
                      alt={token.name}
                      className="w-16 h-16 rounded-full"
                    />
                  )}
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-2">{token.name}</h2>
                    <p className="text-gray-400 text-lg">${token.price.toFixed(6)}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-400">
                    ${formatCompactNumber(token.volume24h)}
                  </div>
                  <div className="text-lg font-semibold text-white">
                    ${formatCompactNumber(token.marketCap)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {tokens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">No tokens found</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Volume 