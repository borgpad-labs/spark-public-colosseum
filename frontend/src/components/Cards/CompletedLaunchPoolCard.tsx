import { Link } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { useTranslation } from "react-i18next"
import { ExpandedProject } from "@/utils/projects-helper"
import { getProjectRoute } from "@/utils/routes"
import { Icon } from "../Icon/Icon"
import { ProjectModel } from "shared/models"
import { formatCurrencyCompact } from "shared/utils/format"
import { formatDateForProject } from "@/utils/date-helpers"
import { createDetailRow, ProjectDetailRows } from "../Tables/ProjectDetailsRows"
import { useWindowSize } from "@/hooks/useWindowSize"
import Img from "../Image/Img"
import Text from "@/components/Text"
import { Button } from "../Button/Button"
import Pagination from "../Pagination/Pagination"

type Props = {
  projectType: ProjectModel["info"]["projectType"]
  isLoading?: boolean
  project?: ExpandedProject | null
}

export const CompletedLaunchPoolCard = ({ 
  projectType, 
  isLoading, 
  project,
}: Props) => {
  const { t } = useTranslation()
  const { isMobile } = useWindowSize()

  if (!project && !isLoading) {
    return (
      <div className="w-full text-center py-4">
        <p className="text-fg-secondary">No completed projects available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div
        key={project?.id}
        className="relative mb-4 flex w-full min-w-[315px] max-w-[344px] flex-col overflow-hidden rounded-lg border-[1px] border-bd-secondary/30 bg-secondary"
      >
        <div className="flex w-full flex-1 grow flex-col justify-between gap-4 p-4">
          <div className="flex w-full flex-col gap-5">
            <div className="flex w-full flex-col gap-3">
              <Img
                src={project?.info.logoUrl}
                imgClassName="scale-[102%]"
                isRounded={true}
                size="8"
                isFetchingLink={isLoading}
              />
              <div>
                <div className="flex items-center gap-2">
                  <Link to={getProjectRoute(project as ProjectModel)}>
                    <Text
                      text={project?.info?.title}
                      as="span"
                      className="text-2xl font-semibold"
                      isLoading={isLoading}
                    />
                  </Link>
                  <Link to={getProjectRoute(project as ProjectModel)}>
                    <Icon icon="SvgShare" className="h-6 w-6 opacity-50" />
                  </Link>
                </div>
                <Text
                  text={project?.info?.subtitle}
                  as="span"
                  className="line-clamp-3 text-base text-fg-tertiary"
                  isLoading={isLoading}
                />
              </div>
            </div>

            <div className="flex flex-col gap-0">
              {project && (
                <ProjectDetailRows
                  project={project}
                  rows={[
                    createDetailRow(
                      "SvgCalendarFill",
                      "Date",
                      project?.info.timeline?.find((t) => t.id === "SALE_CLOSES")?.date
                        ? formatDateForProject(
                            new Date(project?.info.timeline?.find((t) => t.id === "SALE_CLOSES")?.date || 0),
                          )
                        : "TBC",
                    ),
                    createDetailRow("SvgChartLine", "FDV", formatCurrencyCompact(project?.config?.fdv ?? 0)),
                    createDetailRow(
                      "SvgWalletFilled",
                      "Raised",
                      formatCurrencyCompact(Number(project?.depositStats?.totalDepositedInUsd || 0)),
                    ),
                    createDetailRow("SvgTwoAvatars", "Participants", project?.depositStats?.participantsCount ?? 0),
                    createDetailRow("SvgChartLine", "Sector", project?.info?.sector ?? "N/A"),
                  ]}
                />
              )}
            </div>
          </div>
          <div className="flex w-full flex-col rounded-xl bg-default">
            <Link to={getProjectRoute(project as ProjectModel)}>
              <Button
                btnText="Learn More"
                className={twMerge("w-full border border-bd-secondary bg-transparent p-3 text-fg-secondary")}
              />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}