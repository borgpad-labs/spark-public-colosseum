import { ScrollRestoration, useNavigate } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { Button } from "@/components/Button/Button"
import { Input } from "@/components/Input/Input"
import { Icon } from "@/components/Icon/Icon"
import Text from "@/components/Text"
import Img from "@/components/Image/Img"
import { useState, useEffect } from 'react';
import { ROUTES } from "@/utils/routes"
import { useQuery } from "@tanstack/react-query"
import { backendSparkApi } from "@/data/api/backendSparkApi"
import { TokenModel, GetTokensResponse } from "shared/models"

const Search = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch all tokens when there's a search query
  const { data: tokensResponse, isLoading, error } = useQuery({
    queryKey: ['searchTokens', debouncedQuery],
    queryFn: () => backendSparkApi.getTokens({
      isGraduated: "all"
    }),
    enabled: debouncedQuery.length > 0,
  });

  // Filter tokens based on search query
  const filteredTokens = tokensResponse?.tokens?.filter(token =>
    token.name.toLowerCase().includes(debouncedQuery.toLowerCase()) ||
    token.mint.toLowerCase().includes(debouncedQuery.toLowerCase())
  ) || [];

  const handleTokenClick = (tokenMint: string) => {
    navigate(`${ROUTES.PROJECTS}/${tokenMint}`, { state: { from: ROUTES.SEARCH } });
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
  };

  return (
    <main className="relative z-[10] flex min-h-screen w-full max-w-[100vw] flex-col bg-accent font-normal text-fg-primary">
      {/* Header with back button */}
      <div className="absolute left-4 top-4 z-50">
        <Button
          onClick={() => navigate(ROUTES.PROJECTS)}
          size="lg"
          className="bg-brand-primary hover:bg-brand-primary/80"
        >
          <Icon icon="SvgArrowLeft" className="text-xl text-fg-primary" />
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 px-4 py-20 md:px-8">
        <div className="mx-auto max-w-4xl">
          {/* Search Header */}
          <div className="text-center mb-12">
            <Text
              text="Search Tokens"
              as="h1"
              className="text-[40px] font-medium leading-[48px] tracking-[-0.4px] md:text-[68px] md:leading-[74px] mb-4 text-brand-primary"
            />
            <Text
              text="Find tokens to explore and invest in"
              as="h2"
              className="text-xl md:text-2xl opacity-75"
            />
          </div>

          {/* Search Input */}
          <div className="mb-8">
            <div className="relative">
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                type="text"
                placeholder="Search by token name or mint address..."
                className="w-full pl-12 pr-12 py-4 text-lg"
              />
              <Icon 
                icon="SvgLoupe" 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-xl text-fg-secondary" 
              />
              {searchQuery && (
                <Button
                  onClick={handleClearSearch}
                  size="sm"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-transparent hover:bg-bg-primary text-fg-secondary"
                >
                  <Icon icon="SvgClose" className="text-lg" />
                </Button>
              )}
            </div>
          </div>

          {/* Search Results */}
          <div>
            {/* Loading State */}
            {isLoading && debouncedQuery && (
              <div className="text-center py-12">
                <Icon icon="SvgLoader" className="text-2xl text-brand-primary animate-spin mx-auto mb-4" />
                <Text text="Searching tokens..." as="p" className="text-lg opacity-75" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="text-center py-12">
                <Text text="Failed to search tokens" as="p" className="text-lg text-red-400" />
              </div>
            )}

            {/* No Query State */}
            {!debouncedQuery && (
              <div className="text-center py-12">
                <Icon icon="SvgLoupe" className="text-4xl text-fg-secondary mx-auto mb-4" />
                <Text text="Enter a search term to find tokens" as="p" className="text-lg opacity-75" />
              </div>
            )}

            {/* No Results State */}
            {debouncedQuery && !isLoading && filteredTokens.length === 0 && (
              <div className="text-center py-12">
                <Icon icon="SvgDocument" className="text-4xl text-fg-secondary mx-auto mb-4" />
                <Text text={`No tokens found for "${debouncedQuery}"`} as="p" className="text-lg opacity-75" />
                <Text text="Try searching with different keywords" as="p" className="text-sm opacity-50 mt-2" />
              </div>
            )}

            {/* Results Grid */}
            {filteredTokens.length > 0 && (
              <>
                <div className="mb-6">
                  <Text 
                    text={`Found ${filteredTokens.length} token${filteredTokens.length !== 1 ? 's' : ''}`} 
                    as="p" 
                    className="text-sm opacity-75" 
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTokens.map((token) => (
                    <div
                      key={token.mint}
                      onClick={() => handleTokenClick(token.mint)}
                      className="bg-bg-secondary rounded-xl p-6 border border-border-primary/20 hover:border-brand-primary/40 transition-all duration-200 cursor-pointer hover:shadow-lg hover:shadow-brand-primary/10"
                    >
                      {/* Token Image */}
                      <div className="mb-4">
                        {token.imageUrl ? (
                          <Img
                            src={token.imageUrl}
                            imgClassName="w-full h-32 object-cover rounded-lg"
                            alt={token.name}
                          />
                        ) : (
                          <div className="w-full h-32 bg-gradient-to-br from-brand-primary/20 to-brand-primary/10 rounded-lg flex items-center justify-center">
                            <Text
                              text={token.name.slice(0, 2).toUpperCase()}
                              as="span"
                              className="text-3xl font-bold text-brand-primary"
                            />
                          </div>
                        )}
                      </div>

                      {/* Token Info */}
                      <div className="space-y-3">
                        <div>
                          <Text
                            text={token.name}
                            as="h3"
                            className="text-lg font-semibold line-clamp-1"
                          />
                          <Text
                            text={`${token.mint.slice(0, 8)}...${token.mint.slice(-8)}`}
                            as="p"
                            className="text-sm opacity-75 font-mono mt-1"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Text
                              text={token.dao && token.dao !== "" ? "Has DAO" : "No DAO"}
                              as="span"
                              className={twMerge(
                                "text-xs px-2 py-1 rounded-full",
                                token.dao && token.dao !== "" 
                                  ? "bg-green-500/20 text-green-400" 
                                  : "bg-brand-primary/20 text-brand-primary"
                              )}
                            />
                            {token.dao && token.dao !== "" && (
                              <Text
                                text="Available for Apps"
                                as="span"
                                className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full"
                              />
                            )}
                          </div>
                          <Icon icon="SvgArrowRight" className="text-lg text-brand-primary" />
                        </div>

                        {/* Mint Address (truncated) */}
                        <div className="pt-2 border-t border-border-primary/10">
                          <Text
                            text="Token Address"
                            as="span"
                            className="text-xs font-medium opacity-50"
                          />
                          <Text
                            text={token.mint}
                            as="p"
                            className="text-xs font-mono opacity-75 truncate"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <ScrollRestoration />
    </main>
  )
}

export default Search
