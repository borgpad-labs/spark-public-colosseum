const CACHE_BUST_KEY_ELIGIBILITY_STATUS = "cache-bust-eligibility-status"
const CACHE_BUST_KEY_INVESTMENT_INTENT = "cache-bust-investment-intent"

export const eligibilityStatusCacheBust = {
  getCacheBustStatus: () => localStorage.getItem(CACHE_BUST_KEY_ELIGIBILITY_STATUS),
  invokeCacheBusting: () => localStorage.setItem(CACHE_BUST_KEY_ELIGIBILITY_STATUS, "1"),
  removeCacheBustStatus: () => localStorage.removeItem(CACHE_BUST_KEY_ELIGIBILITY_STATUS),
}

export const investmentIntentSummaryCacheBust = {
  getCacheBustStatus: () => localStorage.getItem(CACHE_BUST_KEY_INVESTMENT_INTENT),
  invokeCacheBusting: () => localStorage.setItem(CACHE_BUST_KEY_INVESTMENT_INTENT, "1"),
  removeCacheBustStatus: () => localStorage.removeItem(CACHE_BUST_KEY_INVESTMENT_INTENT),
}
