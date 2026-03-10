import { useState, useRef, useEffect } from "react"
import { twMerge } from "tailwind-merge"
import { Icon } from "@/components/Icon/Icon"

// Custom dropdown component with an icon on the left and centered text
export const SortDropdown = ({ options, selected, onChange, placeholder }: {
  options: { value: string; label: string }[];
  selected: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  const selectedLabel = options.find((opt) => opt.value === selected)?.label || placeholder

  const getSortIcon = () => {
    if (selected.includes('name')) {
      return "SvgList"
    } else if (selected.includes('date')) {
      return "SvgCalendarFill"
    } else if (selected.includes('raised')) {
      return "SvgWalletFilled"
    }
    return "SvgChartLine"
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [ref])

  return (
    <div ref={ref} className="relative w-full z-[10]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={twMerge(
          "flex w-full items-center px-4 py-3 text-center",
          "rounded-lg border-[1px] border-bd-secondary/30 bg-secondary",
          "text-white font-medium"
        )}
      >
        <div className="flex items-center w-full">
          <Icon icon={getSortIcon()} className="mr-2 text-white" />
          <span className="flex-grow text-center">{selectedLabel}</span>
          <Icon
            className={twMerge("transition-transform duration-150", isOpen && "rotate-180 transform")}
            icon={"SvgChevronDown"}
          />
        </div>
      </button>
      {isOpen && (
        <ul className="absolute left-0 right-0 mt-1 w-full max-h-[400px] overflow-y-auto rounded-lg border-[1px] border-bd-secondary/30 bg-secondary shadow-lg">
          {options.map((option) => (
            <li
              key={option.value}
              className="cursor-pointer px-4 py-3 text-center hover:bg-secondary/50 text-fg-secondary"
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
    </div>
  )
}