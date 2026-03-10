import { useRef, useCallback } from 'react'

// Global cache for ongoing requests to prevent duplicates
const ongoingRequests = new Map<string, Promise<unknown>>()

export function useCachedApi<T>(
  key: string,
  apiCall: () => Promise<T>
): [() => Promise<T>, boolean] {
  const isRequestingRef = useRef(false)

  const executeRequest = useCallback(async (): Promise<T> => {
    // Check if there's already an ongoing request for this key
    if (ongoingRequests.has(key)) {
      return ongoingRequests.get(key)! as Promise<T>
    }

    // Check if we're already requesting
    if (isRequestingRef.current) {
      // Wait for the current request to complete
      return new Promise<T>((resolve, reject) => {
        const checkComplete = () => {
          if (ongoingRequests.has(key)) {
            (ongoingRequests.get(key)! as Promise<T>).then(resolve).catch(reject)
          } else {
            setTimeout(checkComplete, 100)
          }
        }
        checkComplete()
      })
    }

    isRequestingRef.current = true

    // Create the request promise
    const requestPromise = apiCall().finally(() => {
      ongoingRequests.delete(key)
      isRequestingRef.current = false
    })

    // Store the promise
    ongoingRequests.set(key, requestPromise)

    return requestPromise
  }, [key, apiCall])

  return [executeRequest, isRequestingRef.current]
} 