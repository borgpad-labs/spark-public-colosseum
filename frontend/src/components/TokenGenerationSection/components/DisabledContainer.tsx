import { Button } from "@/components/Button/Button"
import React from "react"
import DisabledBlurContainer from "./DisabledBlurContainer"
import { formatDateForTimer } from "@/utils/date-helpers"
import SimpleLoader from "@/components/Loaders/SimpleLoader"
import { useWalletContext } from "@/hooks/useWalletContext"
import { ConnectButton } from "@/components/Header/ConnectButton"
import { TokenAmount } from "@solana/web3.js"

type TierBenefitsType =
  | {
      startDate: Date | null
      minInvestment: string
      maxInvestment: string
    }
  | undefined

type Props = {
  isUserEligible: boolean | undefined
  isEligibilityLoading: boolean
  isDepositStatusLoading: boolean
  isEligibleTierActive: boolean
  isBalanceLoading: boolean
  balance: TokenAmount | null | undefined
  userInvestedMaxAmount: boolean
  scrollToWhitelistRequirements: () => void
  scrollToEligibilitySection: () => void
  tierBenefits: TierBenefitsType
}

const DisabledContainer = ({
  isUserEligible,
  isEligibilityLoading,
  isEligibleTierActive,
  isBalanceLoading,
  balance,
  userInvestedMaxAmount,
  isDepositStatusLoading,
  scrollToWhitelistRequirements,
  scrollToEligibilitySection,
  tierBenefits,
}: Props) => {
  const { isWalletConnected } = useWalletContext()

  if (isDepositStatusLoading || isEligibilityLoading || isBalanceLoading) {
    return (
      <DisabledBlurContainer>
        <div className="flex w-full max-w-[340px] flex-col items-center gap-2 rounded-lg bg-default p-4 ">
          <SimpleLoader className="text-2xl" />
          <div className="flex animate-pulse flex-col items-start">
            {isBalanceLoading && (
              <span className="text-center text-fg-tertiary">{`Loading User's USDC balance...`}</span>
            )}
            {isDepositStatusLoading && (
              <span className="text-center text-fg-tertiary">{`Loading Deposit Status...`}</span>
            )}
            {isEligibilityLoading && (
              <span className="text-center text-fg-tertiary">{`Loading Eligibility Status...`}</span>
            )}
          </div>
        </div>
      </DisabledBlurContainer>
    )
  }
  if (!isWalletConnected)
    return (
      <DisabledBlurContainer>
        <div className="flex w-full max-w-[340px] flex-col items-center gap-2 rounded-lg bg-default p-4 ">
          <span className="text-center text-fg-primary">Connect your wallet in order to invest</span>
          <ConnectButton />
        </div>
      </DisabledBlurContainer>
    )

  if (!isUserEligible)
    return (
      <DisabledBlurContainer>
        <div className="flex w-full max-w-[340px] flex-col items-center gap-3 rounded-lg bg-default p-4 shadow-sm">
          <span className="text-center text-fg-primary">
            Get yourself whitelisted <br></br> for this deal! 👇
          </span>
          <Button
            onClick={scrollToWhitelistRequirements}
            size="md"
            color="primary"
            btnText="See Whitelist Requirements"
            className="text-sm font-normal"
          ></Button>
        </div>
      </DisabledBlurContainer>
    )

  if (!isEligibleTierActive)
    return (
      <DisabledBlurContainer>
        <div className="flex flex-col items-center py-2 text-sm font-normal text-fg-primary">
          <p>
            <span onClick={scrollToEligibilitySection} className="cursor-pointer underline">
              Your Tier
            </span>
            <span>{" opens on: "}</span>
          </p>
          {<span>{tierBenefits && tierBenefits.startDate && formatDateForTimer(tierBenefits.startDate)}</span>}
        </div>
      </DisabledBlurContainer>
    )
  if (!balance?.uiAmountString)
    return (
      <DisabledBlurContainer>
        <div className="flex flex-col items-center py-2 text-sm font-normal text-fg-primary">
          <p>
            <span onClick={scrollToEligibilitySection} className="cursor-pointer underline">
              No raised token balance
            </span>
          </p>
        </div>
      </DisabledBlurContainer>
    )

  if (userInvestedMaxAmount)
    return (
      <DisabledBlurContainer>
        <div className="py-2 text-sm font-normal text-fg-primary">
          <span>You have invested max amount 🎉</span>
        </div>
      </DisabledBlurContainer>
    )

  return <></>
}

export default DisabledContainer
