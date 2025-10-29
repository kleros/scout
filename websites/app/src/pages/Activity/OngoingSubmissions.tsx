import React, { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import Skeleton from 'react-loading-skeleton'
import styled from 'styled-components'
import ItemCard from './ItemCard'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useScrollTop } from 'hooks/useScrollTop'
import { StyledPagination } from 'components/StyledPagination'
import { chains, getNamespaceForChainId } from 'utils/chains'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts'

const EmptyState = styled.div`
  color: ${({ theme }) => theme.secondaryText};
`

const QUERY = `
query OngoingItems($userAddress: String!, $first: Int!, $skip: Int!, $status: [status!]!, $disputed: [Boolean!]!, $orderDirection: order_by!) {
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
}

const OngoingSubmissions: React.FC<Props> = ({
  totalItems,
  address,
  chainFilters = [],
}) => {
  const [searchParams] = useSearchParams()
  const currentPage = parseInt(searchParams.get('page') ?? '1', 10)
  const itemsPerPage = 10
  const navigate = useNavigate()
  const location = useLocation()
  const scrollTop = useScrollTop()
  const queryAddress = address?.toLowerCase()

  // Get filter parameters with defaults for ongoing submissions
  const statusParams = searchParams.getAll('status')
  const disputedParams = searchParams.getAll('disputed')
  const orderDirection = searchParams.get('orderDirection') || 'desc'

  // Default ongoing statuses - exclude Registered and Absent
  const defaultOngoingStatuses = ['RegistrationRequested', 'ClearingRequested']
  const status =
    statusParams.length > 0
      ? statusParams.filter((s) => defaultOngoingStatuses.includes(s))
      : defaultOngoingStatuses
  const disputed =
    disputedParams.length > 0
      ? disputedParams.map((d) => d === 'true')
      : [true, false]

  const searchTerm = searchParams.get('search') || ''

  const { data, isLoading } = useQuery({
    queryKey: [
      'ongoingItems',
      queryAddress,
      currentPage,
      status,
      disputed,
      orderDirection,
      chainFilters,
      searchTerm,
    ],
    enabled: !!queryAddress,
    queryFn: async () => {
      // Fetch more items to properly calculate filtered totals
      // We'll fetch up to 1000 items and handle pagination client-side
      const fetchSize = Math.max(1000, currentPage * itemsPerPage)
      const res = await fetch(SUBGRAPH_GNOSIS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            userAddress: queryAddress,
            first: fetchSize,
            skip: 0, // Always start from 0 to get accurate totals
            status,
            disputed,
            orderDirection,
          },
        }),
      })
      const json = await res.json()
      if (json.errors) return { items: [], totalFiltered: 0 }
      let items = json.data.litems as any[]

      // Client-side filtering by chains
      if (chainFilters.length > 0) {
        const selectedChainIds = chainFilters.filter((id) => id !== 'unknown')
        const includeUnknown = chainFilters.includes('unknown')

        const knownPrefixes = [
          ...new Set(
            chains.map((chain) => {
              if (chain.namespace === 'solana') {
                return 'solana:'
              }
              return `${chain.namespace}:${chain.id}:`
            }),
          ),
        ]

        const selectedPrefixes = selectedChainIds.map((chainId) => {
          const namespace = getNamespaceForChainId(chainId)
          if (namespace === 'solana') {
            return 'solana:'
          }
          return `${namespace}:${chainId}:`
        })

        items = items.filter((item: any) => {
          const key0 = item?.key0?.toLowerCase() || ''
          const matchesSelectedChain =
            selectedPrefixes.length > 0
              ? selectedPrefixes.some((prefix) =>
                  key0.startsWith(prefix.toLowerCase()),
                )
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

      // Client-side text search filtering
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        items = items.filter((item: any) => {
          // Search through metadata props
          const propsText =
            item?.props
              ?.map((prop: any) => `${prop.label}: ${prop.value}`)
              .join(' ')
              .toLowerCase() || ''

          // Search through keys
          const keysText = [
            item?.key0,
            item?.key1,
            item?.key2,
            item?.key3,
            item?.key4,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          // Search through basic fields
          const basicText = [item.id, item.itemID, item.registryAddress]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          const searchableText = `${propsText} ${keysText} ${basicText}`
          return searchableText.includes(searchLower)
        })
      }

      // Calculate total filtered count
      const totalFiltered = items.length

      // Apply pagination to filtered results
      const startIndex = (currentPage - 1) * itemsPerPage
      const endIndex = startIndex + itemsPerPage
      const paginatedItems = items.slice(startIndex, endIndex)

      return { items: paginatedItems, totalFiltered }
    },
  })
  const totalPages = useMemo(() => {
    if (!data) return 1
    return Math.max(1, Math.ceil(data.totalFiltered / itemsPerPage))
  }, [data])

  const handlePageChange = (newPage: number) => {
    scrollTop(true)
    const params = new URLSearchParams(location.search)
    params.set('page', String(newPage))
    navigate(`${location.pathname}?${params.toString()}`)
  }

  if (isLoading)
    return (
      <>
        <Skeleton height={100} style={{ marginBottom: 16 }} count={3} />
      </>
    )
  if (!data || data.items.length === 0) return <EmptyState>No ongoing submissions.</EmptyState>

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

export default OngoingSubmissions
