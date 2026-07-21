import { useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { queryKeys, REFETCH_INTERVAL, STALE_TIME } from './consts'
import { useGraphqlBatcher } from './useGraphqlBatcher'
import { fetchItemPropsFromIpfs } from 'utils/items'
import { KLEROS_CDN_BASE } from 'consts/index'
import { GraphItemDetails } from '../../utils/itemDetails'

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

  return useQuery({
    queryKey: queryKeys.itemDetails(itemId),
    queryFn: async (): Promise<GraphItemDetails> => {
      const requestId = crypto.randomUUID()
      const result = await graphqlBatcher.request(
        requestId,
        FETCH_ITEM_DETAILS_QUERY,
        {
          id: itemId,
        },
      )

      const item: GraphItemDetails = result.litem

      // Await the IPFS fallback inline rather than patching the cache in the
      // background: this page renders a single item, and resolving before the
      // query settles keeps the loading skeleton up instead of flashing the
      // "IPFS data unavailable" warning. It also keeps interval refetches from
      // clobbering previously patched props with the raw propless item.
      if (item && (!item.props || item.props.length === 0) && item.data) {
        return (await fetchItemPropsFromIpfs([item], KLEROS_CDN_BASE))[0]
      }

      return item
    },
    enabled: enabled && itemId != null && itemId !== '',
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  })
}
