import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { fetchPolicyHistory, PolicyHistoryEntry } from 'utils/fetchPolicyHistory'

const CACHE_KEY_PREFIX = 'policyHistory'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface CachedData {
  data: PolicyHistoryEntry[]
  timestamp: number
}

const getCached = (registryAddress: string): PolicyHistoryEntry[] | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}-${registryAddress}`)
    if (!cached) return null
    const parsed: CachedData = JSON.parse(cached)
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}-${registryAddress}`)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

const setCache = (registryAddress: string, data: PolicyHistoryEntry[]) => {
  try {
    const cached: CachedData = { data, timestamp: Date.now() }
    localStorage.setItem(`${CACHE_KEY_PREFIX}-${registryAddress}`, JSON.stringify(cached))
  } catch (e) {
    console.error('Error caching policy history:', e)
  }
}

export function usePolicyHistory(registryAddress: string | undefined) {
  const normalizedAddress = registryAddress?.toLowerCase()

  const [cachedData, setCachedData] = useState<PolicyHistoryEntry[] | null>(() =>
    normalizedAddress ? getCached(normalizedAddress) : null
  )

  const query = useQuery({
    queryKey: ['policyHistory', normalizedAddress],
    queryFn: async (): Promise<PolicyHistoryEntry[]> => {
      if (!normalizedAddress) return []

      const entries = await fetchPolicyHistory(normalizedAddress)

      setCache(normalizedAddress, entries)
      return entries
    },
    enabled: !!normalizedAddress,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: cachedData || undefined,
  })

  // Update local cache state when query data changes
  useEffect(() => {
    if (query.data && query.data !== cachedData) {
      setCachedData(query.data)
    }
  }, [query.data, cachedData])

  return query
}
