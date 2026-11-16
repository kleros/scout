import type { Attention, AttentionWithEvidence } from 'utils/cases/attention'
import { inAppealRound, isRemoval, type Side } from 'utils/cases/disputes'
import type { IndexedRequest } from 'utils/cases/indexer'
import { GENERIC_EVIDENCE_TITLE, itemNoun } from 'utils/cases/labels'

export interface AttentionContext {
  /** Still to raise for your side, e.g. "101 xDAI", once the cost is known. */
  missing?: string
  /** The dispute's court period, for disputes before a ruling. */
  period?: string
}

const PERIOD_TEXT: Record<string, string> = {
  evidence: 'Both sides can add evidence.',
  commit: 'Jurors are committing their votes.',
  vote: 'Jurors are voting.',
  appeal: 'The ruling is in; the appeal period is open.',
  execution: 'The ruling is being enforced.',
}

export interface CourtDeadline {
  label: string
  at: number
  /** The period can end earlier: once every juror has committed or voted. */
  latest: boolean
}

/**
 * When the dispute's court period ends, if a date can be given. Kleros
 * Liquid (`passPeriod`): the first round's evidence period lasts at least its
 * set time, but an appeal round's ends as soon as jurors are drawn; commit
 * and vote end early once every juror has committed or voted; the appeal
 * period ends on time.
 */
export const courtDeadline = (
  request: IndexedRequest,
  court: { period: string; deadline: number },
): CourtDeadline | undefined => {
  switch (court.period) {
    case 'evidence':
      return inAppealRound(request)
        ? undefined
        : { label: 'Evidence period ends', at: court.deadline, latest: false }
    case 'commit':
      return { label: 'Commit period ends', at: court.deadline, latest: true }
    case 'vote':
      return { label: 'Voting ends', at: court.deadline, latest: true }
    case 'appeal':
      return { label: 'Appeal period ends', at: court.deadline, latest: false }
    default:
      return undefined
  }
}

/** A side of the request, as the entry's address sees it. */
const sideName = (entry: Attention, side: Side) =>
  entry.side === side
    ? 'your side'
    : entry.side
      ? 'the other side'
      : side === 'challenger'
        ? 'the challenger'
        : isRemoval(entry.request)
          ? 'the removal requester'
          : 'the submitter'

/** What the contract's `rule` does to the item when `winner` wins (null: no one). */
const itemOutcome = (entry: Attention, winner: Side | null | undefined) => {
  const noun = itemNoun(entry.item)
  const removal = isRemoval(entry.request)
  if (winner === 'requester')
    return `the ${noun} is ${removal ? 'removed from' : 'added to'} the list`
  return `the ${noun} ${removal ? 'stays on' : 'is not added to'} the list`
}

// A settled case takes effect when the appeal period ends (the entry's
// deadline), or, once it has, when someone executes the ruling.
const takesEffect = (entry: Attention) =>
  entry.deadline !== undefined
    ? 'when the appeal period ends'
    : 'once the ruling is executed'

