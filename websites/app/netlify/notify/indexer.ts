import {
  createCaseIndexer,
  indexerQuery,
  IndexerError,
  REGISTRY_ADDRESSES,
  type IndexedItem,
} from '../../src/utils/cases/indexer'
import { EVIDENCE_SETTLE } from './events'

export * from '../../src/utils/cases/indexer'

/** The service's queries: the app's case queries plus what the watcher needs. */
export const createIndexer = (url: string) => {
  const query = indexerQuery(url)
  return {
    ...createCaseIndexer(url),

    /** Latest Gnosis block the indexer has fully processed. */
    headBlock: async (): Promise<number> => {
      const data = await query<{
        chain_metadata: { latest_processed_block: number }[]
      }>(
        `query { chain_metadata(where: { chain_id: { _eq: 100 } }) { latest_processed_block } }`,
        {},
      )
      const block = data.chain_metadata[0]?.latest_processed_block
      if (typeof block !== 'number')
        throw new IndexerError('Indexer reported no Gnosis progress.')
      return block
    },

    /** Everything that changed in (from, to], as ids to load in full. */
    changesBetween: async (from: number, to: number) => {
      const window = { _gt: String(from), _lte: String(to) }
      // Evidence bursts are announced once they settle, up to EVIDENCE_SETTLE later.
      const evidenceWindow = {
        _gt: String(from - EVIDENCE_SETTLE),
        _lte: String(to),
      }
      const inRegistries = { registry_id: { _in: REGISTRY_ADDRESSES } }
      const evidenceGroups = REGISTRY_ADDRESSES.map((address) => ({
        evidenceGroup_id: { _like: `%@${address}` },
      }))
      const data = await query<{
        submitted: { id: string; item_id: string }[]
        challenged: { id: string; item_id: string }[]
        resolved: { id: string; item_id: string }[]
        evidence: { id: string; evidenceGroup_id: string }[]
        rounds: { id: string; request: { id: string; item_id: string } }[]
      }>(
        `query Changes($inRegistries: LRequest_bool_exp!, $window: numeric_comparison_exp!, $evidenceWindow: numeric_comparison_exp!, $evidenceGroups: [Evidence_bool_exp!]!) {
          submitted: LRequest(where: { _and: [$inRegistries, { submissionTime: $window }] }, limit: 500) { id item_id }
          challenged: LRequest(where: { _and: [$inRegistries, { challengeTime: $window }] }, limit: 500) { id item_id }
          resolved: LRequest(where: { _and: [$inRegistries, { resolved: { _eq: true } }, { resolutionTime: $window }] }, limit: 500) { id item_id }
          evidence: Evidence(where: { _and: [{ timestamp: $evidenceWindow }, { _or: $evidenceGroups }] }, limit: 500) { id evidenceGroup_id }
          rounds: LRound(
            where: {
              request: $inRegistries
              _or: [
                { appealPeriodStart: $window }
                { lastFundedRequester: $window }
                { lastFundedChallenger: $window }
                { appealedAt: $window }
              ]
            }
            limit: 500
          ) { id request { id item_id } }
        }`,
        { inRegistries, window, evidenceWindow, evidenceGroups },
      )
      const itemIds = new Set<string>([
        ...data.submitted.map((r) => r.item_id),
        ...data.challenged.map((r) => r.item_id),
        ...data.resolved.map((r) => r.item_id),
        ...data.rounds.map((r) => r.request.item_id),
      ])
      // Evidence group ids are per request; resolve them to items.
      const groups = [...new Set(data.evidence.map((e) => e.evidenceGroup_id))]
      if (groups.length > 0) {
        const owners = await query<{ LRequest: { item_id: string }[] }>(
          `query Owners($groups: [String!]!) { LRequest(where: { evidenceGroup_id: { _in: $groups } }) { item_id } }`,
          { groups },
        )
        for (const owner of owners.LRequest) itemIds.add(owner.item_id)
      }
      return {
        itemIds: [...itemIds],
        truncated: [
          data.submitted,
          data.challenged,
          data.resolved,
          data.evidence,
          data.rounds,
        ].some((l) => l.length >= 500),
      }
    },

    /** Unresolved requests with an appeal window open right now (for reminders). */
    openAppealItemIds: async (now: number): Promise<string[]> => {
      const data = await query<{ LRound: { request: { item_id: string } }[] }>(
        `query Open($registries: [String!]!, $now: numeric!) {
          LRound(where: {
            appealPeriodStart: { _gt: "0" }
            appealPeriodEnd: { _gt: $now }
            appealed: { _eq: false }
            request: { registry_id: { _in: $registries }, resolved: { _eq: false } }
          }, limit: 200) { request { item_id } }
        }`,
        { registries: REGISTRY_ADDRESSES, now: String(now) },
      )
      return [...new Set(data.LRound.map((r) => r.request.item_id))]
    },

    /** Items whose requests are the given KlerosLiquid disputes. */
    itemIdsForDisputes: async (
      arbitrator: string,
      disputeIds: string[],
    ): Promise<string[]> => {
      if (disputeIds.length === 0) return []
      const data = await query<{ LRequest: { item_id: string }[] }>(
        `query Disputes($registries: [String!]!, $arbitrator: String!, $ids: [numeric!]!) {
          LRequest(where: { registry_id: { _in: $registries }, arbitrator: { _eq: $arbitrator }, disputed: { _eq: true }, disputeID: { _in: $ids } }) { item_id }
        }`,
        {
          registries: REGISTRY_ADDRESSES,
          arbitrator: arbitrator.toLowerCase(),
          ids: disputeIds,
        },
      )
      return [...new Set(data.LRequest.map((r) => r.item_id))]
    },

    /** Minimal item data for labels (e.g. the follows list). */
    itemSummaries: async (ids: string[]) => {
      if (ids.length === 0) return []
      const data = await query<{
        LItem: Pick<
          IndexedItem,
          | 'id'
          | 'itemID'
          | 'registryAddress'
          | 'status'
          | 'key0'
          | 'key1'
          | 'key2'
          | 'props'
        >[]
      }>(
        `query Summaries($ids: [String!]!) { LItem(where: { id: { _in: $ids } }) { id itemID registryAddress status key0 key1 key2 props { label value } } }`,
        { ids },
      )
      return data.LItem
    },
  }
}

export type Indexer = ReturnType<typeof createIndexer>
