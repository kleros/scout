/**
 * Queries against Scout's Envio HyperIndex (the same indexer the app reads).
 * Timestamps are unix seconds; entity timestamps are block timestamps.
 */

export const REGISTRIES = {
  tokens: '0xee1502e29795ef6c2d60f8d7120596abe3bad990',
  cdn: '0x957a53a994860be4750810131d9c876b2f52d6e1',
  'single-tags': '0x66260c69d03837016d88c9877e61e08ef74c59f2',
  'tags-queries': '0xae6aaed5434244be3699c56e7ebc828194f26dc3',
} as const

export type RegistryKey = keyof typeof REGISTRIES
export const REGISTRY_ADDRESSES = Object.values(REGISTRIES) as string[]
export const registryKeyOf = (address: string) =>
  (Object.keys(REGISTRIES) as RegistryKey[]).find(
    (key) => REGISTRIES[key] === address.toLowerCase(),
  )

export interface IndexedContribution {
  contributor: string
  side: string
}

export interface IndexedRound {
  id: string
  creationTime: string
  ruling: 'None' | 'Accept' | 'Reject' | string
  rulingTime: string
  appealPeriodStart: string
  appealPeriodEnd: string
  appealed: boolean
  appealedAt: string | null
  hasPaidRequester: boolean
  hasPaidChallenger: boolean
  amountPaidRequester: string
  amountPaidChallenger: string
  lastFundedRequester: string
  lastFundedChallenger: string
  contributions: IndexedContribution[]
}

export interface IndexedEvidence {
  id: string
  party: string
  number: string
  timestamp: string
  title: string | null
  description: string | null
  txHash: string
}

export interface IndexedRequest {
  id: string
  requestType: 'RegistrationRequested' | 'ClearingRequested' | string
  requester: string
  challenger: string
  disputed: boolean
  disputeID: string
  arbitrator: string
  arbitratorExtraData: string
  submissionTime: string
  challengeTime: string | null
  txHashChallenge: string | null
  creationTx: string
  resolved: boolean
  resolutionTime: string
  disputeOutcome: 'None' | 'Accept' | 'Reject' | string
  numberOfRounds: string
  evidenceGroup_id: string
  rounds: IndexedRound[]
  evidenceGroup: { evidences: IndexedEvidence[] } | null
}

export interface IndexedItem {
  id: string
  itemID: string
  registryAddress: string
  status: string
  data: string
  key0: string | null
  key1: string | null
  key2: string | null
  props: { label: string; value: string | null }[]
  requests: IndexedRequest[]
}

const ROUND_FIELDS = `
  id creationTime ruling rulingTime appealPeriodStart appealPeriodEnd appealed appealedAt
  hasPaidRequester hasPaidChallenger amountPaidRequester amountPaidChallenger
  lastFundedRequester lastFundedChallenger
  contributions { contributor side }`

export const ITEM_FIELDS = `
  id itemID registryAddress status data key0 key1 key2
  props { label value }
  requests(order_by: { submissionTime: asc }) {
    id requestType requester challenger disputed disputeID arbitrator arbitratorExtraData
    submissionTime challengeTime txHashChallenge creationTx resolved resolutionTime disputeOutcome
    numberOfRounds evidenceGroup_id
    rounds(order_by: { creationTime: asc }) { ${ROUND_FIELDS} }
    evidenceGroup { evidences(order_by: { number: asc }) { id party number timestamp title description txHash } }
  }`

export class IndexerError extends Error {}

/** A GraphQL client for the indexer at `url`. */
export const indexerQuery =
  (url: string) =>
  async <T>(
    document: string,
    variables: Record<string, unknown>,
  ): Promise<T> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: document, variables }),
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok)
      throw new IndexerError(`Indexer answered HTTP ${response.status}.`)
    const body = await response.json()
    if (body.errors?.length)
      throw new IndexerError(`Indexer error: ${body.errors[0].message}`)
    return body.data as T
  }

/** What the app reads about a wallet's open cases. */
export const createCaseIndexer = (url: string) => {
  const query = indexerQuery(url)
  return {
    /**
     * Items with an open request that `address` takes part in: as requester,
     * challenger or crowdfunder, or as the submitter of an item someone asked
     * to remove.
     */
    involvedItemIds: async (address: string): Promise<string[]> => {
      const data = await query<{
        parties: { item_id: string }[]
        crowdfunded: { round: { request: { item_id: string } } }[]
        submitted: { item_id: string }[]
      }>(
        `query Involved($address: String!, $registries: [String!]!) {
          parties: LRequest(where: {
            registry_id: { _in: $registries }
            resolved: { _eq: false }
            _or: [{ requester: { _eq: $address } }, { challenger: { _eq: $address } }]
          }, limit: 200) { item_id }
          crowdfunded: LContribution(where: {
            contributor: { _eq: $address }
            round: { request: { registry_id: { _in: $registries }, resolved: { _eq: false } } }
          }, limit: 200) { round { request { item_id } } }
          submitted: LRequest(where: {
            registry_id: { _in: $registries }
            requester: { _eq: $address }
            requestType: { _eq: "RegistrationRequested" }
            item: { status: { _in: ["ClearingRequested"] } }
          }, limit: 200) { item_id }
        }`,
        { address: address.toLowerCase(), registries: REGISTRY_ADDRESSES },
      )
      return [
        ...new Set([
          ...data.parties.map((r) => r.item_id),
          ...data.crowdfunded.map((c) => c.round.request.item_id),
          ...data.submitted.map((r) => r.item_id),
        ]),
      ]
    },

    /** Full context for a set of items: every request, round, contribution and evidence. */
    items: async (ids: string[]): Promise<IndexedItem[]> => {
      if (ids.length === 0) return []
      const items: IndexedItem[] = []
      for (let i = 0; i < ids.length; i += 50) {
        const data = await query<{ LItem: IndexedItem[] }>(
          `query Items($ids: [String!]!) { LItem(where: { id: { _in: $ids } }) { ${ITEM_FIELDS} } }`,
          { ids: ids.slice(i, i + 50) },
        )
        items.push(...data.LItem)
      }
      return items
    },
  }
}
