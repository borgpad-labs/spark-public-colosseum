import { HTMLProps } from "@/@types/general"
import { PropsWithChildren } from "react"
import { twMerge } from "tailwind-merge"

type ReferralInputFieldProps = HTMLProps<"input"> & {
  containerClassName?: HTMLProps["className"]
  inputClassName?: HTMLProps["className"]
  error?: string
  prefixElement?: PropsWithChildren["children"]
  suffixElement?: PropsWithChildren["children"]
  label?: string
  onChange: (value: string | null) => void
  value: string
  placeholder?: string
}

export const ReferralInputField = ({
  error,
  prefixElement,
  suffixElement,
  containerClassName: _containerClassName,
  inputClassName,
  value,
  onChange,
  disabled,
  label,
  placeholder,
  maxLength,
  ...props
}: ReferralInputFieldProps) => {
  const containerClassName = twMerge(
    "text-sm w-full flex flex-col items-start gap-2 cursor-text max-w-[360px]",
    _containerClassName,
  )
  const inputClasses = twMerge(
    "w-full focus:outline-0 bg-secondary flex-grow placeholder:text-gray-400 truncate ring-1 ring-bd-secondary rounded-lg",
    "focus-within:ring-2 focus-within:ring-bd-disabled",
    error && "ring-1 ring-bd-danger focus-within:ring-bd-danger",
    inputClassName,
  )

  const onChangeHandler = (newValue: string | undefined) => {
    if (!newValue) {
      onChange(null)
      return
    }
    onChange(newValue)
  }

  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={props.name} className="font-medium">
          {label}
        </label>
      )}
      <div className={inputClasses}>
        <input
          type="text"
          value={value}
          disabled={disabled}
          maxLength={maxLength}
          placeholder={placeholder ?? "Enter referral code"}
          className="h-[40px] w-full max-w-[360px] bg-transparent px-2 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
          onChange={(e) => onChangeHandler(e.target.value)}
          {...props}
        />
      </div>
      {error && <span className="-mt-1 text-xs text-fg-error-primary">{error}</span>}
    </div>
  )
}
