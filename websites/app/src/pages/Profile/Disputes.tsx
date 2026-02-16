import React, { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Skeleton from 'react-loading-skeleton'
import DisputeCard from './DisputeCard'
import { useProfileFilters } from 'context/FilterContext'
import { useScrollTop } from 'hooks/useScrollTop'
import { StyledPagination } from 'components/StyledPagination'
import { registryMap } from 'utils/items'
import { filterItemsByChain, filterItemsByDateRange, filterItemsBySearchTerm, paginateItems, useFilterChangeEffect } from 'utils/profileFilters'
import { fetchSubgraph } from 'utils/fetchSubgraph'
import { EmptyState } from 'styles/commonStyles'

// Only query disputes from our 4 registries
const REGISTRY_ADDRESSES = Object.values(registryMap)

// Query to fetch all disputes where user is involved (as requester or challenger)
const QUERY = `
query Disputes($userAddress: String!, $registryAddresses: [String!]!, $first: Int!, $skip: Int!, $orderDirection: order_by!) {
  # Disputes where user is the requester
  asRequester: LItem(
    where: {
      registryAddress: {_in: $registryAddresses}
      requests: {
        disputed: {_eq: true}
        requester: {_eq: $userAddress}
      }
    }
    limit: $first
    offset: $skip
    order_by: {latestRequestSubmissionTime: $orderDirection}
  ) {
    id
    itemID
    registryAddress
    latestRequestSubmissionTime
    status
    disputed
    data
    key0
    key1
    key2
    key3
    key4
    props {
      value
      label
    }
    requests(where: {disputed: {_eq: true}}, order_by: {submissionTime: desc}, limit: 1) {
      requestType
      requester
      challenger
      deposit
      submissionTime
      disputed
      disputeID
      disputeOutcome
      resolved
      resolutionTime
    }
  }
  # Disputes where user is the challenger
  asChallenger: LItem(
    where: {
      registryAddress: {_in: $registryAddresses}
      requests: {
        disputed: {_eq: true}
        challenger: {_eq: $userAddress}
      }
    }
    limit: $first
    offset: $skip
    order_by: {latestRequestSubmissionTime: $orderDirection}
  ) {
    id
    itemID
    registryAddress
    latestRequestSubmissionTime
    status
    disputed
    data
    key0
    key1
    key2
    key3
    key4
    props {
      value
      label
    }
    requests(where: {disputed: {_eq: true}}, order_by: {submissionTime: desc}, limit: 1) {
      requestType
      requester
      challenger
      deposit
      submissionTime
      disputed
      disputeID
      disputeOutcome
      resolved
      resolutionTime
    }
  }
}
`

interface Props {
  totalItems: number
  address?: string
  chainFilters?: string[]
  isFilterChanging: boolean
  setIsFilterChanging: (value: boolean) => void
  showResolved: boolean
  onFilteredCountsChange?: (counts: { active: number; resolved: number }) => void
}

const Disputes: React.FC<Props> = ({
  totalItems,
  address,
  chainFilters = [],
  isFilterChanging,
  setIsFilterChanging,
  showResolved,
  onFilteredCountsChange,
}) => {
  const filters = useProfileFilters()
  const currentPage = filters.page
  const itemsPerPage = 10
  const scrollTop = useScrollTop()
  const queryAddress = address?.toLowerCase()

  const orderDirection = filters.orderDirection
  const searchTerm = filters.text
  const dateRange = filters.dateRange

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'disputes',
      queryAddress,
      currentPage,
      orderDirection,
      chainFilters.slice().sort().join(','),
      searchTerm,
      dateRange,
      showResolved,
    ],
    enabled: !!queryAddress,
    queryFn: async () => {
      // Fetch more items to properly calculate filtered totals
      const fetchSize = Math.max(1000, currentPage * itemsPerPage)
      const json = await fetchSubgraph(QUERY, {
        userAddress: queryAddress,
        registryAddresses: REGISTRY_ADDRESSES,
        first: fetchSize,
        skip: 0,
        orderDirection,
      })
      if (json.errors) return { items: [], totalFiltered: 0, activeCount: 0, resolvedCount: 0 }

      const asRequester = json.data.asRequester as any[]
      const asChallenger = json.data.asChallenger as any[]

      // Merge and deduplicate
      const itemMap = new Map<string, any>()

      // Add requester items with role
      for (const item of asRequester) {
        itemMap.set(item.id, { ...item, userRole: 'requester' })
      }

      // Add challenger items (may override or add)
      for (const item of asChallenger) {
        const existing = itemMap.get(item.id)
        if (existing) {
          // User is both requester and challenger (rare) - mark as both
          itemMap.set(item.id, { ...item, userRole: 'both' })
        } else {
          itemMap.set(item.id, { ...item, userRole: 'challenger' })
        }
      }

      let allItems = Array.from(itemMap.values())

      // Apply filters to all items first (before splitting by active/resolved)
      allItems = filterItemsByChain(allItems, chainFilters)
      allItems = filterItemsByDateRange(allItems, dateRange)
      allItems = filterItemsBySearchTerm(allItems, searchTerm)

      // Split into active and resolved
      const activeItems = allItems.filter((item) => {
        const request = item.requests?.[0]
        return request?.resolved !== true
      })
      const resolvedItems = allItems.filter((item) => {
        const request = item.requests?.[0]
        return request?.resolved === true
      })

      // Pick the set for the current sub-tab
      const visibleItems = showResolved ? resolvedItems : activeItems

      // Sort by submission time
      visibleItems.sort((a, b) => {
        const timeA = Number(a.latestRequestSubmissionTime || 0)
        const timeB = Number(b.latestRequestSubmissionTime || 0)
        return orderDirection === 'desc' ? timeB - timeA : timeA - timeB
      })

      return {
        ...paginateItems(visibleItems, currentPage, itemsPerPage),
        activeCount: activeItems.length,
        resolvedCount: resolvedItems.length,
      }
    },
  })

  useEffect(() => {
    if (data && onFilteredCountsChange) {
      onFilteredCountsChange({ active: data.activeCount, resolved: data.resolvedCount })
    }
  }, [data?.activeCount, data?.resolvedCount, onFilteredCountsChange])

  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil(data.totalFiltered / itemsPerPage))
  }, [data])

  const handlePageChange = (newPage: number) => {
    scrollTop(true)
    filters.setPage(newPage)
  }

  useFilterChangeEffect(isFilterChanging, isFetching, setIsFilterChanging)

  if (isLoading || isFilterChanging)
    return (
      <>
        <Skeleton height={100} style={{ marginBottom: 16 }} count={3} />
      </>
    )

  if (!data || data.items.length === 0)
    return (
      <EmptyState>
        {showResolved ? 'No resolved disputes.' : 'No active disputes.'}
      </EmptyState>
    )

  return (
    <>
      {data.items.map((item) => (
        <DisputeCard key={item.id} item={item} userAddress={queryAddress || ''} />
      ))}
      {totalPages > 1 && (
        <StyledPagination
          currentPage={currentPage}
          numPages={totalPages}
          callback={handlePageChange}
        />
      )}
    </>
  )
}

export default Disputes
