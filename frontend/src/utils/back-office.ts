// @ts-nocheck
// not checking for typings here because BackOffice has been put on hold
// when we decide to use/develop the BackOffice again, we can enable type checks
import {
  ProjectModel,
  rewardsSchema,
  WhitelistRequirementModel,
} from "../../shared/models"
import { externalLinkObj, IconLinkType } from "@/components/Button/ExternalLink"
import { timelineEventOptions } from "@/utils/constants"
import { capitalizeFirstLetter } from "@/utils/format"

// helpers for Back Office
export const distributionTypeOptions =
  rewardsSchema.shape.distributionType.options.map((id) => ({
    id,
    label: capitalizeFirstLetter(id),
  }))
export const payoutIntervalOptions =
  rewardsSchema.shape.payoutInterval.options.map((id) => ({
    id,
    label: capitalizeFirstLetter(id),
  }))
export const iconOptions = Object.entries(externalLinkObj).map(
  ([key, value]) => ({
    id: key,
    label: value.label,
  }),
)
export const setValueOptions = {
  shouldDirty: true,
  shouldValidate: true,
}

const initialSaleData: ProjectModel["saleData"] = {
  availableTokens: undefined,
  saleSucceeded: undefined,
  totalAmountRaised: undefined,
  sellOutPercentage: undefined,
  participantCount: undefined,
  averageInvestedAmount: undefined,
}

export type ExtendedProjectModel = ProjectModel & { adminKey: string }

export const getDefaultValues = () => {
  return {
    info: {
      id: "",
      title: "",
      subtitle: "",
      logoUrl: "",
      chain: { name: "", iconUrl: "" },
      origin: "",
      sector: "",
      curator: {
        avatarUrl: "",
        fullName: "",
        position: "",
        socials: [
          {
            url: "",
            iconType: "X_TWITTER" as Exclude<IconLinkType, "NO_ICON">,
            label: "X (ex-Twitter)",
          },
        ],
      },
      projectLinks: [
        {
          url: "",
          iconType: "WEB" as Exclude<IconLinkType, "NO_ICON">,
          label: "Web Link",
        },
      ],
      totalTokensForSale: undefined,
      tge: {
        raiseTarget: undefined,
        projectCoin: {
          iconUrl: "",
          ticker: "",
        },
        fixedTokenPriceInUSD: 0,
        liquidityPool: {
          name: "",
          iconUrl: "",
          lbpType: "",
          lockingPeriod: "",
        },
        tweetUrl: "",
      },
      dataRoom: {
        backgroundImgUrl: "",
        url: "",
      },
      timeline: timelineEventOptions.map((option) => ({
        id: option.id,
        date: undefined,
        label: option.label,
      })),
      whitelistRequirements: [
        {
          type: "HOLD_BORG_IN_WALLET",
          label: "Hold 20000 BORG in your wallet",
          description: "",
          isMandatory: true,
          heldAmount: 20000,
        },
        {
          type: "FOLLOW_ON_X",
          label: "Follow BorgPad on X",
          description: "",
          isMandatory: true,
        },
        {
          type: "DONT_RESIDE_IN_US",
          label: "Don’t reside in the US",
          description: "",
          isMandatory: true,
        },
      ] as WhitelistRequirementModel[],
    },
    saleData: initialSaleData,
    rewards: {
      description: "",
      distributionType: undefined,
      payoutInterval: undefined,
    },

    // this will not be submitted through body or draft saved in local storage
    adminKey: "",
  }
}
