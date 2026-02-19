import { useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { useGraphqlBatcher } from './queries/useGraphqlBatcher'
import { registryMap } from 'utils/items'
import {
  DAPPLOOKER_API_KEY,
  SUBGRAPH_GNOSIS_ENDPOINT,
  SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT,
  XDAI_CURATION_COURT_ID,
  CURATORS_CHART_ID,
  TOTAL_SUBMISSIONS_CHART_ID,
} from 'consts'

type ChainName = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base'

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
  key3?: string
  key4?: string
  requests: Array<{
    submissionTime: string
    requester: string
    challenger?: string
    disputed: boolean
    deposit: string
  }>
}

interface SubgraphResponse {
  lregistries: RegistryData[]
  litems: ItemData[]
}

interface DapplookerStatsData {
  totalAssetsVerified: number
  totalSubmissions: number
  totalCurators: number
  totalSolvedDisputes: number
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
    chain: string
    items: number
  }[]
}

const CHAIN_PREFIXES: Record<string, ChainName> = {
  'eip155:1:': 'ethereum',
  'eip155:137:': 'polygon',
  'eip155:42161:': 'arbitrum',
  'eip155:10:': 'optimism',
  'eip155:8453:': 'base',
}

const CACHE_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchInterval: false,
  retry: 2,
} as const

const EMPTY_STATS: DapplookerStatsData = {
  totalAssetsVerified: 0,
  totalSubmissions: 0,
  totalCurators: 0,
  totalSolvedDisputes: 0,
  tokens: { assetsVerified: 0, assetsVerifiedChange: 0 },
  cdn: { assetsVerified: 0, assetsVerifiedChange: 0 },
  singleTags: { assetsVerified: 0, assetsVerifiedChange: 0 },
  tagQueries: { assetsVerified: 0, assetsVerifiedChange: 0 },
  submissionsVsDisputes: { submissions: [], disputes: [], dates: [] },
  chainRanking: [],
}


const REGISTRY_ADDRESSES = Object.values(registryMap)

