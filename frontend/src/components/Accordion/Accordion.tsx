import { useEffect, useRef, useState } from "react"
import { twMerge } from "tailwind-merge"

import { Button } from "../Button/Button"
import { Icon } from "../Icon/Icon"

type AccordionProps = {
  label: string
  subLabel: string
  children: React.ReactNode
  maxChildrenHeight?: number
  className?: string
  questionClassName?: string
  answerClassName?: string
  chevronClassName?: string
  disabled?: boolean
}

const BORDER_HEIGHT = 1

const Accordion = ({
  label,
  subLabel,
  children,
  className,
  maxChildrenHeight,
  questionClassName,
  answerClassName,
  chevronClassName,
  disabled,
}: AccordionProps) => {
  const [isOpen, setOpen] = useState(false)
  const accordionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!accordionRef.current) return
    setOpen(false)
    const maxContainerHeight = maxChildrenHeight || 2 * BORDER_HEIGHT + accordionRef.current?.scrollHeight
    accordionRef.current.style.maxHeight = maxContainerHeight + "px"
  }, [maxChildrenHeight])

  return (
    <div className={twMerge("relative z-20 flex w-full flex-col", className)}>
      <Button
        color="secondary"
        size="xl"
        disabled={disabled}
        onClick={() => setOpen(!isOpen)}
        className={twMerge(
          "z-[10] scale-100 gap-1 rounded-lg p-3 text-sm hover:opacity-100 active:!scale-[100%]",
          questionClassName,
        )}
      >
        <span className="font-normal">{label}</span>
        {subLabel && <span className="text-sm font-normal">{subLabel}</span>}
        <Icon
          icon={"SvgChevronDown"}
          className={twMerge(
            " text-fg-primary opacity-50 transition-transform duration-500",
            isOpen && "rotate-180",
            chevronClassName,
          )}
        />
      </Button>
      <div
        ref={accordionRef}
        className={twMerge(
          "transition-height top-11 z-[-10] -mt-2.5 w-full overflow-y-scroll rounded-b-lg border-[1px] border-bd-primary bg-secondary pt-[-1px] delay-0 duration-200 ease-in-out",
          !isOpen && "!max-h-0",
          answerClassName,
        )}
      >
        <div className="h-2 w-full"></div>
        {children}
      </div>
    </div>
  )
}

export default Accordion
