import { twMerge as classNames } from "tailwind-merge"
import React, { useRef, useState } from "react"
import { HTMLProps } from "@/@types/general"

type CustomInputSliderProps = {
  value: number
  setValue: (value: number) => void
} & HTMLProps<"input">

export const CustomInputSlider = ({
  step = 1,
  value,
  setValue,
  className,
}: CustomInputSliderProps) => {
  const sliderRef = useRef<HTMLInputElement>(null)
  const [renderThumb, setRenderThumb] = useState(false)

  return (
    <div className="relative h-4 w-full rounded-full bg-[#1f242f80]">
      <input
        ref={sliderRef}
        // onInput={onInputHandler}
        onMouseOver={() => setRenderThumb(true)}
        onMouseOut={() => setRenderThumb(false)}
        type="range"
        min={0}
        max={100}
        step={step}
        value={value}
        onChange={(e) => setValue(+e.target.value)}
        className={classNames(
          "input-slider absolute left-[5px] top-[5px] m-0 w-[calc(100%-10px)] rounded-full p-0 transition-all hover:cursor-pointer",
          renderThumb && "show-thumb",
          className,
        )}
        style={{
          background: `linear-gradient(to right, #ACFF73 0%, #ACFF73
        ${value}%, transparent ${value}%, transparent 100%)`,
        }}
      />
    </div>
  )
}
