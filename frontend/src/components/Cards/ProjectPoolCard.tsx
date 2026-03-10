import { Link } from "react-router-dom"

import Img from "../Image/Img"
import { Icon } from "../Icon/Icon"
import Text from "@/components/Text"
import { ProjectModel } from "shared/models"
import { getProjectRoute } from "@/utils/routes"
import { ExpandedProject } from "@/utils/projects-helper"
import { formatCurrencyCompact } from "shared/utils/format"

import topCorner from "@/assets/top-left-corner.svg"
import bottomCorner from "@/assets/bottom-right-corner.svg"

type Props = { project: ExpandedProject | null; isLoading?: boolean }

export const ProjectPoolCard = ({ project, isLoading }: Props) => {
  const projectUrl = getProjectRoute(project as ProjectModel) ?? "#"

  const committedSum = formatCurrencyCompact(project?.investmentIntentSummary?.sum)

  return (
    <Link
      to={projectUrl}
      className="hover:shadow-draft-pick-card transition-draft-pick-card max-w-[346px] rounded-[23px] bg-gradient-to-b from-bd-secondary to-bd-secondary p-[1px] shadow-none duration-500 hover:from-draft-picks/25 hover:to-draft-picks/75"
    >
      <li className="flex aspect-square max-h-[346px] w-full max-w-[346px] flex-col overflow-hidden rounded-[22px] bg-default p-3">
        <div className="relative h-full w-full">
          <Img
            src={project?.info?.squaredThumbnailUrl || project?.info?.thumbnailUrl || project?.info?.logoUrl}
            customClass="h-full rounded-[10px]"
            showFallback
            isFetchingLink={isLoading}
          />
          <div className="absolute left-0 top-0 flex items-start">
            <div className="flex h-[36px] items-center bg-default">
              <div className="flex items-center gap-2 border-r-fg-gray-line/10 px-2 pr-4 md:border-r-[1px]">
                <Img size="4" src={project?.info.chain.iconUrl} isRounded />
                <Text
                  text={project?.info.chain.name}
                  isLoading={isLoading}
                  loadingClass="max-w-[100px]"
                  className="leading-none"
                />
              </div>
              <div className="flex items-center gap-2 pl-4">
                <Text text={project?.info.sector} isLoading={isLoading} className="leading-none" />
              </div>
            </div>

            <img src={topCorner} />
          </div>

          <div className="absolute bottom-0 right-0 flex items-start">
            <img src={bottomCorner} />
            <div className="flex h-[72px] items-end gap-4 bg-default pb-2 pr-1 pt-3">
              <div className="flex h-full flex-col items-center justify-end gap-1">
                <Icon icon="SvgTwoAvatars" className="text-fg-secondary" />
                <span className="text-sm font-semibold ">{project?.investmentIntentSummary?.count ?? 0}</span>
              </div>
              <div className="flex h-full flex-col items-start justify-end gap-1">
                <span className="text-xs text-fg-secondary">Target FDV</span>
                <span className="text-nowrap text-sm font-semibold  tracking-tighter">
                  {project?.info.targetFdv ?? "TBD"}
                </span>
              </div>
              <div className="flex h-full flex-col items-start justify-end gap-2">
                <span className="text-xs text-fg-secondary">Commited</span>
                <span className="text-draft-picks-2 text-2xl font-semibold leading-none tracking-tighter">
                  {committedSum}
                </span>
              </div>
            </div>
          </div>
        </div>
      </li>
    </Link>
  )
}
