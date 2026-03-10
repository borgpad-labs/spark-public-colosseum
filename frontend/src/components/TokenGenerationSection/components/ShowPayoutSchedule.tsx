import { twMerge } from "tailwind-merge"

import { PayoutScheduleType } from "@/data/contributionAndRewardsData"
import { formatDateForDisplay } from "@/utils/date-helpers"
import Accordion from "@/components/Accordion/Accordion"
import { formatCurrencyAmount } from "shared/utils/format"
import Img from "@/components/Image/Img"

type PayoutProps = {
  index: number
  numberOfPastClaims: number
  payout: PayoutScheduleType
  ticker: string
  tokenIconUrl: string
}
const Payout = ({
  index,
  numberOfPastClaims,
  payout,
  ticker,
  tokenIconUrl,
}: PayoutProps) => {
  return (
    <div
      className={twMerge(
        "flex w-full justify-between border-b-[1px] border-b-bd-primary p-4",
        index + 1 === numberOfPastClaims && "border-none",
      )}
    >
      <div className={twMerge("flex items-center gap-1 text-sm", payout.isClaimed && "line-through opacity-50")}>
        {formatDateForDisplay(new Date(payout.date))}
      </div>
      <div className={twMerge("flex items-center gap-1 text-sm", payout.isClaimed && "opacity-50")}>
        <p className={twMerge(payout.isClaimed && "line-through")}>
          <span>{formatCurrencyAmount(payout.amount)}</span> <span>{ticker}</span>
        </p>
        <Img src={tokenIconUrl} size="4" />
      </div>
    </div>
  )
}
type ShowPayoutScheduleProps = {
  ticker: string
  tokenIconUrl: string
  payoutSchedule: PayoutScheduleType[]
}
const ShowPayoutSchedule = ({
  ticker,
  tokenIconUrl,
  payoutSchedule,
}: ShowPayoutScheduleProps) => {
  const numberOfPastOrders = payoutSchedule.length

  return (
    <Accordion label={"Show Payout Schedule"} subLabel={""}>
      {payoutSchedule.map((payout, index) => (
        <Payout
          key={index}
          index={index}
          numberOfPastClaims={numberOfPastOrders}
          payout={payout}
          ticker={ticker}
          tokenIconUrl={tokenIconUrl}
        />
      ))}
    </Accordion>
  )
}

export default ShowPayoutSchedule
