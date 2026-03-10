import { HTMLProps } from "@/@types/general"
import { PropsWithChildren } from "react"
import CurrencyInput from "react-currency-input-field"
import { twMerge } from "tailwind-merge"

type CurrencyInputFieldProps = HTMLProps<"input"> & {
  containerClassName?: HTMLProps["className"]
  inputClassName?: HTMLProps["className"]
  error?: string
  prefixElement?: PropsWithChildren["children"]
  suffixElement?: PropsWithChildren["children"]
  label?: string
  onChange: (value: string | null) => void
  value: number | undefined
  placeholder?: string
  maxValue: number | undefined
}

export const CurrencyInputField = ({
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
  maxValue,
  ...props
}: CurrencyInputFieldProps) => {
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
    if (maxValue && +newValue > maxValue) {
      onChange(maxValue.toString())
    } else {
      onChange(newValue)
    }
  }

  return (
    <div className={containerClassName}>
      <label htmlFor={props.name} className="font-medium">
        {label}
      </label>
      <div className={inputClasses}>
        <CurrencyInput
          maxLength={maxLength}
          value={value}
          allowNegativeValue={false}
          placeholder={placeholder ?? "0"}
          className={
            "h-[40px] w-full max-w-[360px] bg-transparent px-2 py-2.5 text-sm placeholder:text-white/30 focus:outline-none"
          }
          decimalsLimit={6}
          onValueChange={onChangeHandler}
        />
      </div>
      {error && <span className="-mt-1 text-xs text-fg-error-primary">{error}</span>}
    </div>
  )
}
