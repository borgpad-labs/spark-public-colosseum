import React from 'react';
import { TokenMarketData } from '../../../shared/models';

interface TokenChartProps {
  tokenMarketData: TokenMarketData;
  className?: string;
}

const TokenChart: React.FC<TokenChartProps> = ({ tokenMarketData, className = "" }) => {
  const { priceChart, price, priceChange24h } = tokenMarketData;

  if (!priceChart || priceChart.length === 0) {
    return (
      <div className={`w-full h-[300px] flex items-center justify-center bg-bg-secondary rounded-lg ${className}`}>
        <p className="text-fg-primary text-opacity-75">No chart data available</p>
      </div>
    );
  }

  // Calculate min/max for scaling
  const prices = priceChart.map(point => point.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  let priceRange = maxPrice - minPrice;
  
  // Handle case where all prices are the same or very close
  if (priceRange === 0 || priceRange < maxPrice * 0.001) {
    // Create a small range around the price for visualization
    const centerPrice = (minPrice + maxPrice) / 2;
    const artificialRange = centerPrice * 0.05; // 5% range
    priceRange = artificialRange;
  }

  // Chart dimensions
  const width = 600;
  const height = 200;
  const padding = 20;

  // Create SVG path
  const createPath = () => {
    if (priceChart.length < 2) return "";

    const centerPrice = (minPrice + maxPrice) / 2;
    const useArtificialRange = maxPrice - minPrice < maxPrice * 0.001;

    const points = priceChart.map((point, index) => {
      const x = padding + (index / (priceChart.length - 1)) * (width - 2 * padding);
      let y;
      
      if (useArtificialRange) {
        // Center the line and add small variations
        const variation = (point.price - centerPrice) / (centerPrice * 0.05);
        y = height / 2 + variation * (height * 0.2); // Use 20% of height for variations
      } else {
        y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
      }
      
      return `${x},${y}`;
    });

    return `M ${points.join(" L ")}`;
  };

  // Create area path for gradient fill
  const createAreaPath = () => {
    if (priceChart.length < 2) return "";

    const centerPrice = (minPrice + maxPrice) / 2;
    const useArtificialRange = maxPrice - minPrice < maxPrice * 0.001;

    const points = priceChart.map((point, index) => {
      const x = padding + (index / (priceChart.length - 1)) * (width - 2 * padding);
      let y;
      
      if (useArtificialRange) {
        // Center the line and add small variations
        const variation = (point.price - centerPrice) / (centerPrice * 0.05);
        y = height / 2 + variation * (height * 0.2); // Use 20% of height for variations
      } else {
        y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
      }
      
      return `${x},${y}`;
    });

    const firstX = padding;
    const lastX = padding + (width - 2 * padding);
    const bottomY = height - padding;

    return `M ${firstX},${bottomY} L ${points.join(" L ")} L ${lastX},${bottomY} Z`;
  };

  const pathData = createPath();
  const areaPath = createAreaPath();
  const isPositive = priceChange24h >= 0;
  const strokeColor = isPositive ? "#10b981" : "#ef4444"; // green-500 or red-500
  const fillColor = isPositive ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)";

  // Format price for display
  const formatPrice = (price: number) => {
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

  const formatChange = (change: number) => {
    const sign = change >= 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <div className={`w-full bg-bg-secondary rounded-lg p-6 ${className}`}>
      {/* Header with current price and change */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-fg-primary">Price Chart</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-fg-primary">{formatPrice(price)}</div>
            <div className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {formatChange(priceChange24h)} (24h)
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width="100%"
          height="300"
          viewBox={`0 0 ${width} ${height}`}
          className="overflow-visible"
        >
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="50" height="40" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill={fillColor}
              stroke="none"
            />
          )}

          {/* Price line */}
          {pathData && (
            <path
              d={pathData}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm"
            />
          )}

          {/* Price points */}
          {priceChart.map((point, index) => {
            const centerPrice = (minPrice + maxPrice) / 2;
            const useArtificialRange = maxPrice - minPrice < maxPrice * 0.001;
            
            const x = padding + (index / (priceChart.length - 1)) * (width - 2 * padding);
            let y;
            
            if (useArtificialRange) {
              // Center the line and add small variations
              const variation = (point.price - centerPrice) / (centerPrice * 0.05);
              y = height / 2 + variation * (height * 0.2); // Use 20% of height for variations
            } else {
              y = height - padding - ((point.price - minPrice) / priceRange) * (height - 2 * padding);
            }
            
            // Only show every nth point to avoid overcrowding
            if (index % Math.ceil(priceChart.length / 20) === 0 || index === priceChart.length - 1) {
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="3"
                  fill={strokeColor}
                  className="drop-shadow-sm"
                />
              );
            }
            return null;
          })}
        </svg>

        {/* Time labels */}
        <div className="flex justify-between mt-4 text-xs text-fg-primary text-opacity-60">
          <span>7 days ago</span>
          <span>Now</span>
        </div>
      </div>

      {/* Chart statistics */}
      <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-fg-primary/10">
        <div>
          <div className="text-xs text-fg-primary text-opacity-60 mb-1">High (7d)</div>
          <div className="font-semibold text-fg-primary">{formatPrice(maxPrice)}</div>
        </div>
        <div>
          <div className="text-xs text-fg-primary text-opacity-60 mb-1">Low (7d)</div>
          <div className="font-semibold text-fg-primary">{formatPrice(minPrice)}</div>
        </div>
      </div>
    </div>
  );
};

export default TokenChart; 