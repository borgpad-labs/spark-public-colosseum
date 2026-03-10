import React from 'react'
import { formatCompactNumber } from 'shared/utils/format'

interface Transaction {
  id: string
  timestamp: number
  type: 'buy' | 'sell'
  amount: number
  price: number
  volume: number
  wallet: string
}

interface RecentTransactionsProps {
  transactions: Transaction[]
  tokenSymbol?: string
}

const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions, tokenSymbol = 'TOKEN' }) => {
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
  }

  const shortenAddress = (address: string): string => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-gray-900 rounded-xl p-6 border border-orange-500/30">
        <h3 className="text-2xl font-bold text-white mb-4">Recent Transactions</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 text-lg">No recent transactions available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 border border-orange-500/30">
      <h3 className="text-2xl font-bold text-white mb-4">Recent Transactions</h3>
      
      <div className="space-y-3">
        {transactions.slice(0, 10).map((tx, index) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
          >
            <div className="flex items-center space-x-3">
              {/* Transaction type indicator */}
              <div className={`w-3 h-3 rounded-full ${
                tx.type === 'buy' ? 'bg-green-500' : 'bg-red-500'
              }`}></div>
              
              {/* Transaction details */}
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold ${
                    tx.type === 'buy' ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {tx.type.toUpperCase()}
                  </span>
                  <span className="text-white">
                    {formatCompactNumber(tx.amount)} {tokenSymbol}
                  </span>
                </div>
                <div className="text-gray-400 text-sm">
                  {shortenAddress(tx.wallet)} • {formatTime(tx.timestamp)}
                </div>
              </div>
            </div>
            
            {/* Price and volume */}
            <div className="text-right">
              <div className="text-white font-semibold">
                ${tx.price.toFixed(6)}
              </div>
              <div className="text-gray-400 text-sm">
                Vol: {formatCompactNumber(tx.volume)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {transactions.length > 10 && (
        <div className="text-center mt-4 pt-4 border-t border-gray-700">
          <div className="text-gray-400 text-sm">
            Showing 10 of {transactions.length} transactions
          </div>
        </div>
      )}
    </div>
  )
}

export default RecentTransactions 