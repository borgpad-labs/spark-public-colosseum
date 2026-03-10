import { Link } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { useTranslation } from "react-i18next"
import { useState, useEffect } from "react"

import Img from "../Image/Img"
import Text from "@/components/Text"
import { ExpandedProject, processProjects } from "@/utils/projects-helper"
import { getProjectRoute } from "@/utils/routes"
import { Icon } from "../Icon/Icon"
import { GetProjectsResponse, ProjectModel } from "shared/models"
import { formatCurrencyCompact } from "shared/utils/format"
import { formatDateForProject } from "@/utils/date-helpers"
import { TableHeader } from "./TableHeader"
import { TableCell } from "./TableCell"
import { useWindowSize } from "@/hooks/useWindowSize"

type SortField = 'name' | 'date' | 'raised' | 'fdv' | 'participants' | 'commitments' | 'sector'
type SortDirection = 'asc' | 'desc'

type Props = {
  projectType: ProjectModel["info"]["projectType"]
  isLoading?: boolean
  projects?: ExpandedProject[]
  currentPage?: number
  totalPages?: number
  onPageClick?: (pageNum: number) => void
  onSortChange?: (field: SortField, direction: SortDirection) => void
  sortField?: SortField
  sortDirection?: SortDirection
}

export const CompletedLaunchPoolTable = ({
  projectType,
  isLoading,
  projects = [],
  currentPage = 1,
  totalPages = 1,
  onPageClick,
  onSortChange,
  sortField = 'date',
  sortDirection = 'desc'
}: Props) => {
  const { t } = useTranslation()
  const { isMobile } = useWindowSize()

  const skeletonItems = Array.from({ length: 3 }, (_, i) => i)

  const handleSort = (field: SortField) => {
    if (onSortChange) {
      if (sortField === field) {
        onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc')
      } else {
        onSortChange(field, 'asc')
      }
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↓'
    return sortDirection === 'asc' ? '↑' : '↓'
  }

  if (!projects?.length && !isLoading) return null

  return (
    <div className="relative flex w-full col-span-full flex-col overflow-hidden rounded-lg border-[1px] border-bd-secondary/30 bg-transparent">
      <div className="overflow-x-auto max-h-[80vh]">
        <table className="w-full divide-y divide-bd-secondary/30">
          <thead className="sticky top-0 bg-transparent">
            <tr>
              <TableHeader className="w-[1%] text-center">
                {" "}
              </TableHeader>
              <TableHeader onClick={() => handleSort('name')}>
                Project {getSortIcon('name')}
              </TableHeader>
              <TableHeader onClick={() => handleSort('date')}>
                Date {getSortIcon('date')}
              </TableHeader>
              <TableHeader onClick={() => handleSort('sector')}>
                Category {getSortIcon('sector')}
              </TableHeader>
              <TableHeader onClick={() => handleSort('raised')}>
                Raised {getSortIcon('raised')}
              </TableHeader>
              <TableHeader onClick={() => handleSort('fdv')}>
                FDV {getSortIcon('fdv')}
              </TableHeader>
              <TableHeader onClick={() => handleSort('participants')} className="md:hidden">
                Participants {getSortIcon('participants')}
              </TableHeader>
              <TableHeader className="w-[2%] text-center">
                {" "}
              </TableHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-bd-secondary/20">
            {isLoading ? (
              skeletonItems.map((i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <TableCell className="px-4 flex items-center">
                    <div className="w-8 h-8 rounded-full bg-bd-secondary/30"></div>
                  </TableCell>
                  <TableCell isCategory={false}>
                    <div className="h-5 w-24 bg-bd-secondary/30 rounded"></div>
                  </TableCell>
                  <TableCell isCategory={true}>
                    <div className="h-5 w-20 bg-bd-secondary/30 rounded"></div>
                  </TableCell>
                  <TableCell isCategory={true}>
                    <div className="h-5 w-16 bg-bd-secondary/30 rounded"></div>
                  </TableCell>
                  <TableCell isCategory={true}>
                    <div className="h-5 w-16 bg-bd-secondary/30 rounded"></div>
                  </TableCell>
                  <TableCell isCategory={true}>
                    <div className="h-5 w-16 bg-bd-secondary/30 rounded"></div>
                  </TableCell>
                  <TableCell isCategory={true} className="md:hidden">
                    <div className="h-5 w-10 bg-bd-secondary/30 rounded"></div>
                  </TableCell>
                  <TableCell isCategory={false} className="text-center">
                    <div className="inline-flex justify-center items-center w-8 h-8 rounded bg-bd-secondary/30"></div>
                  </TableCell>
                </tr>
              ))
            ) : projects?.map((proj) => (
              <tr
                key={proj.id}
                onClick={() => window.location.href = getProjectRoute(proj as ProjectModel)}
                className="cursor-pointer hover:bg-secondary/50 transition-colors group"
              >
                <TableCell className="px-4 flex items-center">
                  <Img
                    src={proj.info.logoUrl}
                    imgClassName="scale-[102%]"
                    isRounded={true}
                    size="8"
                  />
                </TableCell>
                <TableCell isCategory={false}>
                  <div className="flex items-center gap-1">
                    <Text text={proj.info?.title || "—"} />
                    <Icon icon="SvgShare" className="w-5 h-5 opacity-50" />
                  </div>
                </TableCell>
                <TableCell isCategory={true}>
                  <Text
                    text={proj.info.timeline?.find((t) => t.id === "SALE_CLOSES")?.date
                      ? formatDateForProject(new Date(proj.info.timeline?.find((t) => t.id === "SALE_CLOSES")?.date || 0))
                      : "TBC"}
                  />
                </TableCell>
                <TableCell isCategory={true}>
                  <Text text={proj.info?.sector ?? "N/A"} />
                </TableCell>
                <TableCell isCategory={true}>
                  <Text
                    text={formatCurrencyCompact(Number(proj.depositStats?.totalDepositedInUsd || 0))}
                  />
                </TableCell>
                <TableCell isCategory={true}>
                  <Text
                    text={formatCurrencyCompact(proj?.config?.fdv ?? 0)}
                  />
                </TableCell>
                <TableCell isCategory={true} className="md:hidden">
                  <Text
                    text={proj.depositStats?.participantsCount ?? 0}
                  />
                </TableCell>
                <TableCell isCategory={false} className="text-center">
                  <Link
                    to={getProjectRoute(proj as ProjectModel)}
                    className="inline-flex justify-center items-center w-8 h-8 rounded bg-bd-secondary group-hover:bg-transparent border-none transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon icon="SvgArrowRight" className="w-5 h-5 text-white" />
                  </Link>
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}