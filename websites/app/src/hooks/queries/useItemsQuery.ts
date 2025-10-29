import { useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { useGraphqlBatcher } from './useGraphqlBatcher'
import { GraphItem, registryMap } from 'utils/items'
import { ITEMS_PER_PAGE } from '../../pages/Registries/index'
import { chains, getNamespaceForChainId } from '../../utils/chains'

interface UseItemsQueryParams {
  searchParams: URLSearchParams
  registryName?: string
  chainFilters?: string[]
  enabled?: boolean
}

export const useItemsQuery = ({
  searchParams,
  registryName,
  chainFilters = [],
  enabled = true,
}: UseItemsQueryParams) => {
  const graphqlBatcher = useGraphqlBatcher()

  // Support both single registry (from registryName prop) and multiple registries (from searchParams for dashboard)
  const registry = registryName ? [registryName] : searchParams.getAll('registry')
  const status = searchParams.getAll('status')
  const disputed = searchParams.getAll('disputed')
  const network = chainFilters
  const text = searchParams.get('text') || ''
  const orderDirection = searchParams.get('orderDirection') || 'desc'
  const page = Number(searchParams.get('page')) || 1

  const shouldFetch =
    enabled &&
    registry.length > 0 &&
    status.length > 0 &&
    disputed.length > 0 &&
    page > 0

  // Build stable queryKey from individual filter parameters
  const queryKey = [
    'items',
    registryName,
    status.slice().sort().join(','),
    disputed.slice().sort().join(','),
    chainFilters.slice().sort().join(','),
    text,
    orderDirection,
    page
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!shouldFetch) return []

      const isTagsQueriesRegistry = registry.includes('Tags_Queries')
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
            ${networkQueryObject},
            ${text === '' ? '' : textFilterObject}
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
            requests(limit: 1, order_by: {submissionTime: desc}) {
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

      // Client-side filtering for non-Tags_Queries registries
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
