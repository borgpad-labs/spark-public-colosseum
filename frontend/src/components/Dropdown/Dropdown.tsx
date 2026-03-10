import { useRef, useState } from "react"
import { Icon } from '../Icon/Icon'
import { twMerge } from 'tailwind-merge'
import { useCheckOutsideClick } from '@/hooks/useCheckOutsideClick'

type Option = {
  value: string
  label: string
}

type SelectorProps = {
  options: Option[]
  selected: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
  baseColor?: string
  accentColor?: string
}

export function DropdownSelector({
  options,
  selected,
  onChange,
  placeholder,
  baseColor,
  accentColor,
  error,
}: SelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useCheckOutsideClick(ref, () => isOpen && setIsOpen(false), [ref])

  const selectedLabel = options.find((opt) => opt.value === selected)?.label || placeholder || "Select an option"

  baseColor ??= "gray-200"
  accentColor ??= "gray-600"
  baseColor = "bg-" + baseColor
  accentColor = "hover:bg-" + accentColor

  return (
    <div ref={ref} className="relative z-[10] w-64">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          "flex w-full items-center justify-between",
          "rounded-lg border px-4 py-2 shadow-md",
          baseColor,
          accentColor,
          error && "ring-1 ring-bd-danger focus:ring-bd-danger",
        )}
        type="button"
      >
        {selectedLabel}
        <Icon
          className={twMerge("transition-transform duration-150", isOpen && "rotate-180 transform")}
          icon={"SvgChevronDown"}
        />
      </button>
      {isOpen && (
        <ul
          className={twMerge(
            "absolute left-0 right-0 mt-1 max-h-[300px] overflow-y-scroll rounded-lg border shadow-lg",
            baseColor,
            "transition-transform ease-in-out",
            isOpen && "animate-top-down",
          )}
        >
          {options.map((option) => (
            <li
              key={option.value}
              className={twMerge("cursor-pointer px-4 py-2 first:rounded-t-lg last:rounded-b-lg", accentColor)}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}

      {error && <span className="-mt-1 text-xs text-fg-error-primary">{error}</span>}
    </div>
  )
}
