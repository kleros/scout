import { Prop, Request, Round } from './items'

export interface GraphEvidence {
  party: string
  URI: string
  number: string
  timestamp: string
  txHash: string
  title: string | null
  description: string | null
  fileURI: string | null
  fileTypeExtension: string | null
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
  rounds: Round[]
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
  key0: string
  key1: string
  key2: string
  key3: string
  props: Prop[]
  requests: RequestDetails[]
}
