import React, { useMemo, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import Skeleton from 'react-loading-skeleton'
import styled from 'styled-components'
import DisputeCard from './DisputeCard'
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { useScrollTop } from 'hooks/useScrollTop'
import { StyledPagination } from 'components/StyledPagination'
import { chains, getNamespaceForChainId } from 'utils/chains'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts'
import { registryMap } from 'utils/items'

// Only query disputes from our 4 registries
const REGISTRY_ADDRESSES = Object.values(registryMap)

const EmptyState = styled.div`
  color: ${({ theme }) => theme.secondaryText};
`

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
}

const Disputes: React.FC<Props> = ({
  totalItems,
  address,
  chainFilters = [],
  isFilterChanging,
  setIsFilterChanging,
  showResolved,
}) => {
  const [searchParams] = useSearchParams()
  const currentPage = parseInt(searchParams.get('page') ?? '1', 10)
  const itemsPerPage = 10
  const navigate = useNavigate()
  const location = useLocation()
  const scrollTop = useScrollTop()
  const queryAddress = address?.toLowerCase()

  const orderDirection = searchParams.get('orderDirection') || 'desc'
  const searchTerm = searchParams.get('search') || ''

  const { data, isLoading, isFetching } = useQuery({
    queryKey: [
      'disputes',
      queryAddress,
      currentPage,
      orderDirection,
      chainFilters.slice().sort().join(','),
      searchTerm,
      showResolved,
    ],
    enabled: !!queryAddress,
    queryFn: async () => {
      // Fetch more items to properly calculate filtered totals
      const fetchSize = Math.max(1000, currentPage * itemsPerPage)
      const res = await fetch(SUBGRAPH_GNOSIS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: QUERY,
          variables: {
            userAddress: queryAddress,
            registryAddresses: REGISTRY_ADDRESSES,
            first: fetchSize,
            skip: 0,
            orderDirection,
          },
        }),
      })
      const json = await res.json()
      if (json.errors) return { items: [], totalFiltered: 0 }

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

      let items = Array.from(itemMap.values())

      // Filter by resolved status
      items = items.filter((item) => {
        const request = item.requests?.[0]
        const isResolved = request?.resolved === true
        return showResolved ? isResolved : !isResolved
      })

      // Sort by submission time
      items.sort((a, b) => {
        const timeA = Number(a.latestRequestSubmissionTime || 0)
        const timeB = Number(b.latestRequestSubmissionTime || 0)
        return orderDirection === 'desc' ? timeB - timeA : timeA - timeB
      })

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
          const propsText =
            item?.props
              ?.map((prop: any) => `${prop.label}: ${prop.value}`)
              .join(' ')
              .toLowerCase() || ''

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

          const basicText = [item.id, item.itemID, item.registryAddress]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()

          const searchableText = `${propsText} ${keysText} ${basicText}`
          return searchableText.includes(searchLower)
        })
      }

      const totalFiltered = items.length

      // Apply pagination
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

  const hasFetchingStartedRef = useRef(false)

  useEffect(() => {
    if (isFetching && isFilterChanging && !hasFetchingStartedRef.current) {
      hasFetchingStartedRef.current = true
    }
  }, [isFetching, isFilterChanging])

  useEffect(() => {
    if (!isFetching && isFilterChanging && hasFetchingStartedRef.current) {
      setIsFilterChanging(false)
      hasFetchingStartedRef.current = false
    }
  }, [isFetching, isFilterChanging, setIsFilterChanging])

  useEffect(() => {
    hasFetchingStartedRef.current = false
  }, [chainFilters, searchParams])

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
