import React, { useState } from "react"
import { TableCell } from "./TableCell"
import { TableHeader } from "./TableHeader"
import { AnalysisSortBy, AnalystRoleEnum } from "shared/schemas/analysis-schema"
import Img from "../Image/Img"
import { Button } from "../Button/Button"
import { Icon } from "../Icon/Icon"
import { useQuery } from "@tanstack/react-query"
import Text from "@/components/Text"
import { analysisApi, UpdateAnalysisApproval } from "@/data/api/analysisApi"

type Props = {
  onUpdateStatusSubmit?: (args: Pick<UpdateAnalysisApproval, "action" | "analysisId"> & { queryKey: string[] }) => void
}

const rolesObj: Record<AnalystRoleEnum, string> = {
  TEAM_MEMBER: "Team Member",
  SPONSORED_ANALYST: "Sponsored Analyst",
  FREE_WRITER: "Free Writer",
}

const ApproveAnalysisTable = ({ onUpdateStatusSubmit }: Props) => {
  const [sortBy, setSortBy] = useState<AnalysisSortBy>("impressions")
  const [sortDirection, setSortDirection] = useState<"desc" | "asc">("desc")

  const queryKey = ["getAnalysisList", "isApproved=false", sortBy, sortDirection]

  const { data, isLoading } = useQuery({
    queryFn: () =>
      analysisApi.getAnalysisList({
        isApproved: false,
        sortBy,
        sortDirection,
      }),
    queryKey,
    refetchOnWindowFocus: false,
  })

  const getSortIcon = (field: AnalysisSortBy) => {
    if (sortBy !== field) return "↓"
    return sortDirection === "asc" ? "↑" : "↓"
  }

  const handleSort = (field: AnalysisSortBy) => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortDirection("asc")
    }
  }

  return (
    <div className="relative col-span-full flex w-full flex-col rounded-lg bg-transparent">
      <div className="overflow-x-auto">
        <div className="overflow-y-auto pr-2">
          {!isLoading ? (
            data?.analysisList.length ? (
              <table className="w-full divide-y divide-bd-secondary/15">
                <thead className="sticky top-0 z-[2] bg-transparent">
                  <tr className="max-h-[52px] bg-default">
                    <TableHeader>
                      <div className="w-[220px] pl-12">Analyst</div>
                    </TableHeader>
                    <TableHeader onClick={() => handleSort("projectId")} className="text-nowrap">
                      ProjectId {getSortIcon("projectId")}
                    </TableHeader>
                    <TableHeader onClick={() => handleSort("analystRole")} className="text-nowrap">
                      Role {getSortIcon("analystRole")}
                    </TableHeader>
                    <TableHeader className="min-w-[102px] text-nowrap" onClick={() => handleSort("impressions")}>
                      Impressions {getSortIcon("impressions")}
                    </TableHeader>
                    <TableHeader onClick={() => handleSort("likes")} className="text-nowrap">
                      Likes {getSortIcon("likes")}
                    </TableHeader>
                    <TableHeader className="hover:cursor-default hover:bg-default"> </TableHeader>
                    <TableHeader className="hover:cursor-default hover:bg-default"> </TableHeader>
                  </tr>
                </thead>
                <tbody className="divide-y divide-bd-secondary/5 pb-10">
                  {data.analysisList.map((item) => (
                    <tr className="h-[64px]" key={item.analysis.id}>
                      <TableCell className="py-0">
                        <div className="flex w-[220px] flex-row items-center gap-4">
                          <Img size="8" src={item.analyst.twitterAvatar} isRounded />
                          <div className="flex flex-col flex-nowrap items-start">
                            <span className="truncate text-sm font-semibold text-fg-primary">
                              {item.analyst.twitterName}
                            </span>
                            <span className="truncate text-sm font-normal text-fg-tertiary">
                              @{item.analyst.twitterUsername}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-0">
                        <span className="text-xs text-fg-secondary">{item.analysis.projectId}</span>
                      </TableCell>
                      <TableCell className="py-0">
                        <span className="text-xs text-fg-secondary">{rolesObj[item.analysis.analystRole]}</span>
                      </TableCell>
                      <TableCell className="py-0">
                        <span className="text-fg-primary">{item.analysis.impressions.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="py-0">
                        <span className="text-fg-primary">{item.analysis.likes.toLocaleString()}</span>
                      </TableCell>
                      <TableCell className="py-0">
                        <a href={item.analysis.articleUrl} target="_blank" rel="noreferrer">
                          <Button
                            color="tertiary"
                            btnText="Read"
                            textClassName="text-sm font-medium"
                            className="rounded-lg py-2"
                            suffixElement={<Icon icon="SvgExternalLink" className="text-fg-secondary" />}
                          />
                        </a>
                      </TableCell>
                      {onUpdateStatusSubmit && (
                        <TableCell className="py-0">
                          <div className="flex gap-2">
                            <Button
                              prefixElement={<Icon icon="SvgCircledCheckmark" />}
                              btnText="Approve"
                              size="xs"
                              color="primary"
                              onClick={() =>
                                onUpdateStatusSubmit({ analysisId: item.analysis.id, action: "approve", queryKey })
                              }
                            />
                            <Button.Icon
                              icon="SvgX"
                              size="xs"
                              color="danger"
                              onClick={() =>
                                onUpdateStatusSubmit({ analysisId: item.analysis.id, action: "decline", queryKey })
                              }
                            />
                          </div>
                        </TableCell>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <span className="text-fg-secondary">No analyses for approval yet.</span>
            )
          ) : (
            <TableSkeleton />
          )}
        </div>
      </div>
    </div>
  )
}

export default ApproveAnalysisTable

const TableSkeleton = () => {
  return (
    <table className="w-full divide-y divide-bd-secondary/15">
      <thead className="sticky top-0 z-[2] bg-transparent">
        <tr className="max-h-[52px] bg-default">
          <TableHeader>
            <div className="w-[220px] pl-12">Analyst</div>
          </TableHeader>
          <TableHeader>ProjectId</TableHeader>
          <TableHeader>Role</TableHeader>
          <TableHeader className="min-w-[102px]">Impressions</TableHeader>
          <TableHeader>Likes</TableHeader>
          <TableHeader className="hover:cursor-default hover:bg-default"> </TableHeader>
          <TableHeader className="hover:cursor-default hover:bg-default"> </TableHeader>
        </tr>
      </thead>
      <tbody className="divide-y divide-bd-secondary/5 pb-10">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <tr className="h-[64px]" key={item}>
            <TableCell className="py-0">
              <div className="flex w-[220px] flex-row items-center gap-4">
                <Img size="8" src={""} isFetchingLink isRounded />
                <div className="flex flex-col flex-nowrap items-start">
                  <Text isLoading className="w-[60px] opacity-50" />
                  <Text isLoading className="w-[60px] opacity-50" />
                </div>
              </div>
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
            <TableCell className="py-0">
              <Text isLoading className="w-[80px] opacity-50" />
            </TableCell>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
