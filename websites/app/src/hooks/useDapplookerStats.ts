import { useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { useGraphqlBatcher } from './queries/useGraphqlBatcher'
import { registryMap, getChainId } from 'utils/items'
import { chains } from 'utils/chains'
import {
  DAPPLOOKER_API_KEY,
  SUBGRAPH_GNOSIS_ENDPOINT,
  SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT,
  CURATORS_CHART_ID,
  TOTAL_SUBMISSIONS_CHART_ID,
} from 'consts'

interface RegistryData {
  id: string
  numberOfRegistered: string
  numberOfAbsent: string
  numberOfRegistrationRequested: string
  numberOfClearingRequested: string
  numberOfChallengedRegistrations: string
  numberOfChallengedClearing: string
}

interface ItemData {
  id: string
  status: string
  disputed: boolean
  latestRequestSubmissionTime: string
  registryAddress: string
  key0?: string
  key1?: string
  key2?: string
}

interface DapplookerStatsData {
  totalAssetsVerified: number
  totalSubmissions: number
  /** null when neither DappLooker nor the indexer answered. */
  totalCurators: number | null
  /** null when the Kleros court data service did not answer. */
  totalSolvedDisputes: number | null
  tokens: {
    assetsVerified: number
    assetsVerifiedChange: number
  }
  cdn: {
    assetsVerified: number
    assetsVerifiedChange: number
  }
  singleTags: {
    assetsVerified: number
    assetsVerifiedChange: number
  }
  tagQueries: {
    assetsVerified: number
    assetsVerifiedChange: number
  }
  submissionsVsDisputes: {
    submissions: number[]
    disputes: number[]
    dates: string[]
  }
  chainRanking: {
    rank: number
    /** Chain reference as in utils/chains ("1", "137", ...). */
    chainId: string
    items: number
  }[]
}

const CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchInterval: false,
  retry: 2,
} as const

const REGISTRY_ADDRESSES = Object.values(registryMap)

const DAY_MS = 24 * 60 * 60 * 1000
const WINDOW_DAYS = 30
const PAGE_SIZE = 1000
// A safety stop for the paging loops (100,000 rows), far above today's volume.
const MAX_PAGES = 100

// Two references for Solana mainnet are in use; count them as one chain.
const CHAIN_ALIASES: Record<string, string> = {
  '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
}
const KNOWN_CHAIN_IDS = new Set(chains.map((c) => c.id))

// Fetch curators count: DappLooker chart API (primary) → Curate subgraph unique requesters/challengers (fallback).
// Returns null when neither answers, so the page can say so instead of showing 0 or a partial count.
const fetchCuratorsCount = async (): Promise<number | null> => {
  // Try DappLooker chart API first
  if (DAPPLOOKER_API_KEY) {
    try {
      const url = `https://api.dapplooker.com/chart/${CURATORS_CHART_ID}?api_key=${DAPPLOOKER_API_KEY}&output_format=json`
      const response = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      })

      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data) && data.length > 0) {
          const firstRow = data[0]
          const value = firstRow.count ?? firstRow.Count ?? firstRow.curators ?? firstRow.Curators ?? Object.values(firstRow)[0]
          const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)
          if (!isNaN(parsed) && parsed > 0) return parsed
        }
      }
    } catch { /* fall through to subgraph */ }
  }

  // Fallback: count unique requesters + challengers from Curate subgraph
  try {
    const uniqueAddresses = new Set<string>()
    let offset = 0

    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await fetch(SUBGRAPH_GNOSIS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query CuratorStats($offset: Int!, $registryAddresses: [String!]!) {
              LItem(
                limit: 1000,
                offset: $offset,
                where: { registryAddress: { _in: $registryAddresses } }
              ) {
                requests {
                  requester
                  challenger
                }
              }
            }
          `,
          variables: { offset, registryAddresses: REGISTRY_ADDRESSES },
        }),
      })

      // A page that fails makes the count wrong: report "unknown", not a partial number.
      if (!response.ok) return null
      const result = await response.json()
      if (!result.data) return null
      const items = result.data.LItem || []

      for (const item of items) {
        for (const req of (item.requests || [])) {
          if (req.requester) uniqueAddresses.add(req.requester.toLowerCase())
          if (req.challenger) uniqueAddresses.add(req.challenger.toLowerCase())
        }
      }

      if (items.length < 1000) break
      offset += 1000
    }

    return uniqueAddresses.size
  } catch {
    return null
  }
}

// Fetch total submissions from DappLooker chart API
const fetchTotalSubmissions = async (): Promise<number | null> => {
  if (!DAPPLOOKER_API_KEY) return null
  try {
    const url = `https://api.dapplooker.com/chart/${TOTAL_SUBMISSIONS_CHART_ID}?api_key=${DAPPLOOKER_API_KEY}&output_format=json`
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    })

    if (response.ok) {
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        const firstRow = data[0]
        const value = firstRow.count ?? firstRow.Count ?? firstRow.total ?? firstRow.Total ?? Object.values(firstRow)[0]
        const parsed = typeof value === 'number' ? value : parseInt(String(value), 10)
        if (!isNaN(parsed) && parsed > 0) return parsed
      }
    }
  } catch { /* fall through */ }
  return null
}

