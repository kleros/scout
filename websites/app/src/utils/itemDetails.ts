import request, { gql } from 'graphql-request'
import { Prop, Request } from './fetchItems'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts'

export interface GraphEvidence {
  party: string
  URI: string
  number: string
  timestamp: string
  txHash: string
  metadata: {
    title: string | null
    description: string | null
    fileURI: string | null
    fileTypeExtension: string | null
  } | null
}

export interface EvidenceGroup {
  id: string
  evidences: GraphEvidence[]
}

export interface RequestDetails extends Request {
  requestType: string
  arbitrator: string
  arbitratorExtraData: string
  creationTx: string
  resolutionTx: string
  disputeOutcome: string
  evidenceGroup: EvidenceGroup
}

export interface GraphItemDetails {
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
  metadata: {
    key0: string
    key1: string
    key2: string
    key3: string
    props: Prop[]
  } | null
  requests: RequestDetails[]
}

export const fetchItemDetails = async (
  itemId: string
): Promise<GraphItemDetails> => {
  const query = gql`
    query ($id: String!) {
      litem(id: $id) {
        metadata {
          key0
          key1
          key2
          key3
          props {
            value
            type
            label
            description
            isIdentifier
          }
        }
        itemID
        registryAddress
        status
        disputed
        requests(orderBy: submissionTime, orderDirection: desc) {
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
            evidences(orderBy: number, orderDirection: desc) {
              party
              URI
              number
              timestamp
              txHash
              metadata {
                title
                description
                fileURI
                fileTypeExtension
              }
            }
          }
          rounds(orderBy: creationTime, orderDirection: desc) {
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
  const result = (await request({
    url: SUBGRAPH_GNOSIS_ENDPOINT,
    document: query,
    variables: {
      id: itemId,
    },
  })) as any

  return result.litem
}
