import { useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { useGraphqlBatcher } from './useGraphqlBatcher'
import { GraphItem, registryMap } from 'utils/items'
import { ITEMS_PER_PAGE } from '../../pages/Registries/index'
import { chains, getNamespaceForChainId } from '../../utils/chains'
import { DateRangeOption, getDateRangeTimestamp, getCustomDateTimestamps } from 'context/FilterContext'

interface UseItemsQueryParams {
  registryName?: string
  registryNames?: string[]
  status: string[]
  disputed: string[]
  hasEverBeenDisputed?: boolean
  text: string
  orderDirection: string
  page: number
  chainFilters?: string[]
  dateRange?: DateRangeOption
  customDateFrom?: string | null
  customDateTo?: string | null
  enabled?: boolean
}

export const useItemsQuery = ({
  registryName,
  registryNames,
  status,
  disputed,
  hasEverBeenDisputed = false,
  text,
  orderDirection,
  page,
  chainFilters = [],
  dateRange = 'all',
  customDateFrom = null,
  customDateTo = null,
  enabled = true,
}: UseItemsQueryParams) => {
  const graphqlBatcher = useGraphqlBatcher()

  const registry = registryNames ?? (registryName ? [registryName] : [])
  const network = chainFilters

  const shouldFetch =
    enabled &&
    registry.length > 0 &&
    status.length > 0 &&
    disputed.length > 0 &&
    page > 0

  // Build stable queryKey from individual filter parameters
  const queryKey = [
    'items',
    registry.slice().sort().join(','),
    status.slice().sort().join(','),
    disputed.slice().sort().join(','),
    hasEverBeenDisputed,
    chainFilters.slice().sort().join(','),
    text,
    orderDirection,
    page,
    dateRange,
    customDateFrom,
    customDateTo,
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!shouldFetch) return []

      const isTagsQueriesRegistry = registry.includes('tags-queries')
      const selectedChainIds = network.filter((id) => id !== 'unknown')
      const includeUnknown = network.includes('unknown')
      const definedChainIds = chains.map((c) => c.id)

      // Build network filter based on registry type
      let networkQueryObject = ''
      if (isTagsQueriesRegistry) {
        const conditions = selectedChainIds.map(
          (chainId) =>
            `{ _or: [{ key2: { _eq: "${chainId}"}}, { key1: { _eq: "${chainId}"}}]}`,
        )
        if (includeUnknown) {
          conditions.push(
            `{ _and: [{ key1: { _nin: $definedChainIds}}, { key2: { _nin: $definedChainIds}}]}`,
          )
        }
        networkQueryObject =
          conditions.length > 0 ? `{_or: [${conditions.join(',')}]}` : '{}'
      } else {
        const conditions = selectedChainIds.map((chainId) => {
          const namespace = getNamespaceForChainId(chainId)
          if (namespace === 'solana') {
            return `{key0: { _ilike: "solana:%"}}`
          }
          return `{key0: {_ilike: "${namespace}:${chainId}:%"}}`
        })
        networkQueryObject =
          conditions.length > 0 ? `{_or: [${conditions.join(',')}]}` : '{}'
      }

      // Build date filter
      let dateFilterObject = ''
      if (dateRange === 'custom') {
        const { fromTs, toTs } = getCustomDateTimestamps(customDateFrom, customDateTo)
        const conditions: string[] = []
        if (fromTs > 0) conditions.push(`{latestRequestSubmissionTime: {_gte: "${fromTs}"}}`)
        if (toTs > 0) conditions.push(`{latestRequestSubmissionTime: {_lte: "${toTs}"}}`)
        if (conditions.length > 0) dateFilterObject = conditions.join(',')
      } else if (dateRange !== 'all') {
        const ts = getDateRangeTimestamp(dateRange)
        if (ts > 0) dateFilterObject = `{latestRequestSubmissionTime: {_gte: "${ts}"}}`
      }

      const textFilterObject = text
        ? `{_or: [
        {key0: {_ilike: $text}},
        {key1: {_ilike: $text}},
        {key2: {_ilike: $text}},
        {key3: {_ilike: $text}},
        {key4: {_ilike: $text}}
      ]}`
        : ''

      // Build the complete query with filters
      const queryWithFilters = gql`
        query FetchItems(
          $registry: [String]
          $status: [status!]!
          $disputed: [Boolean!]!
          $text: String
          $skip: Int!
          $first: Int!
          $orderDirection: order_by!
          ${
            includeUnknown && isTagsQueriesRegistry
              ? '$definedChainIds: [String!]!'
              : ''
          }
        ) {
          litems: LItem(
            where: {
          _and: [
            {registry_id: {_in :$registry}},
            {status: {_in: $status}},
            {disputed: {_in: $disputed}},
            ${hasEverBeenDisputed ? '{requests: {disputed: {_eq: true}}},' : ''}
            ${networkQueryObject}
            ${textFilterObject ? `,${textFilterObject}` : ''}
            ${dateFilterObject ? `,${dateFilterObject}` : ''}
          ]
            }
        offset: $skip
        limit: $first
        order_by: {latestRequestSubmissionTime : $orderDirection }
          ) {
            id
            latestRequestSubmissionTime
            registryAddress
            itemID
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
              type: itemType
              label
              description
              isIdentifier
            }
            requests(order_by: {submissionTime: desc}) {
              requestType
              disputed
              disputeID
              submissionTime
              resolved
              requester
              challenger
              resolutionTime
              deposit
              creationTx
              rounds(limit: 1, order_by: {creationTime : desc}) {
                appealPeriodStart
                appealPeriodEnd
                ruling
                hasPaidRequester
                hasPaidChallenger
                amountPaidRequester
                amountPaidChallenger
              }
            }
          }
        }
      `

      const variables: any = {
        registry: registry.map((r) => registryMap[r]).filter((i) => i !== null),
        status,
        disputed: disputed.map((e) => e === 'true'),
        skip: (page - 1) * ITEMS_PER_PAGE,
        first: ITEMS_PER_PAGE + 1,
        orderDirection,
      }

      if (text) {
        variables.text = `%${text}%`
      }

      if (includeUnknown && isTagsQueriesRegistry) {
        variables.definedChainIds = definedChainIds
      }

      const requestId = crypto.randomUUID()
      const result = await graphqlBatcher.request(
        requestId,
        queryWithFilters,
        variables,
      )

      let items: GraphItem[] = result.litems

      // Client-side filtering for non-tags-queries registries
      if (!isTagsQueriesRegistry && network.length > 0) {
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

        items = items.filter((item: GraphItem) => {
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

      return items
    },
    enabled: shouldFetch,
    refetchInterval: false,
    staleTime: 0, // Always refetch when queryKey changes for instant filter updates
    gcTime: 1000 * 60 * 5, // Keep cache for 5 minutes for back/forward navigation
  })
}