// Fetch total solved disputes from the Kleros Display subgraph: the ruled disputes raised by Scout's
// four registries, in whichever court they were judged. Returns null when the service does not answer.
const fetchTotalSolvedDisputes = async (): Promise<number | null> => {
  try {
    let total = 0
    let skip = 0

    for (let page = 0; page < MAX_PAGES; page++) {
      const response = await fetch(SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query SolvedDisputes($first: Int!, $skip: Int!, $arbitrated: [String!]!) {
              disputes(
                first: $first,
                skip: $skip,
                where: { arbitrated_in: $arbitrated, ruled: true }
              ) {
                id
              }
            }
          `,
          variables: { first: 1000, skip, arbitrated: REGISTRY_ADDRESSES },
        }),
      })

      if (!response.ok) return null
      const result = await response.json()
      if (!result.data) return null
      const disputes = result.data.disputes || []
      total += disputes.length

      if (disputes.length < 1000) break
      skip += 1000
    }

    return total
  } catch {
    return null
  }
}

const REGISTRIES_QUERY = gql`
  query CurateRegistryStats($registries: [String!]!) {
    lregistries: LRegistry(where: { id: { _in: $registries } }) {
      id
      numberOfRegistered
      numberOfAbsent
      numberOfRegistrationRequested
      numberOfClearingRequested
      numberOfChallengedRegistrations
      numberOfChallengedClearing
    }
  }
`

// Only what the chart and the chain ranking use. The offset and the start time are integers this
// file computes, so they can be written into the query.
const getRecentItemsQuery = (sinceSeconds: number, offset: number) => gql`
  query CurateRecentItems($registries: [String!]!) {
    litems: LItem(
      limit: ${PAGE_SIZE},
      offset: ${offset},
      order_by: [{ latestRequestSubmissionTime: desc }, { id: asc }],
      where: {
        latestRequestSubmissionTime: { _gt: "${sinceSeconds}" },
        registryAddress: { _in: $registries }
      }
    ) {
      id
      status
      disputed
      latestRequestSubmissionTime
      registryAddress
      key0
      key1
      key2
    }
  }
`

const calculateRegistryStats = (
  registries: RegistryData[],
  registryId: string,
  fallbackItems?: ItemData[],
) => {
  // Try direct match first
  let registry = registries.find(
    (r) => r.id.toLowerCase() === registryId.toLowerCase(),
  )

  // If not found, try matching without '0x' prefix in case of format difference
  if (!registry && registryId.startsWith('0x')) {
    registry = registries.find(
      (r) => r.id.toLowerCase() === registryId.slice(2).toLowerCase(),
    )
  }

  // If still not found, try adding '0x' prefix in case registry ID doesn't have it
  if (!registry && !registryId.startsWith('0x')) {
    registry = registries.find(
      (r) => r.id.toLowerCase() === `0x${registryId}`.toLowerCase(),
    )
  }

  if (!registry) {
    // Fallback: Calculate from items if available
    if (fallbackItems) {
      const registryItems = fallbackItems.filter(
        (item) =>
          item.registryAddress?.toLowerCase() === registryId.toLowerCase(),
      )

      const registered = registryItems.filter(
        (item) => item.status === 'Registered',
      ).length
      const registrationRequested = registryItems.filter(
        (item) => item.status === 'RegistrationRequested',
      ).length
      const clearingRequested = registryItems.filter(
        (item) => item.status === 'ClearingRequested',
      ).length
      const totalSubmissions =
        registered + registrationRequested + clearingRequested

      return {
        assetsVerified: registered,
        assetsVerifiedChange: totalSubmissions,
      }
    }

    return { assetsVerified: 0, assetsVerifiedChange: 0 }
  }

  const registered = parseInt(registry.numberOfRegistered, 10) || 0
  const registrationRequested =
    parseInt(registry.numberOfRegistrationRequested, 10) || 0
  const clearingRequested =
    parseInt(registry.numberOfClearingRequested, 10) || 0

  const totalSubmissions =
    registered + registrationRequested + clearingRequested

  return {
    assetsVerified: registered,
    assetsVerifiedChange: totalSubmissions,
  }
}

/** Counts per UTC day, oldest first, for the WINDOW_DAYS days ending today (UTC). */
const bucketByUtcDay = (items: ItemData[], now: number) => {
  const todayStart = Math.floor(now / DAY_MS) * DAY_MS
  const windowStart = todayStart - (WINDOW_DAYS - 1) * DAY_MS
  const submissions = new Array<number>(WINDOW_DAYS).fill(0)
  const disputes = new Array<number>(WINDOW_DAYS).fill(0)

  for (const item of items) {
    const time = parseInt(item.latestRequestSubmissionTime, 10) * 1000
    const index = Math.floor((time - windowStart) / DAY_MS)
    if (index < 0 || index >= WINDOW_DAYS) continue
    submissions[index] += 1
    if (item.disputed) disputes[index] += 1
  }

  const dates = Array.from({ length: WINDOW_DAYS }, (_, i) =>
    new Date(windowStart + i * DAY_MS).toLocaleDateString('en', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }),
  )

  return { submissions, disputes, dates }
}

const calculateChainRanking = (items: ItemData[]) => {
  const chainCounts = new Map<string, number>()

  items.forEach((item) => {
    const rawId = getChainId(item)
    if (!rawId) return
    const chainId = CHAIN_ALIASES[rawId] ?? rawId
    if (!KNOWN_CHAIN_IDS.has(chainId)) return
    chainCounts.set(chainId, (chainCounts.get(chainId) || 0) + 1)
  })

  return Array.from(chainCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([chainId, count], index) => ({
      rank: index + 1,
      chainId,
      items: count,
    }))
}

// Pages asked together leave in the same batched request (the indexer counts requests, not queries),
// and 30 days are about 1,100 items today: two pages per round cover them in one request.
const PAGES_PER_ROUND = 2

const fetchRecentItems = async (graphqlBatcher: any, sinceSeconds: number): Promise<ItemData[]> => {
  const items: ItemData[] = []
  for (let first = 0; first < MAX_PAGES; first += PAGES_PER_ROUND) {
    const pages = (await Promise.all(
      Array.from({ length: PAGES_PER_ROUND }, (_, i) =>
        graphqlBatcher.request(
          `stats-items-${first + i}`,
          getRecentItemsQuery(sinceSeconds, (first + i) * PAGE_SIZE),
          { registries: REGISTRY_ADDRESSES },
        ),
      ),
    )) as Array<{ litems?: ItemData[] }>
    const pageItems = pages.map((page) => page?.litems ?? [])
    pageItems.forEach((page) => items.push(...page))
    if (pageItems[pageItems.length - 1].length < PAGE_SIZE) break
  }
  return items
}

const fetchKlerosSubgraphData = async (
  graphqlBatcher: any,
): Promise<DapplookerStatsData> => {
  const now = Date.now()
  // The chain ranking covers the last 30 days; the chart buckets the same items by UTC day.
  const sinceSeconds = Math.floor((now - WINDOW_DAYS * DAY_MS) / 1000)

  // The registry counters and the recent items are this card's core: if the indexer does not answer,
  // the query fails (and is retried) rather than showing zeros. Curators and solved disputes come from
  // other services and are shown as unavailable on their own when those fail.
  const [registriesResult, items, totalCurators, totalSolvedDisputes, dapplookerSubmissions] = await Promise.all([
    graphqlBatcher.request(
      `stats-registries-${now}-${Math.random()}`,
      REGISTRIES_QUERY,
      { registries: REGISTRY_ADDRESSES },
    ) as Promise<{ lregistries?: RegistryData[] }>,
    fetchRecentItems(graphqlBatcher, sinceSeconds),
    fetchCuratorsCount(),
    fetchTotalSolvedDisputes(),
    fetchTotalSubmissions(),
  ])

  const registries = registriesResult?.lregistries ?? []
  if (registries.length === 0) {
    throw new Error('The registry statistics did not load.')
  }

  // Calculate totals — prefer DappLooker chart data
  const subgraphSubmissions = registries.reduce((total, reg) => {
    return (
      total +
      (parseInt(reg.numberOfRegistered, 10) || 0) +
      (parseInt(reg.numberOfRegistrationRequested, 10) || 0) +
      (parseInt(reg.numberOfClearingRequested, 10) || 0)
    )
  }, 0)
  const totalSubmissions = dapplookerSubmissions ?? subgraphSubmissions

  const submissionsVsDisputes = bucketByUtcDay(items, now)
  const chainRanking = calculateChainRanking(items)

  const tokensStats = calculateRegistryStats(
    registries,
    registryMap['tokens'],
    items,
  )
  const cdnStats = calculateRegistryStats(registries, registryMap['cdn'], items)
  const singleTagsStats = calculateRegistryStats(
    registries,
    registryMap['single-tags'],
    items,
  )
  const tagQueriesStats = calculateRegistryStats(
    registries,
    registryMap['tags-queries'],
    items,
  )

  // Total verified addresses: dynamic sum of all registries
  const totalAssetsVerified = registries.reduce((total, reg) => {
    return total + (parseInt(reg.numberOfRegistered, 10) || 0)
  }, 0)

  return {
    totalAssetsVerified,
    totalSubmissions,
    totalCurators,
    totalSolvedDisputes,
    tokens: tokensStats,
    cdn: cdnStats,
    singleTags: singleTagsStats,
    tagQueries: tagQueriesStats,
    submissionsVsDisputes,
    chainRanking,
  }
}

export const useDapplookerStats = () => {
  const graphqlBatcher = useGraphqlBatcher()

  return useQuery({
    queryKey: ['dapplooker-stats'],
    // Errors propagate: react-query retries, then reports isError so the page can say the
    // statistics did not load instead of showing zeros.
    queryFn: (): Promise<DapplookerStatsData> => fetchKlerosSubgraphData(graphqlBatcher),
    ...CACHE_CONFIG,
  })
}
