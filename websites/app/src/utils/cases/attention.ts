import type { IndexedEvidence, IndexedItem, IndexedRequest } from './indexer'
import {
  appealDeadlines,
  appealObligations,
  currentRound,
  isRemoval,
  itemSubmitters,
  otherSide,
  requestSides,
  rulingWinner,
  sideFunded,
  sidePaid,
  type AppealObligation,
  type Side,
} from './disputes'

/**
 * What an address has at stake right now, derived from the current state of
 * the items it takes part in rather than from notifications, so it stays on
 * screen for as long as it matters. Uses the same rules as the alerts.
 *
 * - `urgent`: act before the deadline or lose (e.g. the other side funded
 *   its appeal against a ruling you won).
 * - `action`: a decision is yours to make before a deadline (appeal a ruling,
 *   challenge a removal, add evidence).
 * - `waiting`: nothing to do, but worth keeping in view.
 */
export type AttentionLevel = 'urgent' | 'action' | 'waiting'

export type AttentionKind =
  /** The other side funded its appeal: fund yours or lose despite the ruling. */
  | 'defend'
  /** The ruling went against you: your side can appeal until the midpoint. */
  | 'appeal'
  /** No ruling: each side must be funded by the end of the window. */
  | 'fund-undecided'
  /** Your side is funded; the other side still can be. */
  | 'appeal-funded'
  /** The ruling favors you; the other side can still appeal. */
  | 'ruling-won'
  /** The appeal window is over: the ruling will be enforced. */
  | 'ruling-final'
  /** Your request is in a dispute (evidence, then voting). */
  | 'challenged'
  /** A dispute you take part in is in progress. */
  | 'dispute'
  /** Someone asked to remove an item you submitted: it can be challenged. */
  | 'removal-requested'
  /** Your request can still be challenged. */
  | 'challenge-period'
  /** Unchallenged and past its challenge period: waiting to be executed. */
  | 'executable'

export interface Attention {
  key: string
  level: AttentionLevel
  kind: AttentionKind
  item: IndexedItem
  request: IndexedRequest
  /** Your side in the request, as a party or a crowdfunder. */
  side?: Side
  /** Whether you are the requester or challenger yourself. */
  party: boolean
  deadline?: number
  /** Which stake multiplier prices your side's appeal funding. */
  required?: AppealObligation['required']
  /** Already raised for your side in the current round, in wei. */
  raised?: bigint
}

const LEVEL_ORDER: Record<AttentionLevel, number> = {
  urgent: 0,
  action: 1,
  waiting: 2,
}

// Among cases in progress, disputes and rulings come before routine
// submissions waiting out their challenge period.
const WAITING_ORDER: Partial<Record<AttentionKind, number>> = {
  'appeal-funded': 0,
  'ruling-won': 1,
  dispute: 2,
  'ruling-final': 3,
}

const norm = (address: string | null | undefined) =>
  (address ?? '').toLowerCase()

/**
 * Everything `address` should keep an eye on, most pressing first.
 * `challengePeriodOf` gives a registry's challenge period in seconds, to date
 * unchallenged requests; `disputePeriodOf` gives a dispute's court period
 * (evidence, commit, vote...), since evidence only helps before voting.
 */
