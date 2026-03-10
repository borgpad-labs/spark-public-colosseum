import { Link } from "react-router-dom"
import { twMerge } from "tailwind-merge"
import { useTranslation } from "react-i18next"

import Img from "../Image/Img"
import Text from "@/components/Text"
import { Badge } from "../Badge/Badge"
import { Button } from "../Button/Button"
import { ExpandedProject } from "@/utils/projects-helper"
import { ExpandedTimelineEventType } from "@/components/Timeline/Timeline"
import { ExternalLink } from "../Button/ExternalLink"
import { getProjectRoute } from "@/utils/routes"
import { AvailableIcons, Icon } from "../Icon/Icon"
import { ProjectModel } from "shared/models"
import { formatCurrencyAmount, formatCurrencyCompact, formatCurrencyCompactWithDecimals } from "shared/utils/format"
import { formatDateForProject } from "@/utils/date-helpers"

type Props = { project: ExpandedProject | null; isLoading?: boolean }

export const LaunchPoolCard = ({ project, isLoading }: Props) => {
  const { t } = useTranslation()

  const defaultAdditionalData = {
    badgeClassName: "",
    endMessage: "",
    badgeLabel: "",
    currentEvent: undefined as ExpandedTimelineEventType | undefined,
  }

  const additionalData = project?.additionalData || defaultAdditionalData
  const badgeClassName = additionalData.badgeClassName || ""
  const endMessage = additionalData.endMessage || ""
  const badgeLabel = additionalData.badgeLabel || ""
  const currentEvent = additionalData.currentEvent

  const isDraftPick = project?.info.projectType === "draft-pick"
  const isUpcoming = !isDraftPick && currentEvent?.id === "UPCOMING"
  const isRegistrationOpen = !isDraftPick && currentEvent?.id === "REGISTRATION_OPENS"
  const isSaleOpen = !isDraftPick && currentEvent?.id === "SALE_OPENS"
  const isRewardDistribution = !isDraftPick && currentEvent?.id === "REWARD_DISTRIBUTION"
  const isBlitz = project?.info.projectType === "blitz"
  const projectUrl = getProjectRoute(project as ProjectModel)

  return (
    <>
      {!isRewardDistribution && (
        <li className="relative flex w-full min-w-[315px] max-w-[344px] flex-1 grow flex-col overflow-hidden rounded-lg border-[1px] border-bd-secondary/30 bg-default">
          <Img
            src={project?.info?.thumbnailUrl || project?.info?.logoUrl}
            customClass={twMerge("h-[189px] rounded-none", isLoading ? "opacity-20" : "")}
            showFallback
            isFetchingLink={isLoading}
          />
          {!isDraftPick && (
            <Badge
              label={badgeLabel || "Loading..."}
              className={twMerge("absolute left-4 top-4 px-3 py-1 text-sm", badgeClassName)}
            />
          )}
          <div className="flex w-full flex-1 grow flex-col justify-between gap-4 p-4">
            <div className="flex w-full flex-col gap-4">
              <div className="flex w-full flex-col gap-1">
                <Text text={project?.info?.title} as="span" className="text-2xl font-semibold" isLoading={isLoading} />
                <Text
                  text={project?.info?.subtitle}
                  as="span"
                  className="line-clamp-3 text-base text-fg-tertiary"
                  isLoading={isLoading}
                />
              </div>

              <div className="flex flex-col gap-0">
                {(isRegistrationOpen || isUpcoming) && (
                  <ProjectDetailRows
                    project={project}
                    rows={[
                      createDetailRow(
                        "SvgChartLine",
                        "Valuation (FDV)",
                        formatCurrencyCompactWithDecimals(project?.config.fdv),
                        project?.info.projectType === "blitz" ? "text-brand-blitz" : "text-fg-brand-primary",
                      ),
                      createDetailRow("SvgChartLine", "Sector", project?.info?.sector ?? "N/A"),
                      createDetailRow(
                        "SvgCalendarFill",
                        "Sale Opens",
                        project?.info.timeline?.find((t) => t.id === "SALE_OPENS")?.date
                          ? formatDateForProject(
                              new Date(project?.info.timeline?.find((t) => t.id === "SALE_OPENS")?.date || 0),
                            )
                          : "TBC",
                      ),
                    ]}
                  />
                )}
                {isSaleOpen && (
                  <ProjectDetailRows
                    project={project}
                    rows={[
                      createDetailRow(
                        "SvgChartLine",
                        "Valuation (FDV)",
                        formatCurrencyCompact(project?.config.fdv),
                        project?.info.projectType === "blitz" ? "text-brand-blitz" : "text-fg-brand-primary",
                      ),
                      createDetailRow("SvgChartLine", "Sector", project?.info?.sector ?? "N/A"),
                      createDetailRow("SvgTwoAvatars", "Participants", project?.depositStats?.participantsCount ?? 0),
                      createDetailRow(
                        "SvgWalletFilled",
                        "Total Raised",
                        formatCurrencyCompact(Number(project?.depositStats?.totalDepositedInUsd || 0)),
                      ),
                      createDetailRow(
                        "SvgCalendarFill",
                        "Sale Ends",
                        project?.info.timeline?.find((t) => t.id === "SALE_CLOSES")?.date
                          ? formatDateForProject(
                              new Date(project?.info.timeline?.find((t) => t.id === "SALE_CLOSES")?.date || 0),
                            )
                          : "TBC",
                      ),
                    ]}
                  />
                )}
              </div>
            </div>

            {isUpcoming ? (
              <FollowOnXBtn />
            ) : (
              <div className="flex w-full flex-col rounded-xl bg-default">
                <Link to={projectUrl}>
                  <Button
                    btnText="Learn More"
                    className={twMerge(
                      "w-full p-3",
                      isBlitz && "bg-brand-blitz active:bg-brand-blitz",
                      isDraftPick && "bg-draft-picks active:bg-draft-picks",
                    )}
                  />
                </Link>
              </div>
            )}
          </div>
        </li>
      )}
    </>
  )
}

