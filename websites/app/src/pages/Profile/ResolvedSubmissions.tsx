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
query ResolvedItems($userAddress: String!, $first: Int!, $skip: Int!, $status: [status!]!, $disputed: [Boolean!]!, $orderDirection: order_by!) {
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
      requestType
      requester
      deposit
      submissionTime
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
  onFilteredCountChange?: (count: number) => void
}

const ResolvedSubmissions: React.FC<Props> = ({
  totalItems,
  address,
  chainFilters = [],
  isFilterChanging,
  setIsFilterChanging,
  onFilteredCountChange,
}) => {
  const filters = useProfileFilters()
  const currentPage = filters.page
  const itemsPerPage = 20
  const scrollTop = useScrollTop()
  const queryAddress = address?.toLowerCase()

  const statusParams = filters.status
  const disputedParams = filters.disputed
  const orderDirection = filters.orderDirection

  const defaultResolvedStatuses = ['Registered', 'Absent']
  const status =
    statusParams.length > 0
      ? statusParams.filter((s) => defaultResolvedStatuses.includes(s))
      : defaultResolvedStatuses
  const disputed =
    disputedParams.length > 0
      ? disputedParams.map((d) => d === 'true')
      : [true, false]

  const searchTerm = filters.text
  const dateRange = filters.dateRange
  const customDateFrom = filters.customDateFrom
  const customDateTo = filters.customDateTo

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'resolvedItems',
      queryAddress,
      currentPage,
      status.slice().sort().join(','),
      disputed.slice().sort().join(','),
      orderDirection,
      chainFilters.slice().sort().join(','),
      searchTerm,
      dateRange,
      customDateFrom,
      customDateTo,
    ],
    enabled: !!queryAddress,
    queryFn: async () => {
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
      items = filterItemsByDateRange(items, dateRange, customDateFrom, customDateTo)
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
  if (!data || data.items.length === 0) return <EmptyState>No resolved submissions.</EmptyState>

  return (
    <>
      {data.items.map((item) => (
        <ItemCard key={item.id} item={item} fromProfile="resolved" />
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

export default ResolvedSubmissions
