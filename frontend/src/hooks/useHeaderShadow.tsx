import { RefObject, useEffect } from "react"

type Props = {
  headerRef: RefObject<HTMLDivElement>
  intersectionReferenceElement: RefObject<HTMLDivElement>
}

const useHeaderShadow = ({
  headerRef,
  intersectionReferenceElement,
}: Props) => {
  useEffect(() => {
    if (!intersectionReferenceElement.current) return
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.intersectionRatio > 0.9) {
          headerRef.current?.classList.remove("shadow-header")
          headerRef.current?.classList.add("shadow-header-transparent")
        }
        if (entry.intersectionRatio < 0.9) {
          headerRef.current?.classList.add("shadow-header")
          headerRef.current?.classList.remove("shadow-header-transparent")
        }
      },
      { threshold: [0.85, 0.95] },
    )
    observer.observe(intersectionReferenceElement.current as Element)
  }, [headerRef, intersectionReferenceElement])
}

export default useHeaderShadow
