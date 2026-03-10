import { useState, useEffect, useCallback } from 'react'

interface CachedData<T> {
  data: T
  timestamp: number
  expiresAt: number
}

interface VolumeCache {
  [key: string]: CachedData<any>
}

const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const VOLUME_CACHE_KEY = 'volume_cache'

export const useVolumeCache = () => {
  const [cache, setCache] = useState<VolumeCache>({})

  // Load cache from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(VOLUME_CACHE_KEY)
      if (cached) {
        const parsedCache = JSON.parse(cached)
        // Clean expired entries
        const now = Date.now()
        const validCache: VolumeCache = {}
        
        Object.entries(parsedCache).forEach(([key, value]: [string, any]) => {
          if (value.expiresAt > now) {
            validCache[key] = value
          }
        })
        
        setCache(validCache)
      }
    } catch (error) {
      console.warn('Failed to load volume cache:', error)
    }
  }, [])

  // Save cache to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(VOLUME_CACHE_KEY, JSON.stringify(cache))
    } catch (error) {
      console.warn('Failed to save volume cache:', error)
    }
  }, [cache])

  const getCachedData = useCallback((key: string) => {
    const cached = cache[key]
    if (!cached) return null
    
    const now = Date.now()
    if (now > cached.expiresAt) {
      // Remove expired entry
      setCache(prev => {
        const newCache = { ...prev }
        delete newCache[key]
        return newCache
      })
      return null
    }
    
    return cached.data
  }, [cache])

  const setCachedData = useCallback((key: string, data: any, customDuration?: number) => {
    const now = Date.now()
    const expiresAt = now + (customDuration || CACHE_DURATION)
    
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: now,
        expiresAt,
      }
    }))
  }, [])

  const clearCache = useCallback(() => {
    setCache({})
    localStorage.removeItem(VOLUME_CACHE_KEY)
  }, [])

  const clearExpiredEntries = useCallback(() => {
    const now = Date.now()
    setCache(prev => {
      const newCache: VolumeCache = {}
      Object.entries(prev).forEach(([key, value]) => {
        if (value.expiresAt > now) {
          newCache[key] = value
        }
      })
      return newCache
    })
  }, [])

  return {
    getCachedData,
    setCachedData,
    clearCache,
    clearExpiredEntries,
    cache,
  }
} 