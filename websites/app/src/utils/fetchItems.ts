import { gql, request } from 'graphql-request'
import { ITEMS_PER_PAGE } from 'pages/Home'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts/index';
import { getNamespaceForChainId } from './chains';

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
  metadata: {
    key0: string
    key1: string
    key2: string
    key3: string
    key4: string
    props: Prop[]
  } | null
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
  const page = Number(searchParams.get('page')) // page null casts to 0
  if (
    registry.length === 0 ||
    status.length === 0 ||
    disputed.length === 0 ||
    page === 0
  ) {
    // This query is invalid, defaults haven't come yet.
    return []
  }

  const isTagsQueriesRegistry = registry.includes('Tags_Queries')
  
  // Network filtering logic based on registry type
  const networkQueryObject = network.length > 0
    ? isTagsQueriesRegistry
      // For Tags_Queries, filter using key2 or key1
      ? `{or: [${network
        .map((chainId) => `{or: [{metadata_: {key2: "${chainId}"}}, {metadata_: {key1: "${chainId}"}}]}`)
        .join(',')}]},`    
      // For other registries, filter using key0
    : `{or: [${network
      .map((chainId) => {
        const namespace = getNamespaceForChainId(chainId);
        if (namespace === 'solana') {
          return `{metadata_: {key0_starts_with_nocase: "solana:"}}`;
        }
        return `{metadata_: {key0_starts_with_nocase: "${namespace}:${chainId}:"}}`
      })
        .join(',')}]},`
    : ''

  const textFilterObject = `{or: [
    {metadata_: {key0_contains_nocase: $text}},
    {metadata_: {key1_contains_nocase: $text}},
    {metadata_: {key2_contains_nocase: $text}},
    {metadata_: {key3_contains_nocase: $text}},
    {metadata_: {key4_contains_nocase: $text}},
  ]}`

  const query = gql`
    query (
      $registry: [String!]!
      $status: [String!]!
      $disputed: [Boolean!]!
      $text: String!
      $skip: Int!
      $first: Int!
      $orderDirection: OrderDirection!
    ) {
      litems(
        where: {
          and: [
            {registry_in: $registry},
            {status_in: $status},
            {disputed_in: $disputed},
            ${networkQueryObject}
            ${text === '' ? '' : textFilterObject}
          ]
        }
        skip: $skip
        first: $first
        orderBy: "latestRequestSubmissionTime"
        orderDirection: $orderDirection
      ) {
        id
        latestRequestSubmissionTime
        registryAddress
        itemID
        status
        disputed
        data
        metadata {
          key0
          key1
          key2
          key3
          key4
          props {
            value
            type
            label
            description
            isIdentifier
          }
        }
        requests(first: 1, orderBy: submissionTime, orderDirection: desc) {
          disputed
          disputeID
          submissionTime
          resolved
          requester
          challenger
          resolutionTime
          deposit
          rounds(first: 1, orderBy: creationTime, orderDirection: desc) {
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

  const result = (await request({
    url: SUBGRAPH_GNOSIS_ENDPOINT,
    document: query,
    variables: {
      registry: registry.map((r) => registryMap[r]),
      status,
      disputed: disputed.map((e) => e === 'true'),
      text: text || '',
      skip: (page - 1) * ITEMS_PER_PAGE,
      first: ITEMS_PER_PAGE + 1,
      orderDirection,
    },
  })) as any
  const items = result.litems
  return items
}
