import { AvailableIcons } from "@/components/Icon/Icon"

export type StakingCardType = {
  title: string
  description: string
  filename: string
  inputName: string
}

const defaultInputName = "On Scroll"

export const angelStakingCards: StakingCardType[] = [
  {
    title: "Stake your $SOL",
    description:
      "Deposit your $SOL directly into a secure staked account. You'll receive borgSOL, which represents your staked SOL.",
    filename: "angel_staking_1.riv",
    inputName: "On Scroll",
  },
  {
    title: "Invest the yield",
    description:
      "The staking rewards from your $SOL are invested in BorgPad’s Launch Pools & Early Deals.",
    filename: "angel_staking_2.riv",
    inputName: defaultInputName,
  },
  {
    title: "Receive Early Tokens",
    description:
      "Investments made with your staking rewards will be airdropped directly into your wallet.",
    filename: "angel_staking_3.riv",
    inputName: defaultInputName,
  },
  {
    title: "Redeem your stake anytime",
    description:
      "Every epoch, or ~2 days, you can you convert you borgSOL back to $SOL.",
    filename: "angel_staking_4.riv",
    inputName: defaultInputName,
  },
]

export type InvestmentFocusItem = {
  icon: AvailableIcons
  title: string
  colorHex: `#${string}`
}
export const investmentFocusItems: InvestmentFocusItem[] = [
  { icon: "SvgDeSci", title: "deSci", colorHex: "#fff573" },
  { icon: "SvgDeAi", title: "deAI", colorHex: "#7aff73" },
  { icon: "SvgDePin", title: "dePin", colorHex: "#73ffd0" },
  { icon: "SvgDeSoc", title: "deSoc", colorHex: "#73eaff" },
]

