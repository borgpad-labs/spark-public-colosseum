import { HTMLProps } from "@/@types/general"
import { useRef, useState } from "react"
import { twMerge } from "tailwind-merge"
import { Icon } from "../Icon/Icon"
import { useCheckOutsideClick } from "@/hooks/useCheckOutsideClick"

type DropdownFieldProps = HTMLProps<"input"> & {
  containerClassName?: HTMLProps["className"]
  inputClassName?: HTMLProps["className"]
  dropdownClassName?: HTMLProps["className"]
  error?: string
  label?: string
  value: OptionType["id"] | undefined
  onChange: (optionId: OptionType["id"]) => void
  options: OptionType[]
}

type OptionType = {
  label: string
  id: string
}

export const DropdownField = ({
  containerClassName: _containerClassName,
  dropdownClassName,
  inputClassName,
  error,
  label,
  options,
  value,
  onChange,
  ...props
}: DropdownFieldProps) => {
  const fieldRef = useRef<HTMLDivElement>(null)
  const [dropdownOpened, setDropdownOpened] = useState(false)

  useCheckOutsideClick(fieldRef, () => setDropdownOpened(false))

  const containerClassName = twMerge(
    "text-sm w-full flex flex-col items-start gap-2 cursor-text max-w-[360px]",
    _containerClassName,
  )
  const selectedOptionClasses = twMerge(
    "relative py-2.5 w-full focus:outline-0 bg-secondary flex items-center placeholder:text-gray-400 ring-1 ring-bd-secondary rounded-lg px-2 h-10 cursor-pointer overflow-visible select-none",
    error && "ring-1 ring-bd-danger focus:ring-bd-danger",
    dropdownOpened && "ring-2 ring-bd-disabled",
    inputClassName,
  )

  const selectedItemLabel = options.find((item) => item.id === value)?.label ?? ""

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={props.name} className="font-medium">
          {label}
        </label>
      )}
      <div
        {...props}
        ref={fieldRef}
        className={selectedOptionClasses}
        onClick={() => setDropdownOpened(!dropdownOpened)}
      >
        {value ? (
          <span className="truncate">{selectedItemLabel}</span>
        ) : (
          <span className="select-none opacity-30">Select an option</span>
        )}
        <Icon
          icon={"SvgChevronDown"}
          className={twMerge("absolute right-2 select-none transition-transform", dropdownOpened && "rotate-180")}
        />
        {dropdownOpened && (
          <div
            className={twMerge(
              "absolute left-0 top-11 z-[101] flex max-h-[400px] w-full  flex-col overflow-y-scroll rounded-lg bg-secondary py-1.5 shadow shadow-slate-400/20",
              dropdownClassName,
            )}
          >
            {options.map((option) => (
              <div
                key={option.id}
                onClick={() => onChange(option.id)}
                className="w-full rounded-md px-3 py-1.5 text-fg-primary hover:bg-brand-dimmed-1"
              >
                <span className="">{option.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <span className="-mt-1 text-xs text-fg-error-primary">{error}</span>}
    </div>
  )
}
