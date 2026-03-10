import { ProjectModel } from "shared/models"

export const getRewardDistributionMessage = (project: ProjectModel) => {
  const rewardDistribution = getRewardDistributionConfig(project)
  if (!rewardDistribution) return "TBD"

  const fractionPerMonthAfterTge = rewardDistribution.afterTge.rewardRatio / rewardDistribution.afterTge.numberOfPayments

  if (rewardDistribution.afterTge.numberOfPayments === 0) return "100% unlock at TGE"

  return `1/${1/rewardDistribution.atTge.rewardRatio} at TGE and 1/${1/fractionPerMonthAfterTge} for ${rewardDistribution.afterTge.numberOfPayments} months`
}

const getRewardDistributionConfig = (project: ProjectModel) => {
  if (project.config?.rewardDistribution) {
    return project.config.rewardDistribution
  }
  if (!project.config?.rewardsDistributionTimeInMonths) {
    return null
  }
    
  // avoid breaking changes
  const numberOfPayments = project.config.rewardsDistributionTimeInMonths
  const rewardDistributionPerOnePayout = 1 / numberOfPayments
  const numberOfPaymentsAfterTge = numberOfPayments - 1

  return {
    atTge:{
      rewardRatio: rewardDistributionPerOnePayout,
    },
    afterTge:{
      rewardRatio: rewardDistributionPerOnePayout * numberOfPaymentsAfterTge,
      numberOfPayments: numberOfPaymentsAfterTge,
    },
  }
}