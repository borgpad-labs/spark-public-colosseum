import React from "react"
import angelStakingTexture1Mob from "@/assets/logos/type-background.png"
import angelStakingTexture1 from "@/assets/logos/type-background.png"

const SomethingWentWrong = () => {
  return (
    <main className="relative z-[10] min-h-screen w-full bg-transparent pt-[48px] text-white md:pt-[68px]">
      <div className="flex flex-col items-center text-center py-[160px]">
        <h2 className="pb-4">Something went wrong!</h2>
        <p className="font-light">Please contact us if this happens again at</p>
        <p className="font-semibold">team@borgpad.com</p>
      </div>

      <div className="absolute top-12 z-[-1] flex w-screen justify-center overflow-hidden lg:top-[72px]">
        <img
          src={angelStakingTexture1Mob}
          role="presentation"
          className="ml-[-200px] w-[852px] opacity-50 mix-blend-lighten md:hidden"
        />
        <img
          src={angelStakingTexture1}
          role="presentation"
          className="hidden w-full mix-blend-lighten md:flex"
        />
      </div>
    </main>
  )
}

export default SomethingWentWrong
