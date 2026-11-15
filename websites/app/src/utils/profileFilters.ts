import { chains, getNamespaceForChainId } from 'utils/chains'
import { fetchSubgraph } from 'utils/fetchSubgraph'
import {
  getDateRangeTimestamp,
  getCustomDateTimestamps,
  DateRangeOption,
  FilterState,
  ALL_NETWORK_FILTERS,
} from 'context/FilterContext'

export const PENDING_STATUSES = ['RegistrationRequested', 'ClearingRequested']
export const RESOLVED_STATUSES = ['Registered', 'Absent']

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((value) => b.includes(value))

/**
 * How many groups of the Filters dialog narrow one profile tab, for the count on the Filters
 * button: the tab's statuses and the challenge states (submission tabs only, `tabStatuses`), the
 * date and the networks. A group that cannot change the tab's list is not counted.
 */
export const countProfileFilters = (
  filters: Pick<FilterState, 'status' | 'disputed' | 'hasEverBeenDisputed' | 'dateRange' | 'chainFilters'>,
  tabStatuses?: string[],
): number =>
  [
    !!tabStatuses && !tabStatuses.every((status) => filters.status.includes(status)),
    !!tabStatuses && (!sameSet(filters.disputed, ['true', 'false']) || filters.hasEverBeenDisputed),
    filters.dateRange !== 'all',
    !sameSet(filters.chainFilters, ALL_NETWORK_FILTERS),
  ].filter(Boolean).length

/** The indexer returns at most this many rows per query, whatever `limit` asks for. */
export const INDEXER_ROW_LIMIT = 1000

/** A read stops after this many rows (ten requests), so a runaway list cannot loop on the shared indexer. */
const MAX_ROWS = 10_000

/**
 * Reads every row of a list, 1,000 at a time (the most the indexer returns for one query). The
 * query takes `$first` and `$skip`, returns its rows as `litems`, and orders them by a unique key
 * so pages neither repeat nor skip a row. Most addresses need one request; only lists longer than
 * 1,000 rows ask again. `capped` is true when the read stopped at MAX_ROWS with rows left.
 */
export const fetchAllRows = async <T = any>(
  query: string,
  variables: Record<string, unknown>,
): Promise<{ rows: T[]; capped: boolean }> => {
  const rows: T[] = []
  for (let skip = 0; skip < MAX_ROWS; skip += INDEXER_ROW_LIMIT) {
    const { data } = await fetchSubgraph(query, { ...variables, first: INDEXER_ROW_LIMIT, skip })
    const page: T[] = data?.litems ?? []
    rows.push(...page)
    if (page.length < INDEXER_ROW_LIMIT) return { rows, capped: false }
  }
  return { rows, capped: true }
}

/** Drops rows already seen (a list that changed between two pages of a read can repeat one). */
export const uniqueById = <T extends { id: string }>(rows: T[]): T[] => {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })
}

/** Filters items by chain based on key0 prefix matching. */
export const filterItemsByChain = (items: any[], chainFilters: string[]): any[] => {
  if (chainFilters.length === 0) return items

  const selectedChainIds = chainFilters.filter((id) => id !== 'unknown')
  const includeUnknown = chainFilters.includes('unknown')

  const knownPrefixes = [
    ...new Set(
      chains.map((chain) => {
        if (chain.namespace === 'solana') return 'solana:'
        return `${chain.namespace}:${chain.id}:`
      }),
    ),
  ]

  const selectedPrefixes = selectedChainIds.map((chainId) => {
    const namespace = getNamespaceForChainId(chainId)
    if (namespace === 'solana') return 'solana:'
    return `${namespace}:${chainId}:`
  })

  return items.filter((item: any) => {
    const key0 = item?.key0?.toLowerCase() || ''
    const matchesSelectedChain =
      selectedPrefixes.length > 0
        ? selectedPrefixes.some((prefix) => key0.startsWith(prefix.toLowerCase()))
        : false

    const isUnknownChain = !knownPrefixes.some((prefix) =>
      key0.startsWith(prefix.toLowerCase()),
    )

    return (
      (selectedPrefixes.length > 0 && matchesSelectedChain) ||
      (includeUnknown && isUnknownChain)
    )
  })
}

