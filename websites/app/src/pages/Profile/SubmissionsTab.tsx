import React, { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ItemCard from './ItemCard'
import { useProfileFilters } from 'context/FilterContext'
import { useScrollTop } from 'hooks/useScrollTop'
import { StyledPagination } from 'components/StyledPagination'
import {
  applyProfileFilters,
  fetchAllRows,
  paginateItems,
  uniqueById,
  PENDING_STATUSES,
  RESOLVED_STATUSES,
  ProfileListFilters,
} from 'utils/profileFilters'
import { fetchItemPropsFromIpfs, patchQueryWithIpfs } from 'utils/items'
import { KLEROS_CDN_BASE } from 'consts/index'
import { ListSkeleton, ListError, ListEmpty, CappedNote, ListReport } from './ListStates'

// Every item the address made a request on, in the tab's statuses, newest first (the id breaks
// ties, so the 1,000-row pages of a long list neither repeat nor skip an item). The list is read
// once per address: filters, search, sorting and pages are applied in memory and ask nothing.
const QUERY = `
query ProfileSubmissions($userAddress: String!, $status: [status!]!, $first: Int!, $skip: Int!) {
  litems: LItem(
    where: {status: {_in: $status}, requests: {requester: {_eq: $userAddress}}}
    limit: $first
    offset: $skip
    order_by: [{latestRequestSubmissionTime: desc}, {id: asc}]
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
      disputed
    }
    everChallenged: requests(where: {disputed: {_eq: true}}, limit: 1) {
      disputed
    }
  }
}
`

const TABS = {
  pending: {
    // The query key prefix is refreshed after the user's own transactions (RefreshAfterTransactions).
    queryKey: 'pendingItems',
    statuses: PENDING_STATUSES,
    perPage: 10,
    noun: 'pending submissions',
    errorTitle: 'The pending submissions did not load.',
    ownEmpty: 'You have no pending submissions.',
    otherEmpty: 'This address has no pending submissions.',
  },
  resolved: {
    queryKey: 'resolvedItems',
    statuses: RESOLVED_STATUSES,
    perPage: 20,
    noun: 'resolved submissions',
    errorTitle: 'The resolved submissions did not load.',
    ownEmpty: 'You have no resolved submissions yet.',
    otherEmpty: 'This address has no resolved submissions.',
  },
} as const

interface Props {
  kind: keyof typeof TABS
  address: string
  isOwnProfile: boolean
  /** 1-based page from the address bar; a page past the end shows the last one. */
  page: number
  onPageChange: (page: number) => void
  /** Called with the list's counts once read ('failed' when it did not load, null when unmounted). */
  onReport: (report: ListReport) => void
  /** Reads again the profile counts that failed (the Try again button retries everything). */
  onRetryCounts: () => void
}

const SubmissionsTab: React.FC<Props> = ({
  kind,
  address,
  isOwnProfile,
  page,
  onPageChange,
  onReport,
  onRetryCounts,
}) => {
  const tab = TABS[kind]
  const filters = useProfileFilters()
  const queryClient = useQueryClient()
  const scrollTop = useScrollTop()

  const queryKey = useMemo(() => [tab.queryKey, address], [tab.queryKey, address])
  const query = useQuery({
    queryKey,
    enabled: !!address,
    queryFn: async () => {
      const { rows, capped } = await fetchAllRows(QUERY, { userAddress: address, status: tab.statuses })
      const items = uniqueById(rows)
      // Items whose metadata the indexer missed are completed from IPFS in the background.
      patchQueryWithIpfs(queryClient, queryKey, items, async () => ({
        items: await fetchItemPropsFromIpfs(items, KLEROS_CDN_BASE),
        capped,
      }))
      return { items, capped }
    },
  })

  const listFilters: ProfileListFilters = useMemo(
    () => ({
      statuses: filters.status.filter((status) => (tab.statuses as readonly string[]).includes(status)),
      disputed: filters.disputed,
      hasEverBeenDisputed: filters.hasEverBeenDisputed,
      chainFilters: filters.chainFilters,
      dateRange: filters.dateRange,
      customDateFrom: filters.customDateFrom,
      customDateTo: filters.customDateTo,
      searchTerm: filters.text,
      orderDirection: filters.orderDirection,
    }),
    [
      tab.statuses,
      filters.status,
      filters.disputed,
      filters.hasEverBeenDisputed,
      filters.chainFilters,
      filters.dateRange,
      filters.customDateFrom,
      filters.customDateTo,
      filters.text,
      filters.orderDirection,
    ],
  )

  const items = query.data?.items
  const shown = useMemo(() => (items ? applyProfileFilters(items, listFilters) : []), [items, listFilters])

  const total = items?.length
  const failed = !items && query.isError
  useEffect(() => {
    onReport(total !== undefined ? { shown: shown.length, total } : failed ? 'failed' : null)
  }, [shown.length, total, failed, onReport])
  useEffect(() => () => onReport(null), [onReport])

  if (!items) {
    if (query.isError) {
      return (
        <ListError
          title={tab.errorTitle}
          onRetry={() => {
            query.refetch()
            onRetryCounts()
          }}
          retrying={query.isFetching}
        />
      )
    }
    return <ListSkeleton />
  }

  if (shown.length === 0) {
    const filtersExcludeAll =
      items.length > 0 && applyProfileFilters(items, { ...listFilters, searchTerm: '' }).length === 0
    return (
      <ListEmpty
        noun={tab.noun}
        noRows={items.length === 0}
        noRowsText={isOwnProfile ? tab.ownEmpty : tab.otherEmpty}
        ownNextStep
        isOwnProfile={isOwnProfile}
        searchText={filters.text}
        filtersExcludeAll={filtersExcludeAll}
        onClearSearch={() => filters.setText('')}
        onResetFilters={filters.resetFilters}
      />
    )
  }

  const current = paginateItems(shown, page, tab.perPage)

  return (
    <>
      {query.data?.capped ? <CappedNote count={items.length} noun={tab.noun} /> : null}
      {current.items.map((item) => (
        <ItemCard key={item.id} item={item} fromProfile={kind} />
      ))}
      {current.totalPages > 1 && (
        <StyledPagination
          currentPage={current.page}
          numPages={current.totalPages}
          callback={(newPage: number) => {
            scrollTop(true)
            onPageChange(newPage)
          }}
        />
      )}
    </>
  )
}

export default SubmissionsTab
