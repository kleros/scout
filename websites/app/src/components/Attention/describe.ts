import type { Attention, AttentionWithEvidence } from 'utils/cases/attention'
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
  appeal: 'The ruling is in; the appeal period is about to start.',
  execution: 'The ruling is being enforced.',
}

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
            body: `If only one side is fully funded when the appeal period ends, that side wins.${need}`,
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
    case 'ruling-final':
      return {
        title: 'The ruling is final',
        body: 'The appeal period is over; the ruling will be enforced shortly.',
      }
    case 'challenged':
      return {
        title: `Your ${removal ? 'removal request' : noun} was challenged`,
        body: `It is ${dispute} in the Kleros court. Add your side's evidence on the item page before voting starts.`,
      }
    case 'dispute':
      return {
        title: `${dispute[0].toUpperCase()}${dispute.slice(1)} is in progress`,
        body: period
          ? (PERIOD_TEXT[period] ?? '')
          : 'Jurors will rule after the evidence period.',
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