// Fetch curators count: DappLooker chart API (primary) → Curate subgraph unique requesters/challengers (fallback)
const fetchCuratorsCount = async (): Promise<number> => {
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
    let hasMore = true

    while (hasMore) {
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

      if (!response.ok) break

      const result = await response.json()
      const items = result.data?.LItem || []

      for (const item of items) {
        for (const req of (item.requests || [])) {
          if (req.requester) uniqueAddresses.add(req.requester.toLowerCase())
          if (req.challenger) uniqueAddresses.add(req.challenger.toLowerCase())
        }
      }

      if (items.length < 1000) hasMore = false
      else offset += 1000
    }

    return uniqueAddresses.size
  } catch {
    return 0
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

// Fetch total solved disputes from Kleros Display subgraph (xDAI Curation Court)
const fetchTotalSolvedDisputes = async (): Promise<number> => {
  try {
    let total = 0
    let skip = 0
    let hasMore = true

    while (hasMore) {
      const response = await fetch(SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            query SolvedDisputes($first: Int!, $skip: Int!, $court: String!) {
              disputes(
                first: $first,
                skip: $skip,
                where: { court: $court, ruled: true }
              ) {
                id
              }
            }
          `,
          variables: { first: 1000, skip, court: XDAI_CURATION_COURT_ID },
        }),
      })

      if (!response.ok) break

      const result = await response.json()
      const disputes = result.data?.disputes || []
      total += disputes.length

      if (disputes.length < 1000) hasMore = false
      else skip += 1000
    }

    return total
  } catch {
    return 0
  }
}

const getCurateStatsQuery = () => {
  const thirtyDaysAgo = Math.floor(
    (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000,
  )

  return gql`
    query CurateStats {
      lregistries: LRegistry(
        where: { id:{
          _in: [
          "0x66260c69d03837016d88c9877e61e08ef74c59f2",
          "0xae6aaed5434244be3699c56e7ebc828194f26dc3",
          "0x957a53a994860be4750810131d9c876b2f52d6e1",
          "0xee1502e29795ef6c2d60f8d7120596abe3bad990"
        ]}}
      ) {
        id
        numberOfRegistered
        numberOfAbsent
        numberOfRegistrationRequested
        numberOfClearingRequested
        numberOfChallengedRegistrations
        numberOfChallengedClearing
      }
      litems: LItem(
        limit: 1000,
        order_by: {latestRequestSubmissionTime : desc }
        where: { latestRequestSubmissionTime: {_gt: "${thirtyDaysAgo}"} }
      ) {
      id
      status
      disputed
      latestRequestSubmissionTime
      registryAddress
      requests(limit: 1, order_by: {submissionTime: desc}) {
        submissionTime
        requester
        challenger
        disputed
        deposit
      }
      key0
      key1
      key2
      key3
      key4
    }
  }
  `
}


const getChainFromKey = (key0: string): ChainName | null => {
  for (const [prefix, chain] of Object.entries(CHAIN_PREFIXES)) {
    if (key0.startsWith(prefix)) {
      return chain
    }
  }
  return null
}

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

const generateDateRange = (days: number): Date[] => {
  const now = new Date()
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now)
    date.setDate(date.getDate() - (days - 1 - i))
    return date
  })
}

const filterItemsByDate = (
  items: ItemData[],
  targetDate: Date,
  includeDisputed = false,
): number => {
  const dayStart = new Date(targetDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(targetDate)
  dayEnd.setHours(23, 59, 59, 999)

  return items.filter((item) => {
    const submissionTime = new Date(
      parseInt(item.latestRequestSubmissionTime, 10) * 1000,
    )
    const isInDateRange = submissionTime >= dayStart && submissionTime <= dayEnd
    return includeDisputed ? isInDateRange && item.disputed : isInDateRange
  }).length
}

const calculateChainRanking = (items: ItemData[]) => {
  const chainCounts = new Map<ChainName, number>()

  items.forEach((item) => {
    const key0 = item?.key0
    if (!key0) return

    const chain = getChainFromKey(key0)
    if (chain) {
      chainCounts.set(chain, (chainCounts.get(chain) || 0) + 1)
    }
  })

  return Array.from(chainCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([chain, count], index) => ({
      rank: index + 1,
      chain,
      items: count,
    }))
}

const fetchKlerosSubgraphData = async (
  graphqlBatcher: any,
): Promise<DapplookerStatsData> => {
  const statsRequestId = `stats-${Date.now()}-${Math.random()}`

  const [statsResult, totalCurators, totalSolvedDisputes, dapplookerSubmissions] = await Promise.all([
    graphqlBatcher.request(
      statsRequestId,
      getCurateStatsQuery(),
    ) as Promise<SubgraphResponse>,
    fetchCuratorsCount(),
    fetchTotalSolvedDisputes(),
    fetchTotalSubmissions(),
  ])

  const registries = statsResult.lregistries || []
  const items = statsResult.litems || []

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

  // Generate time series data
  const last7Days = generateDateRange(30)
  const submissionsData = last7Days.map((date) =>
    filterItemsByDate(items, date),
  )
  const disputesData = last7Days.map((date) =>
    filterItemsByDate(items, date, true),
  )
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

  // Curators: DappLooker chart API → Curate subgraph unique requesters/challengers

  return {
    totalAssetsVerified,
    totalSubmissions,
    totalCurators,
    totalSolvedDisputes,
    tokens: tokensStats,
    cdn: cdnStats,
    singleTags: singleTagsStats,
    tagQueries: tagQueriesStats,
    submissionsVsDisputes: {
      submissions: submissionsData,
      disputes: disputesData,
      dates: last7Days.map((d) =>
        d.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }),
      ),
    },
    chainRanking,
  }
}

export const useDapplookerStats = () => {
  const graphqlBatcher = useGraphqlBatcher()

  return useQuery({
    queryKey: ['dapplooker-stats'],
    queryFn: async (): Promise<DapplookerStatsData> => {
      try {
        return await fetchKlerosSubgraphData(graphqlBatcher)
      } catch (error) {
        return EMPTY_STATS
      }
    },
    ...CACHE_CONFIG,
  })
}
