import React from 'react'
import { formatCompactNumber } from 'shared/utils/format'

interface VolumeDataPoint {
  timestamp: number
  volume: number
  price: number
  trades: number
}

interface VolumeChartProps {
  data: VolumeDataPoint[]
  timeFrame: string
}

const VolumeChart: React.FC<VolumeChartProps> = ({ data, timeFrame }) => {
  if (!data || data.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-8 border border-orange-500/30">
        <h3 className="text-2xl font-bold text-orange-400 mb-4">Volume Chart</h3>
        <p className="text-gray-400">No volume data available</p>
      </div>
    )
  }

  // Calculate statistics
  const volumes = data.map(d => d.volume)
  const maxVolume = Math.max(...volumes)
  const minVolume = Math.min(...volumes)
  const avgVolume = volumes.reduce((sum, vol) => sum + vol, 0) / volumes.length
  const totalVolume = volumes.reduce((sum, vol) => sum + vol, 0)

  // Format time labels based on timeFrame
  const formatTimeLabel = (timestamp: number) => {
    const date = new Date(timestamp)
    if (timeFrame === '24h') {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      })
    } else if (timeFrame === '7d') {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      })
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        hour12: false
      })
    }
  }

  return (
    <div className="bg-gray-900 rounded-xl p-8 border border-orange-500/30">
      <h3 className="text-2xl font-bold text-orange-400 mb-6">Volume Chart ({timeFrame})</h3>
      
      <div className="mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">
              ${formatCompactNumber(maxVolume)}
            </div>
            <div className="text-gray-400">Peak Volume</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">
              ${formatCompactNumber(avgVolume)}
            </div>
            <div className="text-gray-400">Average Volume</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">
              ${formatCompactNumber(minVolume)}
            </div>
            <div className="text-gray-400">Lowest Volume</div>
          </div>
        </div>
      </div>

      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 w-16">
          <span>${formatCompactNumber(maxVolume)}</span>
          <span>${formatCompactNumber(maxVolume * 0.75)}</span>
          <span>${formatCompactNumber(maxVolume * 0.5)}</span>
          <span>${formatCompactNumber(maxVolume * 0.25)}</span>
          <span>$0</span>
        </div>

        {/* Chart container */}
        <div className="ml-16">
          <div className="flex items-end space-x-1 h-64">
            {data.map((point, index) => {
              const height = maxVolume > 0 ? (point.volume / maxVolume) * 100 : 0
              return (
                <div
                  key={index}
                  className="flex-1 bg-orange-500 hover:bg-orange-400 transition-colors relative group"
                  style={{ height: `${height}%` }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    <div className="font-bold">${formatCompactNumber(point.volume)}</div>
                    <div className="text-gray-300">{formatTimeLabel(point.timestamp)}</div>
                    <div className="text-gray-300">${point.price.toFixed(6)}</div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-xs text-gray-400 mt-2">
            {data.map((point, index) => {
              // Show fewer labels to avoid crowding
              if (data.length <= 12 || index % Math.ceil(data.length / 12) === 0 || index === data.length - 1) {
                return (
                  <span key={index} className="transform -rotate-45 origin-left">
                    {formatTimeLabel(point.timestamp)}
                  </span>
                )
              }
              return null
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="text-lg text-gray-300">
          Total Volume: <span className="text-orange-400 font-bold">${formatCompactNumber(totalVolume)}</span>
        </div>
      </div>
    </div>
  )
}

export default VolumeChart 