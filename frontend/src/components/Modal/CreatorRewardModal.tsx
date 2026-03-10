import { useState } from "react"
import { SimpleModal } from "./SimpleModal"
import { Button } from "../Button/Button"
import { Icon } from "../Icon/Icon"
import { backendSparkApi, RewardCreatorResponse, GetTotalFeesResponse } from "@/data/api/backendSparkApi"

type CreatorRewardModalProps = {
  isOpen: boolean
  onClose: () => void
  totalFeesData: GetTotalFeesResponse
  twitterAccount: string
  walletAddress: string
}

export function CreatorRewardModal({ isOpen, onClose, totalFeesData, twitterAccount, walletAddress }: CreatorRewardModalProps) {
  const [isClaimingReward, setIsClaimingReward] = useState(false)
  const [claimResult, setClaimResult] = useState<RewardCreatorResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const availableToClaim = totalFeesData.availableToClaim || 0
  const transactionFee = 0.000005 // 5000 lamports in SOL
  const rewardAmount = Math.max(0, availableToClaim - transactionFee) // Net reward after transaction fee

  const handleClaimReward = async () => {
    try {
      setIsClaimingReward(true)
      setError(null)
      
      const result = await backendSparkApi.rewardCreator({
        walletAddress,
        twitterAccount
      })
      
      setClaimResult(result)
    } catch (err) {
      console.error('Failed to claim creator reward:', err)
      setError(err instanceof Error ? err.message : 'Failed to claim reward')
    } finally {
      setIsClaimingReward(false)
    }
  }

  const handleClose = () => {
    setClaimResult(null)
    setError(null)
    onClose()
  }

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Claim All Creator Rewards"
      showCloseBtn={true}
      className="w-[600px]"
    >
      <div className="p-6 pt-0">
        {/* Creator Info */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-brand-primary/20 rounded-full flex items-center justify-center">
              <Icon icon="SvgBorgCoin" className="text-2xl text-brand-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-white">All Your Tokens</h3>
              <p className="text-fg-secondary">@{twitterAccount}</p>
            </div>
          </div>
        </div>

        {/* Fee Summary */}
        <div className="bg-tertiary rounded-xl p-4 mb-6">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-fg-secondary text-sm mb-1">Total Fees Earned</p>
              <p className="text-lg font-semibold text-white">{totalFeesData.totalFeesEarned.toFixed(4)} SOL</p>
            </div>
            <div>
              <p className="text-fg-secondary text-sm mb-1">Already Claimed</p>
              <p className="text-lg font-semibold text-yellow-400">{totalFeesData.totalFeesClaimed.toFixed(4)} SOL</p>
            </div>
            <div>
              <p className="text-fg-secondary text-sm mb-1">Your Reward (10%)</p>
              <p className="text-lg font-semibold text-green-400">{rewardAmount.toFixed(4)} SOL</p>
            </div>
          </div>
        </div>

        {/* Token Breakdown */}
        {totalFeesData.tokenBreakdown && totalFeesData.tokenBreakdown.length > 0 && (
          <div className="bg-secondary rounded-xl p-4 mb-6">
            <h4 className="font-semibold text-md mb-3 text-white">Tokens Breakdown</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {totalFeesData.tokenBreakdown.map((token, index) => (
                <div key={index} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-brand-primary/20 rounded-full flex items-center justify-center">
                      <Icon icon="SvgBorgCoin" className="text-xs text-brand-primary" />
                    </div>
                    <span className="text-sm font-medium text-white">{token.tokenName}</span>
                  </div>
                  <span className="text-sm text-fg-secondary">{token.feesEarned.toFixed(4)} SOL</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Wallet Info */}
        <div className="mb-6">
          <p className="text-fg-secondary text-sm mb-2">Reward will be sent to:</p>
          <div className="bg-secondary rounded-lg p-3 font-mono text-sm break-all text-white">
            {walletAddress}
          </div>
        </div>

        {/* Success/Error Messages */}
        {claimResult && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Icon icon="SvgRoundCheckmark" className="text-green-400 text-xl" />
              <div>
                <h4 className="font-semibold text-green-400">Reward Sent Successfully!</h4>
                <p className="text-sm text-fg-secondary">
                  {claimResult.rewardAmount?.toFixed(4)} SOL has been sent to your wallet
                </p>
              </div>
            </div>
            {claimResult.transactionSignature && (
              <div className="mt-3 pt-3 border-t border-green-500/20">
                <p className="text-xs text-fg-secondary mb-1">Transaction Signature:</p>
                <p className="font-mono text-xs break-all text-green-400">
                  {claimResult.transactionSignature}
                </p>
                <Button
                  size="sm"
                  className="mt-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/30"
                  onClick={() => window.open(`https://solscan.io/tx/${claimResult.transactionSignature}`, '_blank')}
                >
                  View on Solscan
                </Button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="flex items-center gap-3">
              <Icon icon="SvgCircledX" className="text-brand-primary text-xl" />
              <div>
                <h4 className="font-semibold text-brand-primary">Failed to Claim Reward</h4>
                <p className="text-sm text-fg-secondary">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!claimResult && (
            <>
              <Button
                onClick={handleClose}
                className="flex-1 bg-secondary hover:bg-tertiary text-fg-secondary border border-bd-primary"
                disabled={isClaimingReward}
              >
                Cancel
              </Button>
              <Button
                onClick={handleClaimReward}
                disabled={isClaimingReward || availableToClaim <= 0}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                {isClaimingReward ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Claiming...
                  </div>
                ) : availableToClaim <= 0 ? (
                  'No Reward to Claim'
                ) : (
                  `Claim ${rewardAmount.toFixed(4)} SOL`
                )}
              </Button>
            </>
          )}
          {claimResult && (
            <Button
              onClick={handleClose}
              className="w-full bg-brand-primary hover:bg-brand-primary/80 text-white"
            >
              Close
            </Button>
          )}
        </div>

        {/* Disclaimer */}
        {!claimResult && (
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-xs text-yellow-400">
              <Icon icon="SvgQuestionCircle" className="inline mr-1" />
              Creator rewards are 10% of the total fees generated by your token. This reward will be sent directly to your connected wallet.
            </p>
          </div>
        )}
      </div>
    </SimpleModal>
  )
}
