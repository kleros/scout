import useHumanizedCountdown, { useChallengeRemainingTime } from 'hooks/countdown'
import { getItemDisplayStatus } from 'utils/items'
import { formatTimestamp } from 'utils/formatTimestamp'

interface EventItem {
  status: string
  disputed: boolean
  requests?: Array<{
    requestType?: string
    submissionTime?: string
    resolutionTime?: string
    resolved?: boolean
  }>
}

/**
 * What the "Next/Last event" of a list row says:
 * - countdown: the challenge period is running ("1d 7h");
 * - over: it ended unchallenged and the request waits to be executed;
 * - date: the item was included, removed or rejected on that day;
 * - dispute: the request was challenged and waits for the ruling;
 * - loading: the registry's challenge period length is still loading.
 */
export interface ItemEvent {
  kind: 'countdown' | 'over' | 'date' | 'dispute' | 'loading' | 'none'
  /** Visible text. */
  text: string
  /** Read before the text by screen readers, e.g. "Challenge period ends in". */
  srPrefix?: string
  /** Unix seconds of the deadline or of the resolution. */
  timestamp?: number
  /** The full date and time, e.g. "Challenge period ends Nov 17, 2026, 06:12 UTC". */
  title?: string
}

export const toIsoString = (unixSeconds: number) => new Date(unixSeconds * 1000).toISOString()

export const useItemEvent = (item: EventItem, challengePeriodDuration: number | null): ItemEvent => {
  const latest = item.requests?.[0]
  const remaining = useChallengeRemainingTime(latest?.submissionTime, item.disputed, challengePeriodDuration)
  const countdown = useHumanizedCountdown(remaining, 2)

  if (item.status === 'Registered') {
    // The successful registration (requests[0] may be a removal request that failed).
    const registration = (item.requests || []).find(
      (req) => req.requestType?.toLowerCase() === 'registrationrequested' && req.resolved,
    )
    const ts = Number(registration?.resolutionTime || 0)
    if (!ts) return { kind: 'none', text: '' }
    return { kind: 'date', text: formatTimestamp(ts, false), srPrefix: 'Included on', timestamp: ts, title: `Included on ${formatTimestamp(ts, true)}` }
  }

  if (item.status === 'Absent') {
    const ts = Number(latest?.resolutionTime || 0)
    if (!ts) return { kind: 'none', text: '' }
    const verb = getItemDisplayStatus(item) === 'Rejected' ? 'Rejected' : 'Removed'
    return { kind: 'date', text: formatTimestamp(ts, false), srPrefix: `${verb} on`, timestamp: ts, title: `${verb} on ${formatTimestamp(ts, true)}` }
  }

  if (item.disputed) return { kind: 'dispute', text: 'In dispute' }

  if (challengePeriodDuration === null) return { kind: 'loading', text: '' }

  const submissionTime = Number(latest?.submissionTime || 0)
  if (!submissionTime) return { kind: 'none', text: '' }
  const deadline = submissionTime + challengePeriodDuration
  if (deadline * 1000 <= Date.now()) {
    return { kind: 'over', text: 'Challenge period over', timestamp: deadline, title: `Challenge period ended ${formatTimestamp(deadline, true)}` }
  }
  return {
    kind: 'countdown',
    // Empty for the first frame, until the countdown has started.
    text: countdown && countdown !== 'Ended' ? countdown : '',
    srPrefix: 'Challenge period ends in',
    timestamp: deadline,
    title: `Challenge period ends ${formatTimestamp(deadline, true)}`,
  }
}
