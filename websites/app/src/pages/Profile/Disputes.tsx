import React, { useEffect, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import DisputeCard, { DisputeRole } from './DisputeCard'
import { useProfileFilters } from 'context/FilterContext'
import { useScrollTop } from 'hooks/useScrollTop'
import { StyledPagination } from 'components/StyledPagination'
import { registryMap, fetchItemPropsFromIpfs, patchQueryWithIpfs } from 'utils/items'
import { KLEROS_CDN_BASE } from 'consts/index'
import { applyProfileFilters, fetchAllRows, paginateItems, ProfileListFilters } from 'utils/profileFilters'
import { ListSkeleton, ListError, ListEmpty, CappedNote, ListCount } from './ListStates'

// Only query disputes from our 4 registries
const REGISTRY_ADDRESSES = Object.values(registryMap)

// The items with a disputed request the address made (as requester) or challenged, with the
// latest such request. Each list is read once per address, 1,000 rows at a time; the sub-tab,
// filters, search, sorting and pages are applied in memory.
const disputesQuery = (party: 'requester' | 'challenger') => `
query ProfileDisputesAs_${party}($userAddress: String!, $registryAddresses: [String!]!, $first: Int!, $skip: Int!) {
  litems: LItem(
    where: {
      registryAddress: {_in: $registryAddresses}
      requests: {disputed: {_eq: true}, ${party}: {_eq: $userAddress}}
    }
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
    requests(where: {disputed: {_eq: true}, ${party}: {_eq: $userAddress}}, order_by: {submissionTime: desc}, limit: 1) {
      requestType
      requester
      challenger
      deposit
      submissionTime
      challengeTime
      disputed
      disputeID
      disputeOutcome
      resolved
      resolutionTime
      rounds(order_by: [{creationTime: asc}, {id: asc}], limit: 1) {
        amountPaidChallenger
      }
    }
  }
}
`
const AS_REQUESTER_QUERY = disputesQuery('requester')
const AS_CHALLENGER_QUERY = disputesQuery('challenger')

/**
 * One card per item: its latest dispute involving the address, and the address's role in it
 * (requester, challenger, or both when it challenged its own request).
 */
const mergeDisputes = (asRequester: any[], asChallenger: any[], userAddress: string): any[] => {
  const latest = new Map<string, any>()
  for (const item of [...asRequester, ...asChallenger]) {
    const request = item.requests?.[0]
    if (!request) continue
    const kept = latest.get(item.id)
    if (!kept || Number(request.submissionTime) > Number(kept.requests[0].submissionTime)) {
      latest.set(item.id, item)
    }
  }
  return Array.from(latest.values()).map((item) => {
    const request = item.requests[0]
    const isRequester = request.requester?.toLowerCase() === userAddress
    const isChallenger = request.challenger?.toLowerCase() === userAddress
    const userRole: DisputeRole = isRequester && isChallenger ? 'both' : isChallenger ? 'challenger' : 'requester'
    return { ...item, userRole }
  })
}

const isResolved = (item: any) => item.requests?.[0]?.resolved === true

export type DisputeListReport = { active: ListCount; resolved: ListCount } | 'failed' | null

interface Props {
  address: string
  isOwnProfile: boolean
  showResolved: boolean
  page: number
  onPageChange: (page: number) => void
  onReport: (report: DisputeListReport) => void
  onRetryCounts: () => void
}

const Disputes: React.FC<Props> = ({
  address,
  isOwnProfile,
  showResolved,
  page,
  onPageChange,
  onReport,
  onRetryCounts,
}) => {
  const filters = useProfileFilters()
  const queryClient = useQueryClient()
  const scrollTop = useScrollTop()
  const itemsPerPage = 10

  // The query key prefix is refreshed after the user's own transactions (RefreshAfterTransactions).
  const queryKey = useMemo(() => ['disputes', address], [address])
  const query = useQuery({
    queryKey,
    enabled: !!address,
    queryFn: async () => {
      const variables = { userAddress: address, registryAddresses: REGISTRY_ADDRESSES }
      // Both first pages leave in one request (the reads are batched).
      const [asRequester, asChallenger] = await Promise.all([
        fetchAllRows(AS_REQUESTER_QUERY, variables),
        fetchAllRows(AS_CHALLENGER_QUERY, variables),
      ])
      const items = mergeDisputes(asRequester.rows, asChallenger.rows, address)
      const capped = asRequester.capped || asChallenger.capped
      patchQueryWithIpfs(queryClient, queryKey, items, async () => ({
        items: await fetchItemPropsFromIpfs(items, KLEROS_CDN_BASE),
        capped,
      }))
      return { items, capped }
    },
  })

  // Item statuses and challenge states do not apply to disputes: the date, networks and search do.
  const listFilters: ProfileListFilters = useMemo(
    () => ({
      chainFilters: filters.chainFilters,
      dateRange: filters.dateRange,
      customDateFrom: filters.customDateFrom,
      customDateTo: filters.customDateTo,
      searchTerm: filters.text,
      orderDirection: filters.orderDirection,
    }),
    [
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

  const counts = useMemo(() => {
    if (!items) return null
    const totalResolved = items.filter(isResolved).length
    const shownResolved = shown.filter(isResolved).length
    return {
      active: { shown: shown.length - shownResolved, total: items.length - totalResolved },
      resolved: { shown: shownResolved, total: totalResolved },
    }
  }, [items, shown])

  const failed = !items && query.isError
  useEffect(() => {
    onReport(counts ?? (failed ? 'failed' : null))
  }, [counts, failed, onReport])
  useEffect(() => () => onReport(null), [onReport])

  if (!items) {
    if (query.isError) {
      return (
        <ListError
          title="The disputes did not load."
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

  const visible = shown.filter((item) => isResolved(item) === showResolved)
  const noun = showResolved ? 'resolved disputes' : 'active disputes'

  if (visible.length === 0) {
    const inSubTab = items.filter((item) => isResolved(item) === showResolved)
    const filtersExcludeAll =
      inSubTab.length > 0 && applyProfileFilters(inSubTab, { ...listFilters, searchTerm: '' }).length === 0
    return (
      <ListEmpty
        noun={noun}
        noRows={inSubTab.length === 0}
        noRowsText={isOwnProfile ? `You have no ${noun}.` : `This address has no ${noun}.`}
        isOwnProfile={isOwnProfile}
        searchText={filters.text}
        filtersExcludeAll={filtersExcludeAll}
        onClearSearch={() => filters.setText('')}
        onResetFilters={filters.resetFilters}
      />
    )
  }

  const current = paginateItems(visible, page, itemsPerPage)

  return (
    <>
      {query.data?.capped ? <CappedNote count={items.length} noun="disputes" /> : null}
      {current.items.map((item) => (
        <DisputeCard key={item.id} item={item} />
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

export default Disputes
