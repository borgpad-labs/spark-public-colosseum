import React from "react"
import { analystRolesObj, GetListOfAnalysisResponse } from "shared/schemas/analysis-schema"
import { Button } from "../Button/Button"
import { Icon } from "../Icon/Icon"
import Img from "../Image/Img"

type Props = {
  card: GetListOfAnalysisResponse["analysisList"][number]
}

const AnalysisCard = ({ card }: Props) => {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-bd-secondary p-4">
      <div className="flex flex-row items-start gap-4">
        <Img size="8" src={card.analyst.twitterAvatar} isRounded customClass="mt-1" />
        <div className="flex flex-col">
          <div className="flex flex-wrap items-start gap-x-2 overflow-hidden ">
            <span className="truncate text-sm font-semibold text-fg-primary">{card.analyst.twitterName}</span>
            <span className="truncate text-sm font-normal text-fg-tertiary">@{card.analyst.twitterUsername}</span>
          </div>
          <span className="truncate text-sm font-normal text-fg-secondary">
            {analystRolesObj[card.analysis.analystRole]}
          </span>
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="flex min-w-[100px] flex-col">
          <span className="truncate text-sm font-semibold text-fg-tertiary">Impressions</span>
          <span className="truncate text-sm font-normal text-fg-primary">
            {card.analysis.impressions.toLocaleString()}
          </span>
        </div>
        <div className="flex flex-col">
          <span className="truncate text-sm font-semibold text-fg-tertiary">Likes</span>
          <span className="truncate text-sm font-normal text-fg-primary">{card.analysis.likes.toLocaleString()}</span>
        </div>
      </div>
      <a href={card.analysis.articleUrl} target="_blank" rel="noreferrer" className="w-full">
        <Button
          color="tertiary"
          btnText="Read"
          textClassName="text-sm font-medium"
          className="w-full rounded-lg py-2"
          suffixElement={<Icon icon="SvgExternalLink" className="text-fg-secondary" />}
        />
      </a>
    </div>
  )
}

export default AnalysisCard
