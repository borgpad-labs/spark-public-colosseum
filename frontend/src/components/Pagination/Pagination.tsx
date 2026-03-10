import * as React from "react"
import { Button } from "../Button/Button"
import { twMerge } from "tailwind-merge"
import { Icon } from "../Icon/Icon"
import { useWindowSize } from "@/hooks/useWindowSize"


type Props = {
  totalPages: number
  currentPage: number
  onPageClick: (pageNum: number) => void
}

const Pagination = ({ totalPages, currentPage, onPageClick }: Props) => {
  const { isMobile } = useWindowSize()

  const getPageNumbers = () => {
    if (totalPages <= 5) {
      // If 5 or fewer pages, show all numbers
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }

    if (isMobile) {
      // Mobile: Show first 2, last 2, and current page
      const pages = new Set<number>()
      pages.add(1)
      pages.add(2)
      if (currentPage > 2 && currentPage < totalPages - 1) {
        pages.add(currentPage)
      }
      pages.add(totalPages - 1)
      pages.add(totalPages)
      return Array.from(pages).sort((a, b) => a - b)
    } else {
      // Desktop: Show first 3, last 2, and current page
      const pages = new Set<number>()
      pages.add(1)
      pages.add(2)
      pages.add(3)
      if (currentPage > 3 && currentPage < totalPages - 2) {
        pages.add(currentPage)
      }
      pages.add(totalPages - 2)
      pages.add(totalPages - 1)
      pages.add(totalPages)
      return Array.from(pages).sort((a, b) => a - b)
    }
  }

  const renderPageNumbers = () => {
    const pages = getPageNumbers()
    return pages.map((pageNum, index) => {
      const showEllipsis = index > 0 && pageNum - pages[index - 1] > 1
      return (
        <React.Fragment key={pageNum}>
          {showEllipsis && <span className="px-2">...</span>}
          <Button
            btnText={pageNum.toString()}
            color="plain"
            onClick={() => onPageClick(pageNum)}
            className={twMerge(
              "squared-full p-2",
              currentPage === pageNum && "bg-bd-secondary/30",
            )}
          />
        </React.Fragment>
      )
    })
  }

  return (
    <div className="relative flex w-full max-w-[344px] md:max-w-[720px] lg:max-w-[1080px] items-center justify-center p-1 text-sm">
      {currentPage > 1 && (
        <Button
          onClick={() => onPageClick(currentPage - 1)}
          color="tertiary"
          btnText={!isMobile ? "Previous" : ""}
          textClassName="text-m font-medium"
          className="absolute left-4 w-8 h-8 p-0 rounded md:w-auto md:h-auto md:px-4 md:py-2 md:rounded-lg"
          prefixElement={<Icon icon="SvgArrowLeft" className="text-fg-secondary" />}
        />
      )}
      <div className="flex items-center">
        {renderPageNumbers()}
      </div>
      {currentPage < totalPages && (
        <Button
          onClick={() => onPageClick(currentPage + 1)}
          color="tertiary"
          btnText={!isMobile ? "Next" : ""}
          textClassName="text-m font-medium"
          className="absolute right-4 w-8 h-8 p-0 rounded md:w-auto md:h-auto md:px-4 md:py-2 md:rounded-lg"
          suffixElement={<Icon icon="SvgArrowRight" className="text-fg-secondary" />}
        />
      )}
    </div>
  )
}

export default Pagination
