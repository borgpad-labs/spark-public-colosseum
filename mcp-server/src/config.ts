export const config = {
  apiBaseUrl: process.env.SPARKIT_API_BASE_URL || "https://justspark.fun",
  apiTimeout: Number(process.env.SPARKIT_API_TIMEOUT) || 30_000,
} as const;
