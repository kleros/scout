import { gql, request } from 'graphql-request'
import { ITEMS_PER_PAGE } from 'pages/Home'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts/index'
import { chains, getNamespaceForChainId } from './chains'

export const registryMap = {
  Single_Tags: '0x66260c69d03837016d88c9877e61e08ef74c59f2',
  Tags_Queries: '0xae6aaed5434244be3699c56e7ebc828194f26dc3',
  CDN: '0x957a53a994860be4750810131d9c876b2f52d6e1',
  Tokens: '0xee1502e29795ef6c2d60f8d7120596abe3bad990',
}

export const revRegistryMap = {
  '0x66260c69d03837016d88c9877e61e08ef74c59f2': 'Single_Tags',
  '0xae6aaed5434244be3699c56e7ebc828194f26dc3': 'Tags_Queries',
  '0x957a53a994860be4750810131d9c876b2f52d6e1': 'CDN',
  '0xee1502e29795ef6c2d60f8d7120596abe3bad990': 'Tokens',
}

export interface GraphItem {
  id: string
  latestRequestSubmissionTime: string
  registryAddress: string
  itemID: string
  status:
    | 'Registered'
    | 'Absent'
    | 'RegistrationRequested'
    | 'ClearingRequested'
  disputed: boolean
  data: string
  key0: string
  key1: string
  key2: string
  key3: string
  key4: string
  props: Prop[]
  requests: Request[]
}

export interface Prop {
  value: string
  type: string
  label: string
  description: string
  isIdentifier: boolean
}

export interface Request {
  disputed: boolean
  disputeID: string
  submissionTime: string
  resolved: boolean
  requester: string
  challenger: string
  resolutionTime: string
  deposit: string
  rounds: Round[]
}

export interface Round {
  appealPeriodStart: string
  appealPeriodEnd: string
  ruling: string
  hasPaidRequester: boolean
  hasPaidChallenger: boolean
  amountPaidRequester: string
  amountPaidChallenger: string
}

export const fetchItems = async (
  searchParams: URLSearchParams
): Promise<GraphItem[]> => {
  const registry = searchParams.getAll('registry')
  const status = searchParams.getAll('status')
  const disputed = searchParams.getAll('disputed')
  const network = searchParams.getAll('network')
  const text = searchParams.get('text')
  const orderDirection = searchParams.get('orderDirection')
  const page = Number(searchParams.get('page'))

  if (
    registry.length === 0 ||
    status.length === 0 ||
    disputed.length === 0 ||
    page === 0
  ) {
    return []
  }

  const isTagsQueriesRegistry = registry.includes('Tags_Queries')

  // Parse network parameters
  const selectedChainIds = network.filter((id) => id !== 'unknown')
  const includeUnknown = network.includes('unknown')
  const definedChainIds = chains.map((c) => c.id)
  const knownPrefixes = [
    ...new Set(
      chains.map((chain) => {
        if (chain.namespace === 'solana') {
          return 'solana:'
        }
        return `${chain.namespace}:${chain.id}:`
      })
    ),
  ]

  let networkQueryObject = ''
  if (isTagsQueriesRegistry) {
    // For Tags_Queries, filter both selected and unknown chains server-side
    const conditions = selectedChainIds.map(
      (chainId) =>
        `{ _or: [{ key2: { _eq: "${chainId}"}}, { key1: { _eq: "${chainId}"}}]}`
    )
    if (includeUnknown) {
      conditions.push(
        `{ _and: [{ key1: { _nin: $definedChainIds}}, { key2: { _nin: $definedChainIds}}]}`
      )
    }
    networkQueryObject =
      conditions.length > 0 ? `{_or: [${conditions.join(',')}]}` : '{}'
  } else {
    // For non-Tags_Queries, filter only selected chains server-side
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

  const query = gql`
    query (
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
  console.log({ variables, registry })

  const result = (await request({
    url: SUBGRAPH_GNOSIS_ENDPOINT,
    document: query,
    variables,
  })) as any
  let items = result.litems

  // Client-side filtering for non-Tags_Queries registries
  if (!isTagsQueriesRegistry) {
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
              key0.startsWith(prefix.toLowerCase())
            )
          : false // No selected chains means this is false

      const isUnknownChain = !knownPrefixes.some((prefix) =>
        key0.startsWith(prefix.toLowerCase())
      )

      // Include if:
      // - Specific chains are selected and item matches one, OR
      // - "Unknown chains" is selected and item is unknown
      return (
        (selectedPrefixes.length > 0 && matchesSelectedChain) ||
        (includeUnknown && isUnknownChain)
      )
    })
  }

  return items
}
