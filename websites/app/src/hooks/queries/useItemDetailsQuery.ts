import { useQuery } from '@tanstack/react-query'
import { gql } from 'graphql-request'
import { queryKeys, REFETCH_INTERVAL, STALE_TIME } from './consts'
import { useGraphqlBatcher } from './useGraphqlBatcher'
import { GraphItemDetails } from '../../utils/itemDetails'

const FETCH_ITEM_DETAILS_QUERY = gql`
  query FetchItemDetails($id: String!) {
    litem: LItem_by_pk(id: $id) {
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

      return result.litem
    },
    enabled: enabled && itemId != null && itemId !== '',
    refetchInterval: REFETCH_INTERVAL,
    staleTime: STALE_TIME,
  })
}
