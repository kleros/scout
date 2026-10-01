import {
  requestSides,
  roundIndex,
  type Side,
} from '../../src/utils/cases/disputes'
import type {
  IndexedEvidence,
  IndexedItem,
  IndexedRequest,
  IndexedRound,
} from './indexer'
import type { PeriodChange, RewardPaid } from './chain'

export * from '../../src/utils/cases/disputes'

/**
 * Domain events derived from indexer snapshots. Each event has a stable
 * `key`, so replaying a time window never produces duplicates.
 *
 * Light Curate emits no "side fully funded" event (only per-contribution
 * `Contribution` logs), so funding is derived from each round's hasPaid
 * flags and last funding time.
 */
interface Base {
  key: string
  item: IndexedItem
  request: IndexedRequest
  requestIndex: number
}

export type DomainEvent =
  | (Base & { kind: 'submitted' })
  | (Base & { kind: 'challenged' })
  | (Base & {
      kind: 'evidence'
      /** The latest piece of the burst. */
      evidence: IndexedEvidence
      /** Every piece the author posted in this burst, oldest first. */
      pieces: IndexedEvidence[]
    })
  | (Base & { kind: 'appealable'; round: IndexedRound })
  | (Base & { kind: 'funded'; round: IndexedRound; side: Side })
  | (Base & { kind: 'contribution'; round: IndexedRound; side: Side })
  | (Base & { kind: 'appealed'; round: IndexedRound })
  | (Base & { kind: 'resolved' })
  | (Base & { kind: 'period'; period: 'commit' | 'vote' })
  | (Base & { kind: 'reward'; beneficiary: string; amount: bigint })

const inWindow = (
  value: string | null | undefined,
  from: number,
  to: number,
) => {
  const t = Number(value ?? 0)
  return t > from && t <= to
}

/**
 * Evidence is posted one piece per transaction, often several in a row.
 * Each author's burst is announced once, when the author has paused this
 * long (seconds), with all of its pieces.
 */
export const EVIDENCE_SETTLE = 600

/** Groups pieces (oldest first) into bursts: same author, gaps of at most EVIDENCE_SETTLE. */
export const evidenceBursts = (pieces: IndexedEvidence[]) => {
  const byAuthor = new Map<string, IndexedEvidence[][]>()
  for (const piece of pieces) {
    const author = piece.party.toLowerCase()
    const bursts = byAuthor.get(author) ?? []
    const current = bursts.at(-1)
    const last = current?.at(-1)
    if (
      current &&
      last &&
      Number(piece.timestamp) - Number(last.timestamp) <= EVIDENCE_SETTLE
    )
      current.push(piece)
    else bursts.push([piece])
    byAuthor.set(author, bursts)
  }
  return [...byAuthor.values()].flat()
}