/** Filters items by date range using latestRequestSubmissionTime. */
export const filterItemsByDateRange = (
  items: any[],
  dateRange: DateRangeOption,
  customDateFrom?: string | null,
  customDateTo?: string | null,
): any[] => {
  if (dateRange === 'custom') {
    const { fromTs, toTs } = getCustomDateTimestamps(customDateFrom ?? null, customDateTo ?? null)
    if (fromTs <= 0 && toTs <= 0) return items
    return items.filter((item: any) => {
      const ts = parseInt(item.latestRequestSubmissionTime, 10)
      if (fromTs > 0 && ts < fromTs) return false
      if (toTs > 0 && ts > toTs) return false
      return true
    })
  }

  const dateRangeTs = getDateRangeTimestamp(dateRange)
  if (dateRangeTs <= 0) return items

  return items.filter((item: any) => {
    const ts = parseInt(item.latestRequestSubmissionTime, 10)
    return ts >= dateRangeTs
  })
}

/** Filters items by text search across props, keys, and basic fields. */
export const filterItemsBySearchTerm = (items: any[], searchTerm: string): any[] => {
  // A pasted address often carries a space or a line break.
  const searchLower = searchTerm.trim().toLowerCase()
  if (!searchLower) return items

  return items.filter((item: any) => {
    const propsText =
      item?.props
        ?.map((prop: any) => `${prop.label}: ${prop.value}`)
        .join(' ')
        .toLowerCase() || ''

    const keysText = [item?.key0, item?.key1, item?.key2, item?.key3, item?.key4]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const basicText = [item.id, item.itemID, item.registryAddress]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const searchableText = `${propsText} ${keysText} ${basicText}`
    return searchableText.includes(searchLower)
  })
}

/** Newest or oldest first by the latest request's submission time; ties keep a stable order. */
export const sortItemsBySubmissionTime = (items: any[], orderDirection: string): any[] => {
  const sign = orderDirection === 'asc' ? 1 : -1
  return items.slice().sort((a, b) => {
    const difference = Number(a.latestRequestSubmissionTime || 0) - Number(b.latestRequestSubmissionTime || 0)
    if (difference !== 0) return sign * difference
    return String(a.id).localeCompare(String(b.id))
  })
}

/** What a profile list is narrowed by. Everything is applied in memory to the list read once. */
export interface ProfileListFilters {
  /** Item statuses to keep; omit to keep every status. */
  statuses?: string[]
  /** Current challenge states to keep ('true' challenged, 'false' unchallenged); omit to keep both. */
  disputed?: string[]
  /** Keep only items with a request that was ever challenged (rows need `everChallenged`). */
  hasEverBeenDisputed?: boolean
  chainFilters: string[]
  dateRange: DateRangeOption
  customDateFrom?: string | null
  customDateTo?: string | null
  searchTerm: string
  orderDirection: string
}

/** Applies a profile list's filters, search and sort (no paging). */
export const applyProfileFilters = (items: any[], filters: ProfileListFilters): any[] => {
  let result = items
  if (filters.statuses) {
    const statuses = filters.statuses
    result = result.filter((item) => statuses.includes(item.status))
  }
  if (filters.disputed) {
    const disputed = filters.disputed
    result = result.filter((item) => disputed.includes(String(!!item.disputed)))
  }
  if (filters.hasEverBeenDisputed) {
    result = result.filter((item) => (item.everChallenged?.length ?? 0) > 0)
  }
  result = filterItemsByChain(result, filters.chainFilters)
  result = filterItemsByDateRange(result, filters.dateRange, filters.customDateFrom, filters.customDateTo)
  result = filterItemsBySearchTerm(result, filters.searchTerm)
  return sortItemsBySubmissionTime(result, filters.orderDirection)
}

/** The rows of one page (1-based), with the page clamped to the last one that exists. */
export const paginateItems = <T>(
  items: T[],
  page: number,
  itemsPerPage: number,
): { items: T[]; page: number; totalPages: number } => {
  const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage))
  const current = Math.min(Math.max(1, page), totalPages)
  const start = (current - 1) * itemsPerPage
  return { items: items.slice(start, start + itemsPerPage), page: current, totalPages }
}
