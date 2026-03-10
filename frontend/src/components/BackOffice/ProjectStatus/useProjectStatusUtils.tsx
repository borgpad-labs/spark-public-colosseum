export const useProjectStatusUtils = () => {
  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A"
    try {
      const dateObj = date instanceof Date ? date : new Date(date)
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (_error) {
      return "Invalid date"
    }
  }

  const getFileBaseUrl = (projectId: string, cluster: string = "mainnet") => {
    const isDevnet = cluster === "devnet"
    const baseDomain = isDevnet ? 'files.staging.borgpad.com' : 'files.borgpad.com'
    return `https://${baseDomain}/${projectId}/nft-metadata/`
  }

  return {
    formatDate,
    getFileBaseUrl
  }
} 