export const detectItemEvents = (
  item: IndexedItem,
  from: number,
  to: number,
): DomainEvent[] => {
  const events: DomainEvent[] = []
  item.requests.forEach((request, requestIndex) => {
    const base = { item, request, requestIndex }
    if (inWindow(request.submissionTime, from, to)) {
      events.push({
        ...base,
        kind: 'submitted',
        key: `submitted:${request.id}`,
      })
    }
    if (request.disputed && inWindow(request.challengeTime, from, to)) {
      events.push({
        ...base,
        kind: 'challenged',
        key: `challenged:${request.id}`,
      })
    }
    // The challenge reason and removal reason arrive with their own events.
    const pieces = (request.evidenceGroup?.evidences ?? [])
      .filter(
        (e) =>
          e.txHash !== request.txHashChallenge &&
          e.txHash !== request.creationTx,
      )
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
    for (const burst of evidenceBursts(pieces)) {
      const last = burst[burst.length - 1]
      const settled = String(Number(last.timestamp) + EVIDENCE_SETTLE)
      if (!inWindow(settled, from, to)) continue
      events.push({
        ...base,
        kind: 'evidence',
        evidence: last,
        pieces: burst,
        key: `evidence:${burst[0].id}`,
      })
    }
    for (const round of request.rounds) {
      if (roundIndex(round) === 0) continue
      if (
        round.appealPeriodStart !== '0' &&
        inWindow(round.appealPeriodStart, from, to)
      ) {
        events.push({
          ...base,
          kind: 'appealable',
          round,
          key: `appealable:${round.id}`,
        })
      }
      const appealedNow = round.appealed && inWindow(round.appealedAt, from, to)
      for (const side of ['requester', 'challenger'] as const) {
        const lastFunded =
          side === 'requester'
            ? round.lastFundedRequester
            : round.lastFundedChallenger
        const hasPaid =
          side === 'requester'
            ? round.hasPaidRequester
            : round.hasPaidChallenger
        if (!inWindow(lastFunded, from, to)) continue
        if (hasPaid) {
          // When the second side completes funding, the appeal happens in the
          // same transaction and its notification covers both sides. The
          // snapshot is read after the window closes, so skip rounds already
          // appealed by then: "fund or lose" would be stale.
          if (!round.appealed)
            events.push({
              ...base,
              kind: 'funded',
              round,
              side,
              key: `funded:${round.id}:${side}`,
            })
        } else {
          events.push({
            ...base,
            kind: 'contribution',
            round,
            side,
            key: `contribution:${round.id}:${side}:${lastFunded}`,
          })
        }
      }
      if (appealedNow)
        events.push({
          ...base,
          kind: 'appealed',
          round,
          key: `appealed:${round.id}`,
        })
    }
    if (request.resolved && inWindow(request.resolutionTime, from, to)) {
      events.push({ ...base, kind: 'resolved', key: `resolved:${request.id}` })
    }
  })
  return events
}

/** Court period changes worth telling parties about (the rest have richer events). */
export const periodEvents = (
  items: IndexedItem[],
  changes: PeriodChange[],
): DomainEvent[] => {
  const events: DomainEvent[] = []
  for (const change of changes) {
    if (change.period !== 'commit' && change.period !== 'vote') continue
    for (const item of items) {
      item.requests.forEach((request, requestIndex) => {
        if (
          !request.disputed ||
          request.resolved ||
          request.disputeID !== change.disputeId
        )
          return
        events.push({
          item,
          request,
          requestIndex,
          kind: 'period',
          period: change.period as 'commit' | 'vote',
          key: `period:${change.key}`,
        })
      })
    }
  }
  return events
}

export const rewardEvents = (
  items: IndexedItem[],
  rewards: RewardPaid[],
): DomainEvent[] => {
  const events: DomainEvent[] = []
  for (const reward of rewards) {
    const item = items.find(
      (i) =>
        i.itemID.toLowerCase() === reward.itemID &&
        i.registryAddress === reward.registry,
    )
    if (!item) continue
    const requestIndex = item.requests.length - 1
    events.push({
      item,
      request: item.requests[requestIndex],
      requestIndex,
      kind: 'reward',
      beneficiary: reward.beneficiary,
      amount: reward.amount,
      key: `reward:${reward.key}`,
    })
  }
  return events
}

// ---------------------------------------------------------------------------
// Parties
// ---------------------------------------------------------------------------

const ZERO = '0x0000000000000000000000000000000000000000'
const norm = (address: string | null | undefined) =>
  (address ?? '').toLowerCase()

/** Everyone who ever took part in the item: parties, crowdfunders and evidence authors. */
export const itemParticipants = (item: IndexedItem): Set<string> => {
  const participants = new Set<string>()
  for (const request of item.requests) {
    const sides = requestSides(request)
    sides.requester.forEach((a) => participants.add(a))
    sides.challenger.forEach((a) => participants.add(a))
    for (const evidence of request.evidenceGroup?.evidences ?? [])
      participants.add(norm(evidence.party))
  }
  participants.delete(ZERO)
  return participants
}
