// Status codes for items
export enum STATUS_CODE {
  ABSENT = 0,
  REGISTERED = 1,
  SUBMITTED = 2,
  REMOVAL_REQUESTED = 3,
  CHALLENGED = 4,
  CROWDFUNDING = 5,
  CROWDFUNDING_WINNER = 6,
  PENDING_SUBMISSION = 7,
  PENDING_REMOVAL = 8,
  WAITING_ARBITRATOR = 9,
  REJECTED = 10,
  WAITING_ENFORCEMENT = 11,
}

// Party enum for appeals
export enum PARTY {
  NONE = 0,
  REQUESTER = 1,
  CHALLENGER = 2,
}

// Subgraph ruling values (matching API response strings)
export enum SUBGRAPH_RULING {
  NONE = 'None',
  ACCEPT = 'Accept',
  REJECT = 'Reject',
  // Also accept numeric strings for backwards compatibility
  NONE_NUM = '0',
  ACCEPT_NUM = '1',
  REJECT_NUM = '2',
}

/**
 * Determines the status code of an item based on its current state
 * Based on gtcr implementation
 */
export function itemToStatusCode(
  item: {
    status: string
    disputed: boolean
    requests: Array<{
      disputed: boolean
      resolved: boolean
      submissionTime?: string
      rounds: Array<{
        hasPaidRequester: boolean
        hasPaidChallenger: boolean
        ruling: string
        appealPeriodStart: string
        appealPeriodEnd: string
      }>
    }>
  },
  timestamp: number,
  challengePeriodDuration: number
): STATUS_CODE {
  const { status } = item
  const request = item.requests?.[0]

  if (!request) {
    return status === 'Registered' ? STATUS_CODE.REGISTERED : STATUS_CODE.ABSENT
  }

  // Handle non-disputed requests first
  if (!request.disputed) {
    const submissionTime = Number(request.submissionTime || 0)
    const challengePeriodEnd = submissionTime + challengePeriodDuration

    if (timestamp > challengePeriodEnd) {
      // Challenge period has passed
      if (status === 'RegistrationRequested') return STATUS_CODE.PENDING_SUBMISSION
      if (status === 'ClearingRequested') return STATUS_CODE.PENDING_REMOVAL
    }

    // Still in challenge period
    if (status === 'RegistrationRequested') return STATUS_CODE.SUBMITTED
    if (status === 'ClearingRequested') return STATUS_CODE.REMOVAL_REQUESTED
  }

  // Handle disputed items
  const round = request.rounds?.[0]

  // Appeal period hasn't started yet
  if (round?.appealPeriodStart === '0') {
    return STATUS_CODE.CHALLENGED
  }

  if (!round) {
    return STATUS_CODE.WAITING_ARBITRATOR
  }

  const { hasPaidRequester, hasPaidChallenger, ruling, appealPeriodStart, appealPeriodEnd } = round

  // Check if ruling is "None" or "Refuse"
  const isNoRuling = ruling === SUBGRAPH_RULING.NONE || ruling === 'Refuse' || ruling === SUBGRAPH_RULING.NONE_NUM

  if (isNoRuling) {
    if (timestamp <= Number(appealPeriodEnd)) {
      // Arbitrator did not rule or refused to rule - allow crowdfunding
      return STATUS_CODE.CROWDFUNDING
    }
    return STATUS_CODE.WAITING_ARBITRATOR
  }

  // Arbitrator gave a decisive ruling
  if (timestamp > Number(appealPeriodEnd)) {
    return STATUS_CODE.WAITING_ARBITRATOR
  }

  // Calculate halfway point of appeal period
  const appealPeriodDuration = Number(appealPeriodEnd) - Number(appealPeriodStart)
  const appealHalfTime = Number(appealPeriodStart) + appealPeriodDuration / 2

  if (timestamp < appealHalfTime) {
    // In first half of appeal period - both sides can fund
    return STATUS_CODE.CROWDFUNDING
  }

  // In second half - only winner can fund
  // Determine loser based on ruling
  const loser = (ruling === SUBGRAPH_RULING.ACCEPT || ruling === SUBGRAPH_RULING.ACCEPT_NUM)
    ? PARTY.CHALLENGER
    : PARTY.REQUESTER

  // If loser has paid, we're in winner crowdfunding period
  const loserHasPaid = loser === PARTY.REQUESTER ? hasPaidRequester : hasPaidChallenger

  if (loserHasPaid) {
    return STATUS_CODE.CROWDFUNDING_WINNER
  }

  // Loser didn't fund in first half - dispute is over, awaiting enforcement
  return STATUS_CODE.WAITING_ENFORCEMENT
}

/**
 * Gets a human-readable action label based on status code
 */
export function getActionLabel({
  statusCode,
  itemName = 'item',
}: {
  statusCode: STATUS_CODE
  itemName?: string
}): string {
  switch (statusCode) {
    case STATUS_CODE.REGISTERED:
      return `Remove ${itemName}`
    case STATUS_CODE.REJECTED:
      return `Resubmit ${itemName}`
    case STATUS_CODE.REMOVAL_REQUESTED:
      return `Challenge Removal`
    case STATUS_CODE.SUBMITTED:
      return `Challenge ${itemName}`
    case STATUS_CODE.CROWDFUNDING:
    case STATUS_CODE.CROWDFUNDING_WINNER:
      return 'Fund Appeal'
    default:
      return 'Action'
  }
}
