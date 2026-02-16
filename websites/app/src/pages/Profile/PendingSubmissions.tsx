import React, { useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Skeleton from 'react-loading-skeleton'
import ItemCard from './ItemCard'
import { useProfileFilters } from 'context/FilterContext'
import { useScrollTop } from 'hooks/useScrollTop'
import { StyledPagination } from 'components/StyledPagination'
import { filterItemsByChain, filterItemsByDateRange, filterItemsBySearchTerm, paginateItems, useFilterChangeEffect } from 'utils/profileFilters'
import { fetchSubgraph } from 'utils/fetchSubgraph'
import { EmptyState } from 'styles/commonStyles'

const QUERY = `
query PendingItems($userAddress: String!, $first: Int!, $skip: Int!, $status: [status!]!, $disputed: [Boolean!]!, $orderDirection: order_by!) {
  litems: LItem(
    where: {status: {_in: $status}, disputed: {_in: $disputed}, requests: {requester: {_eq: $userAddress}}}
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
    requests(limit: 1, order_by: {submissionTime: desc}) {
      requester
      deposit
      submissionTime
      disputed
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
  onFilteredCountChange?: (count: number) => void
}

const PendingSubmissions: React.FC<Props> = ({
  totalItems,
  address,
  chainFilters = [],
  isFilterChanging,
  setIsFilterChanging,
  onFilteredCountChange,
}) => {
  const filters = useProfileFilters()
  const currentPage = filters.page
  const itemsPerPage = 10
  const scrollTop = useScrollTop()
  const queryAddress = address?.toLowerCase()

  // Get filter parameters with defaults for pending submissions
  const statusParams = filters.status
  const disputedParams = filters.disputed
  const orderDirection = filters.orderDirection

  // Default pending statuses - exclude Registered and Absent
  const defaultPendingStatuses = ['RegistrationRequested', 'ClearingRequested']
  const status =
    statusParams.length > 0
      ? statusParams.filter((s) => defaultPendingStatuses.includes(s))
      : defaultPendingStatuses
  const disputed =
    disputedParams.length > 0
      ? disputedParams.map((d) => d === 'true')
      : [true, false]

  const searchTerm = filters.text
  const dateRange = filters.dateRange

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'pendingItems',
      queryAddress,
      currentPage,
      status.slice().sort().join(','),
      disputed.slice().sort().join(','),
      orderDirection,
      chainFilters.slice().sort().join(','),
      searchTerm,
      dateRange,
    ],
    enabled: !!queryAddress,
    queryFn: async () => {
      // Fetch more items to properly calculate filtered totals
      // We'll fetch up to 1000 items and handle pagination client-side
      const fetchSize = Math.max(1000, currentPage * itemsPerPage)
      const json = await fetchSubgraph(QUERY, {
        userAddress: queryAddress,
        first: fetchSize,
        skip: 0,
        status,
        disputed,
        orderDirection,
      })
      if (json.errors) return { items: [], totalFiltered: 0 }
      let items = json.data.litems as any[]

      items = filterItemsByChain(items, chainFilters)
      items = filterItemsByDateRange(items, dateRange)
      items = filterItemsBySearchTerm(items, searchTerm)

      return paginateItems(items, currentPage, itemsPerPage)
    },
  })
  useEffect(() => {
    if (data && onFilteredCountChange) {
      onFilteredCountChange(data.totalFiltered)
    }
  }, [data?.totalFiltered, onFilteredCountChange])

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
  if (!data || data.items.length === 0) return <EmptyState>No pending submissions.</EmptyState>

  return (
    <>
      {data.items.map((item) => (
        <ItemCard key={item.id} item={item} />
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

export default PendingSubmissions
