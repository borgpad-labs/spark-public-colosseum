const TWEET_SEARCH_PARAMS = ["s", "t"]

// extract tweetId from tweet url
export const getTweetIdFromURL = (url: string) => {
  if (!url || url.length < 10) return null
  const newUrl = new URL(url)
  TWEET_SEARCH_PARAMS.forEach((param) => {
    newUrl.searchParams.delete(param)
  })
  const paths = newUrl.toString().split("/")
  const statusIndex = paths.findIndex((path) => path === "status")
  if (!statusIndex) return null
  const idIndex = statusIndex + 1
  const isTweetIdInteger = Number.isInteger(+paths[idIndex])
  const isTweetIdLengthCorrect = paths[idIndex].length === 19
  if (!isTweetIdInteger || !isTweetIdLengthCorrect) return null
  return paths[idIndex]
}