type DetailRow = {
  icon: AvailableIcons
  label: string
  value: string | number
  valueClassName?: string
}

const ProjectDetailRows = ({ project, rows }: { project: ExpandedProject | null; rows: DetailRow[] }) => {
  if (!project) return null

  return (
    <>
      {rows.map((row, index) => (
        <div
          key={`${row.icon}-${index}`}
          className={twMerge(
            "flex items-center justify-between gap-2 rounded-lg p-2",
            index % 2 === 0 ? "bg-secondary" : "bg-transparent",
          )}
        >
          <div className="flex items-center gap-2">
            <Icon icon={row.icon} />
            <span className="text-fg-secondary">{row.label}</span>
          </div>
          <span className={twMerge("text-fg-secondary", row.valueClassName)}>{row.value}</span>
        </div>
      ))}
    </>
  )
}

const createDetailRow = (
  icon: AvailableIcons,
  label: string,
  value: string | number,
  valueClassName?: string,
): DetailRow => {
  return { icon, label, value, valueClassName }
}

const BORGPAD_X_URL = "https://x.com/BorgPadHQ"

const FollowOnXBtn = () => {
  return (
    <div className="flex w-full flex-col rounded-xl bg-default">
      <span className="w-full px-4 py-2 text-center text-sm leading-5 text-fg-tertiary">
        {"Be among the first to find out"}
      </span>
      <ExternalLink
        externalLink={{
          label: "Follow Announcements on",
          url: BORGPAD_X_URL,
          iconType: "X_TWITTER",
        }}
        className="flex-row-reverse justify-center gap-1 rounded-xl px-3 py-3.5"
        iconClassName="opacity-50"
      />
    </div>
  )
}
