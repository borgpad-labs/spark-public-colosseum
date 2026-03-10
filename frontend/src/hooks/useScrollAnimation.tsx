import { RefObject, useEffect, useState } from "react"

type Props = {
  ref: RefObject<HTMLDivElement>
  threshold: number
}

const useScrollAnimation = ({ ref, threshold }: Props) => {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    const cardEl = ref.current as Element
    const observer = new IntersectionObserver(
      ([entry]) => {
        const isScrolledPastElement = entry.boundingClientRect.top < 0
        if (entry.intersectionRatio > threshold) {
          setIsActive(true)
        }
        if (entry.intersectionRatio < threshold && !isScrolledPastElement) {
          setIsActive(false)
        }
      },
      { threshold: [threshold - 0.01, threshold + 0.01] },
    )
    observer.observe(cardEl)

    return () => {
      observer.unobserve(cardEl)
    }
  }, [ref, threshold])

  return { isActive }
}

export default useScrollAnimation
