import { getRatioPercentage } from "@/utils/format"
import { Icon } from "@/components/Icon/Icon"

type ProgressBarProps = {
  fulfilledAmount: number
  totalAmount: number
}

const ProgressBar = ({ fulfilledAmount, totalAmount }: ProgressBarProps) => {
  const width = getRatioPercentage(fulfilledAmount, totalAmount)
  const leftoverWidth = 100 - width
  return (
    <div className="h-4 w-full rounded-full bg-progress-gray p-1">
      <div className="relative flex h-2 w-full items-center rounded-full bg-transparent bg-gradient-to-r from-progress-left to-progress-right">
        <div
          style={{ minWidth: width + "%" }}
          className="relative h-2 bg-transparent"
        >
          <Icon
            icon="SvgRoundedEdge"
            className="absolute right-0 w-[4px] text-[8px] text-progress-gray"
          />
        </div>
        <div
          style={{ minWidth: leftoverWidth + "%" }}
          className="h-3 bg-progress-gray"
        ></div>
      </div>
    </div>
  )
}

export default ProgressBar
