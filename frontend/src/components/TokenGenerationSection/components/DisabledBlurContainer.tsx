import React, { ReactNode } from "react"

type Props = {
  children: ReactNode
}

const DisabledBlurContainer = ({ children }: Props) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 top-0 z-10 flex w-full flex-col items-center justify-center rounded-3xl bg-default/20 backdrop-blur-sm">
      <div className="mt-[-40px] flex w-full max-w-[340px] flex-col items-center rounded-lg bg-default p-4 shadow-sm shadow-white/5">
        {children}
      </div>
    </div>
  )
}

export default DisabledBlurContainer
