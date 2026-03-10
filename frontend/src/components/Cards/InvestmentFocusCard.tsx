import { InvestmentFocusItem } from "@/data/angelStaking"
import { Icon } from "../Icon/Icon"

const InvestmentFocusCard = ({ card }: { card: InvestmentFocusItem }) => {
  return (
    <div
      key={card.icon}
      className="relative inline-flex w-[100px] flex-col items-center justify-center gap-3 overflow-hidden rounded-lg border border-bd-secondary bg-accent/10  px-6 py-4 backdrop-blur-sm"
    >
      <div
        className="absolute bottom-0 left-0 right-0 h-[54px] w-full opacity-10 backdrop-blur"
        style={{
          background: `linear-gradient(to bottom, #0d1118, ${card.colorHex})`,
        }}
      ></div>
      <div className="relative h-11 w-11">
        <Icon
          icon={card.icon}
          className="text-[44px]"
          style={{ color: card.colorHex }}
        />
      </div>
      <div className="font-['Geist'] text-base font-medium leading-normal text-[#f5f5f6]">
        {card.title}
      </div>
    </div>
  )
}

export default InvestmentFocusCard