export const attentionFor = (
  items: IndexedItem[],
  address: string,
  now: number,
  challengePeriodOf: (registry: string) => number | undefined = () => undefined,
  disputePeriodOf: (disputeId: string) => string | undefined = () => undefined,
): Attention[] => {
  const me = norm(address)
  const entries: Attention[] = []
  for (const item of items) {
    const requestIndex = item.requests.length - 1
    const request = item.requests[requestIndex]
    if (!request || request.resolved) continue
    const sides = requestSides(request)
    const side: Side | undefined = sides.requester.has(me)
      ? 'requester'
      : sides.challenger.has(me)
        ? 'challenger'
        : undefined
    const party =
      norm(request.requester) === me ||
      (request.disputed && norm(request.challenger) === me)
    // Whoever submitted an item has a stake in requests to remove it.
    const submitter =
      isRemoval(request) && itemSubmitters(item, requestIndex).has(me)
    if (!side && !submitter) continue
    const base = { item, request, side, party }
    const push = (entry: Omit<Attention, keyof typeof base | 'key'>) =>
      entries.push({ ...base, ...entry, key: `${request.id}:${entry.kind}` })

    if (!request.disputed) {
      const period = challengePeriodOf(item.registryAddress)
      const deadline =
        period === undefined
          ? undefined
          : Number(request.submissionTime) + period
      const open = deadline === undefined || now < deadline
      if (side === 'requester')
        push({
          level: 'waiting',
          kind: open ? 'challenge-period' : 'executable',
          deadline: open ? deadline : undefined,
        })
      else if (open)
        push({ level: 'action', kind: 'removal-requested', deadline })
      continue
    }

    const round = currentRound(request)
    if (!round || round.appealPeriodStart === '0' || round.appealed) {
      // Evidence, commit or vote period: no ruling to act on yet. Evidence
      // matters until voting starts (assumed while the period is unknown).
      const period = disputePeriodOf(request.disputeID)
      push(
        side === 'requester' &&
          party &&
          (period === undefined || period === 'evidence')
          ? { level: 'action', kind: 'challenged' }
          : { level: 'waiting', kind: 'dispute' },
      )
      continue
    }

    const d = appealDeadlines(round)
    if (now >= d.end || !side) {
      push({
        level: 'waiting',
        kind: now >= d.end ? 'ruling-final' : 'dispute',
      })
      continue
    }
    const mine = appealObligations(round).find(
      (o) => o.side === side && o.deadline > now,
    )
    if (mine) {
      const theirsFunded = sideFunded(round, otherSide(side))
      push({
        level:
          mine.required === 'winner' ||
          (mine.required === 'shared' && theirsFunded)
            ? 'urgent'
            : 'action',
        kind:
          mine.required === 'winner'
            ? 'defend'
            : mine.required === 'loser'
              ? 'appeal'
              : 'fund-undecided',
        deadline: mine.deadline,
        required: mine.required,
        raised: sidePaid(round, side),
      })
    } else if (sideFunded(round, side)) {
      const theirs = appealObligations(round).find((o) => o.deadline > now)
      push({
        level: 'waiting',
        kind: 'appeal-funded',
        deadline: theirs?.deadline,
      })
    } else if (rulingWinner(round.ruling) === side && now < d.loser) {
      push({ level: 'waiting', kind: 'ruling-won', deadline: d.loser })
    } else {
      push({ level: 'waiting', kind: 'ruling-final' })
    }
  }
  return sortAttention(entries)
}

const rank = (e: Attention) =>
  e.level === 'waiting' ? (WAITING_ORDER[e.kind] ?? 4) : 0

const sortAttention = <T extends Attention>(entries: T[]): T[] =>
  entries.sort(
    (a, b) =>
      LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level] ||
      rank(a) - rank(b) ||
      (a.deadline ?? Infinity) - (b.deadline ?? Infinity),
  )

// ---------------------------------------------------------------------------
// Evidence
// ---------------------------------------------------------------------------

export interface EvidenceStatus {
  total: number
  /** Posted by someone else after the address last read the item's evidence. */
  unread: number
  /** The latest piece of evidence posted by someone else. */
  latest?: IndexedEvidence
}

/**
 * Evidence `viewer` hasn't read: posted by others after both the last time
 * it read them and its own latest evidence (answering implies reading).
 */
export const unreadEvidence = <E extends { party: string; timestamp: string }>(
  evidences: E[],
  viewer: string,
  seenUntil = 0,
): E[] => {
  const me = norm(viewer)
  const answered = evidences.reduce(
    (latest, e) =>
      norm(e.party) === me ? Math.max(latest, Number(e.timestamp)) : latest,
    0,
  )
  const since = Math.max(seenUntil, answered)
  return evidences.filter(
    (e) => norm(e.party) !== me && Number(e.timestamp) > since,
  )
}

/** Evidence on a request, as `address` sees it; its own is never unread. */
export const evidenceStatus = (
  request: IndexedRequest,
  address: string,
  seenUntil = 0,
): EvidenceStatus => {
  const me = norm(address)
  const evidences = request.evidenceGroup?.evidences ?? []
  const others = evidences.filter((e) => norm(e.party) !== me)
  return {
    total: evidences.length,
    unread: unreadEvidence(evidences, address, seenUntil).length,
    latest: others.reduce<IndexedEvidence | undefined>(
      (last, e) =>
        !last || Number(e.timestamp) >= Number(last.timestamp) ? e : last,
      undefined,
    ),
  }
}

export type AttentionWithEvidence = Attention & {
  evidence: EvidenceStatus
  /** Moved up from "in progress" because of unread evidence. */
  newEvidence: boolean
}

/**
 * Adds evidence counts to entries. Unread evidence keeps a case among the
 * ones to act on until it is read, even while nothing else is due: it is
 * what the other side says, and there may be time to answer it.
 * `seenUntil` gives, per item id, the time up to which evidence was read.
 */
export const withEvidence = (
  entries: Attention[],
  address: string,
  seenUntil: (itemId: string) => number,
): AttentionWithEvidence[] =>
  sortAttention(
    entries.map((entry) => {
      const evidence = evidenceStatus(
        entry.request,
        address,
        seenUntil(entry.item.id),
      )
      const newEvidence = evidence.unread > 0 && entry.level === 'waiting'
      return {
        ...entry,
        level: newEvidence ? 'action' : entry.level,
        evidence,
        newEvidence,
      }
    }),
  )
