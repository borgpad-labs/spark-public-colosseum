import { InputHTMLAttributes } from "react"
import { twMerge } from "tailwind-merge"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const Input = ({ className, ...props }: InputProps) => {
  return (
    <input
      className={twMerge(
        "w-full rounded-lg border border-bd-primary bg-secondary px-4 py-3 text-fg-primary placeholder:text-fg-secondary focus:border-brand-primary focus:outline-none",
        className
      )}
      {...props}
    />
  )
} 