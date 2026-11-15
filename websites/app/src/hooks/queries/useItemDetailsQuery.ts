import { useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { ITEM_REFETCH, queryKeys, STALE_TIME } from './consts'
import { useGraphqlBatcher } from './useGraphqlBatcher'
import { fetchItemPropsFromIpfs } from 'utils/items'
import { KLEROS_CDN_BASE } from 'consts/index'
import { GraphItemDetails } from '../../utils/itemDetails'
import { itemToStatusCode, STATUS_CODE } from '../../utils/itemStatus'

/** An item that is still not indexed after this long is checked less often. */
const NOT_INDEXED_FAST_FOR_MS = 2 * 60_000
/** The slower check for an item still not indexed, and for a read that failed with nothing to show. */
const SLOW_RECHECK_MS = 30_000

/**
 * How often the item page asks the indexer again, by what can happen to the item next (the
 * indexer's limit is shared by every visitor of Scout and Curate):
 * - not indexed yet (just submitted): every 5 s for two minutes, then every 30 s;
 * - no open request (Included, Removed, Rejected): never, only on returning to the tab;
 * - an open request nobody challenged (in its challenge period, or waiting to be executed): 30 s;
 * - a dispute whose appeal can be funded: 20 s;
 * - a dispute waiting for the jurors or for the ruling to be enforced: 60 s.
 * The state is read the way the page reads it for display (itemToStatusCode).
 */
export const itemRefetchInterval = (
  item: GraphItemDetails | null | undefined,
  { nowSec, missingForMs, failed }: { nowSec: number; missingForMs: number; failed: boolean },
): number | false => {
  if (item === undefined) return failed ? SLOW_RECHECK_MS : false
  if (item === null) {
    return missingForMs < NOT_INDEXED_FAST_FOR_MS ? ITEM_REFETCH.notIndexedYet : SLOW_RECHECK_MS
  }
  const latest = item.requests?.[0]
  if (!latest || latest.resolved || item.status === 'Registered' || item.status === 'Absent') return false
  if (!latest.disputed) return ITEM_REFETCH.challengePeriod
  // A dispute's state does not depend on the challenge period.
  const statusCode = itemToStatusCode(item as any, nowSec, 0)
  return statusCode === STATUS_CODE.CROWDFUNDING || statusCode === STATUS_CODE.CROWDFUNDING_WINNER
    ? ITEM_REFETCH.appealPeriod
    : ITEM_REFETCH.awaitingRuling
}

const FETCH_ITEM_DETAILS_QUERY = gql`
  query FetchItemDetails($id: String!) {
    litem: LItem_by_pk(id: $id) {
      id
      data
      key0
      key1
      key2
      key3
      props {
        value
        type: itemType
        label
        description
        isIdentifier
      }
      itemID
      registryAddress
      status
      disputed
      requests(order_by: { submissionTime: desc }) {
        requestType
        disputed
        disputeID
        submissionTime
        resolved
        requester
        arbitrator
        arbitratorExtraData
        challenger
        creationTx
        resolutionTx
        txHashChallenge
        challengeTime
        deposit
        disputeOutcome
        resolutionTime
        evidenceGroup {
          id
          evidences(order_by: { number: desc }) {
            party
            URI: uri
            number
            timestamp
            txHash
            title
            description
            fileURI
            fileTypeExtension
          }
        }
        rounds(order_by: { creationTime: desc }) {
          appealed
          appealPeriodStart
          appealPeriodEnd
          ruling
          hasPaidRequester
          hasPaidChallenger
          amountPaidRequester
          amountPaidChallenger
          lastFundedRequester
          lastFundedChallenger
          txHashAppealFundedRequester
          txHashAppealFundedChallenger
          txHashAppealPossible
          appealedAt
          txHashAppealDecision
        }
      }
    }
  }
`

interface UseItemDetailsQueryParams {
  itemId: string
  enabled?: boolean
}

export const useItemDetailsQuery = ({
  itemId,
  enabled = true,
}: UseItemDetailsQueryParams) => {
  const graphqlBatcher = useGraphqlBatcher()
  const queryClient = useQueryClient()
  // Since when this page has found no item with this ID (it may have been submitted a moment ago).
  const missingSince = useRef<{ itemId: string; since: number } | null>(null)

  return useQuery({
    queryKey: queryKeys.itemDetails(itemId),
    // null when the indexer has no item with this ID (the page says "Item not found"); a failed
    // request rejects, so the page can tell "not found" from "did not load".
    queryFn: async (): Promise<GraphItemDetails | null> => {
      const requestId = crypto.randomUUID()
      const result = await graphqlBatcher.request(
        requestId,
        FETCH_ITEM_DETAILS_QUERY,
        {
          id: itemId,
        },
      )

      const item: GraphItemDetails | null = result?.litem ?? null

      // Await the IPFS fallback inline rather than patching the cache in the
      // background: this page renders a single item, and resolving before the
      // query settles keeps the loading skeleton up instead of flashing the
      // "IPFS data unavailable" warning. It also keeps interval refetches from
      // clobbering previously patched props with the raw propless item.
      if (item && (!item.props || item.props.length === 0) && item.data) {
        // CID content is immutable, so props resolved on an earlier cycle stay
        // valid while `data` is unchanged. Reusing them (with the keys the
        // fallback derived from identifier props) spares a gateway round-trip
        // on every interval refetch, and keeps a transient gateway failure
        // from replacing good props with the raw item — which would resurface
        // the "IPFS data unavailable" warning mid-session.
        const prev = queryClient.getQueryData<GraphItemDetails>(
          queryKeys.itemDetails(itemId),
        )
        if (prev && prev.props?.length > 0 && prev.data === item.data) {
          return {
            ...item,
            props: prev.props,
            key0: item.key0 || prev.key0,
            key1: item.key1 || prev.key1,
            key2: item.key2 || prev.key2,
            key3: item.key3 || prev.key3,
          }
        }
        return (await fetchItemPropsFromIpfs([item], KLEROS_CDN_BASE))[0]
      }

      return item
    },
    enabled: enabled && itemId != null && itemId !== '',
    refetchInterval: (query) => {
      const data = query.state.data
      if (data !== null) missingSince.current = null
      else if (missingSince.current?.itemId !== itemId) missingSince.current = { itemId, since: Date.now() }
      return itemRefetchInterval(data, {
        nowSec: Math.floor(Date.now() / 1000),
        missingForMs: missingSince.current ? Date.now() - missingSince.current.since : 0,
        failed: query.state.status === 'error',
      })
    },
    // Coming back to the tab shows what changed meanwhile (an item with no open request is not polled).
    refetchOnWindowFocus: true,
    staleTime: STALE_TIME,
  })
}
