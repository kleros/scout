import { useEffect } from 'react'
import { chains, getNamespaceForChainId } from 'utils/chains'
import { getDateRangeTimestamp, DateRangeOption } from 'context/FilterContext'

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
export const filterItemsByDateRange = (items: any[], dateRange: DateRangeOption): any[] => {
  const dateRangeTs = getDateRangeTimestamp(dateRange)
  if (dateRangeTs <= 0) return items

  return items.filter((item: any) => {
    const ts = parseInt(item.latestRequestSubmissionTime, 10)
    return ts >= dateRangeTs
  })
}

/** Filters items by text search across props, keys, and basic fields. */
export const filterItemsBySearchTerm = (items: any[], searchTerm: string): any[] => {
  if (!searchTerm) return items

  const searchLower = searchTerm.toLowerCase()
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

/** Paginates items and returns the slice with total count. */
export const paginateItems = (
  items: any[],
  currentPage: number,
  itemsPerPage: number,
): { items: any[]; totalFiltered: number } => {
  const totalFiltered = items.length
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  return { items: items.slice(startIndex, endIndex), totalFiltered }
}

/** Clears isFilterChanging once the query settles. */
export const useFilterChangeEffect = (
  isFilterChanging: boolean,
  isFetching: boolean,
  setIsFilterChanging: (value: boolean) => void,
) => {
  useEffect(() => {
    if (!isFilterChanging) return
    if (isFetching) return
    const timer = setTimeout(() => setIsFilterChanging(false), 50)
    return () => clearTimeout(timer)
  }, [isFilterChanging, isFetching, setIsFilterChanging])
}
