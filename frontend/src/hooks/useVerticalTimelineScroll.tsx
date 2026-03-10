import { RefObject, useCallback, useEffect, useState } from "react"

// Glossary
// checkpoint - circle that's next to each staking card

type Props = {
  beamRef: RefObject<HTMLDivElement>
  trackRef: RefObject<HTMLDivElement>
  numOfCardItems: number
  gapSize: number // between staking cars
  checkpointOffsetRatio: number // position of checkpoint relevant to its Staking Card
}

// CONFIG
const BEAM_OFFSET = 200 // unit: pixels

export const useVerticalTimelineScroll = ({
  beamRef,
  trackRef,
  numOfCardItems,
  gapSize,
  checkpointOffsetRatio,
}: Props) => {
  const [activeIndex, setActiveIndex] = useState(-1)

  const numberOfGaps = numOfCardItems - 1
  const parentHeight = beamRef.current?.parentElement?.clientHeight || 0
  const stakingCardHeight = (parentHeight - numberOfGaps * gapSize) / numOfCardItems
  const checkpointOffset = checkpointOffsetRatio * stakingCardHeight
  const maxBeamHeight = (stakingCardHeight + gapSize) * (numOfCardItems - 1) + checkpointOffset
  const heightBetweenCheckpoints = (maxBeamHeight - checkpointOffset) / (numOfCardItems - 1)

  const handleScroll = useCallback(() => {
    if (!beamRef.current || !beamRef.current.parentElement) return

    const rect = beamRef.current.getBoundingClientRect()
    const beamHeightAboveBottomOfViewport = window.innerHeight - rect.top
    const startOffset = stakingCardHeight
    const diff = beamHeightAboveBottomOfViewport - startOffset
    const newHeight = diff + BEAM_OFFSET

    if (newHeight < 0) {
      beamRef.current.style.height = "0"
      return
    }

    const newActiveIndex = (newHeight - checkpointOffset) / heightBetweenCheckpoints

    setActiveIndex(newActiveIndex)
    if (newHeight > maxBeamHeight) {
      beamRef.current.style.height = maxBeamHeight + "px"
      setActiveIndex(numOfCardItems - 1)
      return
    }
    beamRef.current.style.height = newHeight + "px"
  }, [beamRef, stakingCardHeight, checkpointOffset, heightBetweenCheckpoints, maxBeamHeight, numOfCardItems])

  useEffect(() => {
    if (!maxBeamHeight || !trackRef.current) return
    trackRef.current.style.height = maxBeamHeight + "px"
  }, [maxBeamHeight, trackRef])

  useEffect(() => {
    window.addEventListener("scroll", handleScroll)

    return () => {
      window.removeEventListener("scroll", handleScroll)
    }
  }, [handleScroll])

  return { activeIndex }
}
