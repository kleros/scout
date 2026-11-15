import { Prop, Request, Round } from './items'
import { PARTY, getAppealHalfTime } from './itemStatus'

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
  data: string
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

/** True when the request asks to remove the item (the requester is a remover, not a submitter). */
export const isRemovalRequest = (
  request: { requestType?: string | null } | undefined,
  itemStatus?: string,
): boolean => {
  const type = request?.requestType?.toLowerCase()
  if (type === 'clearingrequested') return true
  if (type === 'registrationrequested') return false
  return itemStatus === 'ClearingRequested'
}

export type Ruling = 'Accept' | 'Reject' | 'None'

/** The indexer's ruling ('Accept', 'Reject', 'None', 'Refuse' or the numbers 0-2) as one of three. */
export const normalizeRuling = (ruling?: string | null): Ruling => {
  if (ruling === 'Accept' || ruling === '1') return 'Accept'
  if (ruling === 'Reject' || ruling === '2') return 'Reject'
  return 'None'
}

/**
 * What the latest round of a dispute says about appeals, as the Light Curate contract applies it:
 * with a decisive ruling the losing side can be funded only in the first half of the appeal
 * period and the winning side until its end; with no decisive ruling both sides until the end.
 */
export interface AppealInfo {
  /** Jurors have ruled on the latest round, so its appeal period has started. */
  hasRuling: boolean
  ruling: Ruling
  decisive: boolean
  isRemoval: boolean
  /** "Submitter" for a registration, "Remover" for a removal request. */
  requesterLabel: 'Submitter' | 'Remover'
  /** PARTY.NONE when the ruling is not decisive. */
  winner: PARTY
  loser: PARTY
  start: number
  half: number
  end: number
  hasPaidRequester: boolean
  hasPaidChallenger: boolean
}

export const getAppealInfo = (
  item: Pick<GraphItemDetails, 'status' | 'requests'> | null | undefined,
): AppealInfo | null => {
  const request = item?.requests?.[0]
  const round = request?.rounds?.[0]
  if (!item || !request || !round) return null
  const start = Number(round.appealPeriodStart || 0)
  const end = Number(round.appealPeriodEnd || 0)
  const ruling = normalizeRuling(round.ruling)
  const decisive = ruling !== 'None'
  const winner = !decisive ? PARTY.NONE : ruling === 'Accept' ? PARTY.REQUESTER : PARTY.CHALLENGER
  const isRemoval = isRemovalRequest(request, item.status)
  return {
    hasRuling: start > 0 && end > 0,
    ruling,
    decisive,
    isRemoval,
    requesterLabel: isRemoval ? 'Remover' : 'Submitter',
    winner,
    loser: winner === PARTY.NONE ? PARTY.NONE : winner === PARTY.REQUESTER ? PARTY.CHALLENGER : PARTY.REQUESTER,
    start,
    half: getAppealHalfTime(start, end),
    end,
    hasPaidRequester: !!round.hasPaidRequester,
    hasPaidChallenger: !!round.hasPaidChallenger,
  }
}

/** Until when (unix seconds) a side can be funded: the loser's half, otherwise the end of the period. */
export const appealDeadlineFor = (appeal: AppealInfo, party: PARTY): number =>
  appeal.decisive && party === appeal.loser ? appeal.half : appeal.end

/** "Submitter", "Remover" or "Challenger". */
export const partyLabel = (appeal: Pick<AppealInfo, 'requesterLabel'>, party: PARTY): string =>
  party === PARTY.REQUESTER ? appeal.requesterLabel : 'Challenger'

/** The ruling as the timeline names it: "Accept Registration", "Reject Removal", "Refuse to Arbitrate". */
export const rulingLabel = (ruling: Ruling, isRemoval: boolean): string => {
  if (ruling === 'None') return 'Refuse to Arbitrate'
  return `${ruling} ${isRemoval ? 'Removal' : 'Registration'}`
}
