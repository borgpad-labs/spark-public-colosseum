import { HTMLAttributes, useCallback, useEffect, useRef, useState } from "react"

const rotatingContent = [
  "Exchanges Dumping on You?",
  "Never Ending Token Unlocks?",
  "Manipulated Prices by Market Makers?",
  "Overpriced Valuations set by VCs?",
  "Hidden Agendas Behind Token Launches?",
  "Restricted Access to Token Sales?",
  "Meaningless Airdrops?",
  "Low Float / High FDVs ?",
]

type SlideProps = {
  animationCallback: () => void
}

const RotatingSubtitle = ({ style }: { style: HTMLAttributes<HTMLHeadingElement>["style"] }) => {
  const [currentContentIndex, setCurrentContentIndex] = useState(0)
  const textRef = useRef<HTMLDivElement | null>(null)
  const timeout1 = useRef<number | null>(null)
  const timeout2 = useRef<number | null>(null)

  const fadeSwitch = useCallback(({ animationCallback }: SlideProps) => {
    textRef.current?.classList.add("animate-fade-out-down")
    timeout1.current = window.setTimeout(() => {
      textRef.current?.classList.remove("animate-fade-in-from-above-2")
    }, 400)
    timeout2.current = window.setTimeout(() => {
      textRef.current?.classList.remove("animate-fade-out-down")
      animationCallback()
      textRef.current?.classList.add("animate-fade-in-from-above-2")
    }, 200)
  }, [])

  const intervalCallback = useCallback(() => {
    const newIndex = currentContentIndex + 1
    if (newIndex > rotatingContent.length - 1) {
      fadeSwitch({ animationCallback: () => setCurrentContentIndex(0) })
      return
    }
    fadeSwitch({ animationCallback: () => setCurrentContentIndex(newIndex) })
  }, [currentContentIndex, fadeSwitch])

  useEffect(() => {
    const rotationInterval = setInterval(intervalCallback, 3000)

    // cleanup timeouts and interval
    return () => {
      clearInterval(rotationInterval)
    }
  }, [intervalCallback])

  return (
    <h2
      style={style}
      className="flex h-[116px] w-full max-w-[752px] animate-fade-in-from-below-slow flex-col flex-wrap items-start  text-xl font-normal leading-snug opacity-0 md:items-center md:text-center"
    >
      <span className="text-nowrap opacity-60">Unsatisfied with</span>
      <div className="flex" ref={textRef}>
        <span className="text-wrap text-left">{rotatingContent[currentContentIndex]}</span>
        {/* <span className="h-[61px]">Exchanges Dumping on You?</span> */}
        {/* <span className="w-[472px]">Hidden Agendas Behind Token Launches?</span> */}
      </div>
    </h2>
  )
}

export default RotatingSubtitle