/** What to tell the user about an entry, in the same terms as the alerts. */
export const describeAttention = (
  entry: Attention,
  { missing, period }: AttentionContext = {},
): { title: string; body: string } => {
  const noun = itemNoun(entry.item)
  const removal = entry.request.requestType === 'ClearingRequested'
  const dispute = `dispute #${entry.request.disputeID}`
  const need = missing ? ` Your side needs ${missing} more.` : ''
  switch (entry.kind) {
    case 'defend':
      return {
        title: 'The other side appealed: fund your side or lose',
        body: `Jurors ruled for your side, but the other side fully funded its appeal. Fund ${missing ?? 'your side'} before the deadline or you lose the case, even though you won the vote.`,
      }
    case 'appeal':
      return {
        title: 'The ruling went against you',
        body: `Appeal before the deadline, or the ruling stands.${need}`,
      }
    case 'fund-undecided':
      return entry.level === 'urgent'
        ? {
            title: 'The other side is funded: fund yours or lose',
            body: `Jurors could not decide, and the other side is fully funded. If only one side is funded when the appeal period ends, it wins.${need}`,
          }
        : {
            title: 'Jurors could not decide',
            body: `If only one side is fully funded when the appeal period ends, that side wins. If neither is, the request is rejected and the deposits are split between both sides.${need}`,
          }
    case 'appeal-funded':
      return {
        title: "Your side's appeal is funded",
        body: 'If the other side is not fully funded by the deadline, your side wins.',
      }
    case 'ruling-won':
      return {
        title: 'The ruling favors your side',
        body: 'The other side can appeal until the deadline. If it does, you will have to fund your side, and this will turn red.',
      }
    case 'funded-side-wins':
      return {
        title: `Only ${sideName(entry, entry.winner ?? 'requester')} was fully funded, so it wins`,
        body: `A side that alone funds its appeal wins whatever the jurors ruled: ${itemOutcome(entry, entry.winner)} ${takesEffect(entry)}.`,
      }
    case 'ruling-final':
      return entry.winner
        ? {
            title: 'The ruling is final',
            body: `${entry.deadline !== undefined ? 'The losing side can no longer appeal' : 'The appeal period is over'}: ${itemOutcome(entry, entry.winner)} ${takesEffect(entry)}.`,
          }
        : {
            title: 'Jurors could not decide',
            body: `Neither side funded an appeal, so the request is rejected (${itemOutcome(entry, null)}) and the deposits are split between both sides ${takesEffect(entry)}.`,
          }
    // In an appeal round, Kleros Liquid lets anyone end the evidence period
    // as soon as the jurors are drawn: there is no date to count on.
    case 'challenged':
      return {
        title: `Your ${removal ? 'removal request' : noun} was challenged`,
        body: inAppealRound(entry.request)
          ? `It is ${dispute} in the Kleros court, in an appeal round: voting can start as soon as jurors are drawn, so add your side's evidence on the item page now.`
          : `It is ${dispute} in the Kleros court. Add your side's evidence on the item page before voting starts.`,
      }
    case 'dispute': {
      const text = period
        ? (PERIOD_TEXT[period] ?? '')
        : 'Jurors will rule after the evidence period.'
      return {
        title: `${dispute[0].toUpperCase()}${dispute.slice(1)} is in progress`,
        body:
          period === 'evidence' && inAppealRound(entry.request)
            ? `${text} Voting can start as soon as jurors are drawn.`
            : text,
      }
    }
    case 'removal-requested':
      return {
        title: `Someone asked to remove your ${noun}`,
        body: 'If it still follows the policy, you can challenge the removal before the deadline.',
      }
    case 'challenge-period':
      return (entry as Partial<AttentionWithEvidence>).newEvidence
        ? {
            title: `New evidence on your pending ${removal ? 'removal request' : noun}`,
            body: 'Someone posted evidence while it can still be challenged; that often comes before a challenge.',
          }
        : {
            title: removal ? 'Removal requested' : 'Submitted',
            body: 'It can be challenged until the deadline.',
          }
    case 'executable':
      return {
        title: 'Ready to execute',
        body: 'The challenge period is over; it will be executed shortly.',
      }
  }
}

/** Who posted a piece of evidence, from the point of view of the request. */
export const evidenceAuthor = (entry: Attention, party: string) => {
  const author = party.toLowerCase()
  if (author === entry.request.requester.toLowerCase())
    return entry.request.requestType === 'ClearingRequested'
      ? 'the removal requester'
      : 'the submitter'
  if (
    entry.request.disputed &&
    author === entry.request.challenger.toLowerCase()
  )
    return 'the challenger'
  return `${author.slice(0, 6)}…${author.slice(-4)}`
}

/** A short quote of a piece of evidence: its title, or its text when the title is a label. */
export const evidenceSnippet = (evidence: {
  title?: string | null
  description?: string | null
}) => {
  const title = (evidence.title ?? '').trim()
  const text = (
    title && !GENERIC_EVIDENCE_TITLE.test(title)
      ? title
      : (evidence.description ?? '')
  )
    .replace(/\s+/g, ' ')
    .trim()
  return text
    ? `“${text.length > 90 ? `${text.slice(0, 89)}…` : text}”`
    : 'no text'
}
