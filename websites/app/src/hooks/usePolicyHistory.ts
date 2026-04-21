import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchPolicyHistory, PolicyHistoryEntry } from 'utils/fetchPolicyHistory'

const CACHE_KEY_PREFIX = 'policyHistory'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface CachedEntry {
  data: PolicyHistoryEntry[]
  timestamp: number
}

const getCachedEntry = (registryAddress: string): CachedEntry | null => {
  try {
    const cached = localStorage.getItem(`${CACHE_KEY_PREFIX}-${registryAddress}`)
    if (!cached) return null
    const parsed: CachedEntry = JSON.parse(cached)
    if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}-${registryAddress}`)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const setCachedEntry = (registryAddress: string, data: PolicyHistoryEntry[]) => {
  try {
    const entry: CachedEntry = { data, timestamp: Date.now() }
    localStorage.setItem(`${CACHE_KEY_PREFIX}-${registryAddress}`, JSON.stringify(entry))
  } catch (e) {
    console.error('Error caching policy history:', e)
  }
}

export function usePolicyHistory(registryAddress: string | undefined) {
  const normalizedAddress = registryAddress?.toLowerCase()

  // Recomputed every time the address changes, so each registry
  // only ever sees its own cached entry. Prevents leaking a previous
  // registry's data into a new one during navigation.
  const cachedEntry = useMemo(
    () => (normalizedAddress ? getCachedEntry(normalizedAddress) : null),
    [normalizedAddress]
  )

  return useQuery({
    queryKey: ['policyHistory', normalizedAddress],
    queryFn: async (): Promise<PolicyHistoryEntry[]> => {
      if (!normalizedAddress) return []

      const entries = await fetchPolicyHistory(normalizedAddress)

      setCachedEntry(normalizedAddress, entries)
      return entries
    },
    enabled: !!normalizedAddress,
    initialData: cachedEntry?.data,
    initialDataUpdatedAt: cachedEntry?.timestamp,
    staleTime: CACHE_EXPIRY,
    gcTime: CACHE_EXPIRY,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}
