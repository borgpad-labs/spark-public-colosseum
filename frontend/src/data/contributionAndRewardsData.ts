import { addMonths } from "date-fns/addMonths"

// TODO @deprecate this whole file

export type ContributionAndRewardsType = {
  // sections: Your Contribution and Your Rewards
  claimPositions: {
    mainPosition: {
      borg: {
        claimed: number
        total: number
      }
      projectTokens: {
        claimed: number
        total: number
      }
    }
    rewards: {
      totalTokens: number
      claimedTokens: number
      payoutSchedule: PayoutScheduleType[]
    }
  }
}

export type PayoutScheduleType = {
  date: string | Date
  amount: number
  isClaimed: boolean
}

