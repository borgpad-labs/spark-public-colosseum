import { useRef } from "react"
import discover1 from "@/assets/landingPage/discover1.png"
import discover2 from "@/assets/landingPage/discover2.png"
import { twMerge } from "tailwind-merge"
import DiscoverSectionCard from "../Cards/DiscoverSectionCard"

import discoverDraftPicksMd from "@/assets/landingPage/discover-draft-picks.png"
import discoverDraftPicksSmall from "@/assets/launchPools/draft-picks-logo.png"
import backdropDraft from "@/assets/landingPage/discover-draft-backdrop.png"
import backdropLaunchPools from "@/assets/landingPage/backdropLaunchPools.png"
import discoverLaunchPoolsMedium from "@/assets/landingPage/discoverLaunchPoolsMedium.png"
import discoverLaunchPoolsSmall from "@/assets/landingPage/discoverLaunchPoolsSmall.png"
import { ROUTES } from "@/utils/routes"

export type DiscoverSectionCardType = {
  path: string
  description: string
  images: { small: string; medium: string }
  label: string
  imgClass?: string
  btnClass?: string
  className?: string
  backdropImg?: string
}

const content: DiscoverSectionCardType[][] = [
  [
    {
      path: ROUTES.DRAFT_PICKS,
      label: "Draft Picks",
      description: "Express your investment interest in the up-and-coming talent.",
      images: { small: discoverDraftPicksSmall, medium: discoverDraftPicksMd },
      imgClass: "md:h-[116px] w-[170px] md:w-fit",
      backdropImg: backdropDraft,
      btnClass: "explore-draft-picks",
      className: "discover-draft-picks",
    },
    {
      path: ROUTES.LAUNCH_POOLS,
      label: "Launch Pools",
      description: "Provide Liquidity, Earn Tokens at Pre-TGE Valuations.",
      images: { small: discoverLaunchPoolsSmall, medium: discoverLaunchPoolsMedium },
      imgClass: "md:h-[116px] w-[170px] md:w-fit",
      backdropImg: backdropLaunchPools,
      btnClass: "explore-goat-pools",
      className: "discover-goat-pools",
    },
  ],
  [
    {
      path: "",
      label: "",
      description: "Stake $SOL, Receive Airdrops from Early Investments.",
      images: { small: discover1, medium: discover1 },
      imgClass: "max-w-[240px] md:py-10 mb-0 md:mb-0",
    },
    {
      path: "",
      label: "",
      description: "Get Early Access to Exclusive Token Sales.",
      images: { small: discover2, medium: discover2 },
      imgClass: "max-w-[240px] md:py-10 mb-0 md:mb-0",
    },
  ],
]

const DiscoverSection = () => {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <section className="flex w-full flex-col items-center gap-6 px-5 py-16 md:gap-8 md:px-16 md:py-10">
      <div className="w-full">
        <h2 className="w-full max-w-[200px] text-left text-2xl font-semibold leading-[44px] md:max-w-[100%] md:text-center">
          Discover the BetterThanCEX Ecosystem
        </h2>
      </div>
      <div ref={ref} className={twMerge("grid w-full max-w-[756px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-8")}>
        {content[0].map((item, index) => (
          <DiscoverSectionCard key={index} {...item} />
        ))}
      </div>
      <div ref={ref} className={twMerge("grid w-full max-w-[756px] grid-cols-1 gap-6 md:grid-cols-2 md:gap-8")}>
        {content[1].map((item, index) => (
          <DiscoverSectionCard key={index} {...item} />
        ))}
      </div>
    </section>
  )
}

export default DiscoverSection
