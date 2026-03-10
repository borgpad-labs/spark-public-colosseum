import React from 'react';
import { TokenMarketData } from '../../../shared/models';
import Text from '../Text';

interface TokenStatsProps {
  tokenMarketData: TokenMarketData;
  isLoading?: boolean;
  className?: string;
}

const TokenStats: React.FC<TokenStatsProps> = ({ tokenMarketData, isLoading = false, className = "" }) => {
  // Format currency values
  const formatCurrency = (value: number) => {
    if (value === 0) return "N/A";
    
    if (value >= 1e9) {
      return `$${(value / 1e9).toFixed(2)}B`;
    } else if (value >= 1e6) {
      return `$${(value / 1e6).toFixed(2)}M`;
    } else if (value >= 1e3) {
      return `$${(value / 1e3).toFixed(2)}K`;
    } else {
      return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  };

  // Format price based on value
  const formatPrice = (price: number) => {
    if (price === 0) return "N/A";
    
    if (price < 0.001) {
      return `$${price.toExponential(3)}`;
    } else if (price < 1) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1000) {
      return `$${price.toFixed(4)}`;
    } else {
      return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    }
  };

  const formatPercentage = (change: number) => {
    if (change === 0) return "0.00%";
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  const stats = [
    {
      label: "Token Price",
      value: formatPrice(tokenMarketData.price),
      change: formatPercentage(tokenMarketData.priceChange24h),
      isPositive: tokenMarketData.priceChange24h >= 0,
      important: true
    },
    {
      label: "Market Cap",
      value: formatCurrency(tokenMarketData.marketCap),
      description: "Total value of all tokens in circulation"
    },
    {
      label: "Fully Diluted Valuation",
      value: formatCurrency(tokenMarketData.fdv),
      description: "Market cap if all tokens were in circulation"
    },
    {
      label: "24h Volume",
      value: formatCurrency(tokenMarketData.volume24h),
      description: "Total trading volume in the last 24 hours"
    },
    {
      label: "Liquidity",
      value: formatCurrency(tokenMarketData.liquidity),
      description: "Available liquidity in trading pools"
    }
  ];

  return (
    <div className={`w-full bg-bg-secondary rounded-lg p-6 ${className}`}>
      <Text text="Token Statistics" as="h3" className="text-lg font-semibold mb-6" isLoading={isLoading} />
      
      <div className="space-y-4">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className={`flex items-center justify-between p-4 rounded-lg ${
              stat.important ? 'bg-bg-primary/5 border border-fg-primary/10' : 'bg-bg-primary/5'
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Text 
                  text={stat.label} 
                  as="h3" 
                  className="font-medium text-fg-primary" 
                  isLoading={isLoading}
                />
                {stat.description && (
                  <div className="group relative">
                    <svg 
                      className="w-4 h-4 text-fg-primary text-opacity-60 cursor-help" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48 px-3 py-2 text-xs text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                      {stat.description}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="text-right">
              <Text 
                text={stat.value} 
                as="p" 
                className={`font-semibold ${stat.important ? 'text-lg' : ''}`} 
                isLoading={isLoading}
                loadingClass="w-20"
              />
              {stat.change && (
                <Text 
                  text={stat.change} 
                  as="p" 
                  className={`text-sm font-medium ${
                    stat.isPositive ? 'text-green-500' : 'text-red-500'
                  }`}
                  isLoading={isLoading}
                  loadingClass="w-16"
                />
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Last updated timestamp */}
      <div className="mt-6 pt-4 border-t border-fg-primary/10">
        <Text 
          text={`Last updated: ${new Date(tokenMarketData.lastUpdated).toLocaleString()}`}
          as="p" 
          className="text-xs text-fg-primary text-opacity-60"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};

export default TokenStats; 