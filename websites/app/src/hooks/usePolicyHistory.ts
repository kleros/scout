import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  fetchPolicyHistory,
  PolicyFetchMode,
  PolicyHistoryEntry,
} from 'utils/fetchPolicyHistory'

const CACHE_KEY_PREFIX = 'policyHistory'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface CachedEntry {
  data: PolicyHistoryEntry[]
  timestamp: number
}

/**
 * Kept in sync with the historical key so existing localStorage entries from
 * earlier app versions still hit on first load after deploy. New modes get
 * their own suffix. The 'latest' entry is versioned: v1 entries could date the
 * current policy from a re-registration of the same file (see
 * fetchCurrentPolicy), so they are not reused.
 */
const cacheKey = (address: string, mode: PolicyFetchMode): string =>
  mode === 'full'
    ? `${CACHE_KEY_PREFIX}-${address}`
    : `${CACHE_KEY_PREFIX}-${mode}-v2-${address}`

const legacyLatestKey = (address: string): string =>
  `${CACHE_KEY_PREFIX}-latest-${address}`

const getCachedEntry = (
  address: string,
  mode: PolicyFetchMode,
): CachedEntry | null => {
  try {
    const key = cacheKey(address, mode)
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed: CachedEntry = JSON.parse(raw)
    // Every registry has at least one policy: an empty list is a failed read
    // that older versions cached, never an answer to reuse.
    if (
      Date.now() - parsed.timestamp > CACHE_EXPIRY ||
      !Array.isArray(parsed.data) ||
      parsed.data.length === 0
    ) {
      localStorage.removeItem(key)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

const setCachedEntry = (
  address: string,
  mode: PolicyFetchMode,
  data: PolicyHistoryEntry[],
) => {
  // Never remember an empty result for a day (see getCachedEntry).
  if (data.length === 0) return
  try {
    const entry: CachedEntry = { data, timestamp: Date.now() }
    localStorage.setItem(cacheKey(address, mode), JSON.stringify(entry))
    if (mode === 'latest') localStorage.removeItem(legacyLatestKey(address))
  } catch (e) {
    console.error('Error caching policy history:', e)
  }
}

/**
 * Returns the registration-policy history for a registry.
 *
 * @param mode
 *   - `'full'` (default): every policy ever. Used by the Previous Policies
 *     modal and attachment display.
 *   - `'latest'`: a single-entry array with the current active policy. Used
 *     by the "updated X ago" badge — backward-scans the chain back to the
 *     last real policy change (a few seconds, vs ~8-24s for a full scan).
 *
 * When `'latest'` is requested and a fresh `'full'` cache exists, the current
 * entry is derived from it without any network call — so a user who has
 * already opened Previous Policies gets an instant badge afterwards.
 */
export function usePolicyHistory(
  registryAddress: string | undefined,
  mode: PolicyFetchMode = 'full',
) {
  const normalized = registryAddress?.toLowerCase()

  const cachedEntry = useMemo(
    () => (normalized ? getCachedEntry(normalized, mode) : null),
    [normalized, mode],
  )

  return useQuery({
    queryKey: ['policyHistory', normalized, mode],
    queryFn: async (): Promise<PolicyHistoryEntry[]> => {
      if (!normalized) return []

      // Cross-mode reuse: if the 'full' cache is fresh, derive 'latest' from
      // it for free instead of doing another RPC scan.
      if (mode === 'latest') {
        const fullCached = getCachedEntry(normalized, 'full')
        if (fullCached) {
          const current = fullCached.data.find((e) => e.endDate === null)
          const derived = current ? [current] : []
          setCachedEntry(normalized, 'latest', derived)
          return derived
        }
      }

      const entries = await fetchPolicyHistory(normalized, mode)
      setCachedEntry(normalized, mode, entries)

      // Write-through: a fresh 'full' fetch also warms the 'latest' cache,
      // so subsequent badge renders are instant.
      if (mode === 'full' && entries.length > 0) {
        const current = entries.find((e) => e.endDate === null)
        if (current) setCachedEntry(normalized, 'latest', [current])
      }

      return entries
    },
    enabled: !!normalized,
    initialData: cachedEntry?.data,
    initialDataUpdatedAt: cachedEntry?.timestamp,
    staleTime: mode === 'latest' ? 60 * 60 * 1000 : CACHE_EXPIRY,
    gcTime: CACHE_EXPIRY,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  })
}
