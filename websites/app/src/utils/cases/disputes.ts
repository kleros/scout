import type { IndexedItem, IndexedRequest, IndexedRound } from './indexer'

/**
 * Who stands where in a Light Curate request, and what an appeal round
 * asks of each side. Shared by the app and the notification service.
 */

export type Side = 'requester' | 'challenger'

export const isRemoval = (request: IndexedRequest) =>
  request.requestType === 'ClearingRequested'

/** Index of a round within its request (round 0 holds the request and challenge deposits). */
export const roundIndex = (round: IndexedRound) =>
  Number(round.id.slice(round.id.lastIndexOf('-') + 1))

const ZERO = '0x0000000000000000000000000000000000000000'
const norm = (address: string | null | undefined) =>
  (address ?? '').toLowerCase()

/** Everyone on each side of a request: the party plus its crowdfunders. */
export const requestSides = (
  request: IndexedRequest,
): Record<Side, Set<string>> => {
  const sides: Record<Side, Set<string>> = {
    requester: new Set(),
    challenger: new Set(),
  }
  if (request.requester && norm(request.requester) !== ZERO)
    sides.requester.add(norm(request.requester))
  if (
    request.disputed &&
    request.challenger &&
    norm(request.challenger) !== ZERO
  )
    sides.challenger.add(norm(request.challenger))
  for (const round of request.rounds) {
    for (const contribution of round.contributions) {
      if (contribution.side === '1')
        sides.requester.add(norm(contribution.contributor))
      if (contribution.side === '2')
        sides.challenger.add(norm(contribution.contributor))
    }
  }
  return sides
}

/** Accounts that submitted the item (registration requesters before `requestIndex`). */
export const itemSubmitters = (
  item: IndexedItem,
  requestIndex: number,
): Set<string> =>
  new Set(
    item.requests
      .slice(0, requestIndex)
      .filter((request) => !isRemoval(request))
      .map((request) => norm(request.requester)),
  )

/** Which side the current ruling favors ("None" means refused or tied). */
export const rulingWinner = (ruling: string): Side | null =>
  ruling === 'Accept' || ruling === '1'
    ? 'requester'
    : ruling === 'Reject' || ruling === '2'
      ? 'challenger'
      : null

export const otherSide = (side: Side): Side =>
  side === 'requester' ? 'challenger' : 'requester'

export const appealDeadlines = (round: IndexedRound) => {
  const start = Number(round.appealPeriodStart)
  const end = Number(round.appealPeriodEnd)
  // Light Curate: the loser must be fully funded before the midpoint.
  return {
    start,
    end,
    loser: start + Math.floor((end - start) / 2),
    winner: end,
  }
}

export const sideFunded = (round: IndexedRound, side: Side) =>
  side === 'requester' ? round.hasPaidRequester : round.hasPaidChallenger

export const sidePaid = (round: IndexedRound, side: Side) =>
  BigInt(
    side === 'requester'
      ? round.amountPaidRequester
      : round.amountPaidChallenger,
  )

export interface AppealObligation {
  side: Side
  deadline: number
  /** Which stake multiplier prices this side's funding. */
  required: 'winner' | 'loser' | 'shared'
}

/**
 * Who has to fund a round in its appeal window, and by when. The loser goes
 * first (until the midpoint); only once it is funded does the winner have to
 * fund too, or lose despite the ruling. Without a ruling, both sides have
 * the whole window.
 */
export const appealObligations = (round: IndexedRound): AppealObligation[] => {
  const d = appealDeadlines(round)
  const winner = rulingWinner(round.ruling)
  if (!winner)
    return (['requester', 'challenger'] as const)
      .filter((side) => !sideFunded(round, side))
      .map((side) => ({ side, deadline: d.end, required: 'shared' }))
  const loser = otherSide(winner)
  if (!sideFunded(round, loser))
    return [{ side: loser, deadline: d.loser, required: 'loser' }]
  if (!sideFunded(round, winner))
    return [{ side: winner, deadline: d.end, required: 'winner' }]
  return []
}

/** The request's latest appeal round (round 0 only holds the deposits). */
export const currentRound = (request: IndexedRequest) =>
  request.rounds.filter((round) => roundIndex(round) > 0).at(-1)
