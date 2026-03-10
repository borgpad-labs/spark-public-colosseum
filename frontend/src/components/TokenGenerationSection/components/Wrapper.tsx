import SimpleLoader from "@/components/Loaders/SimpleLoader"
import React from "react"
import { twMerge } from "tailwind-merge"

type WrapperProps = {
  label: string
  children: React.ReactNode
  className?: string
  isLoading?: boolean
}
type InnerWrapperProps = {
  children: React.ReactNode
  className?: string
}

const Wrapper = ({ label, children, isLoading }: WrapperProps) => {
  return (
    <section className="relative mt-3 flex w-full flex-col items-center rounded-3xl border border-bd-secondary bg-secondary bg-texture-zoomed-out bg-cover">
      <div className="absolute -top-[18px] z-[11] rounded-full bg-brand-primary px-4 py-2 text-fg-alt-default">
        {!isLoading ? label : <SimpleLoader />}
      </div>
      {children}
    </section>
  )
}

const InnerWrapper = ({ children, className }: InnerWrapperProps) => {
  return (
    <div
      className={twMerge(
        "relative flex w-full flex-col items-center gap-2 rounded-3xl border border-bd-secondary bg-secondary bg-texture bg-contain p-4 text-sm text-fg-primary",
        className,
      )}
    >
      {children}
    </div>
  )
}

export const TgeWrapper = Object.assign(Wrapper, {
  Inner: InnerWrapper,
})
