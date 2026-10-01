import {
  appealDeadlines,
  appealObligations,
  currentRound,
  isRemoval,
  itemParticipants,
  itemSubmitters,
  requestSides,
  rulingWinner,
  sidePaid,
  type DomainEvent,
  type Side,
} from './events'
import type { IndexedItem, IndexedRequest } from './indexer'
import {
  formatDeadline,
  GENERIC_EVIDENCE_TITLE,
  itemLabel,
  itemNoun,
  itemUrl,
  xdai,
} from './items'
import {
  channelWants,
  type Category,
  type Channel,
  type Urgency,
} from './preferences'
import type { NewNotification, UserRow } from './store'

/** How a recipient relates to the item an event is about. */
export type Role = Side | 'submitter' | 'participant' | 'follower'

export interface Draft {
  kind: string
  urgency: Urgency
  title: string
  body: string
  deadline?: number
  /** Soft categories a user can silence. */
  category?: Category
}

export interface PlanContext {
  siteUrl: string
  now: number
  usersByAddress(addresses: string[]): Promise<Map<string, UserRow[]>>
  followersOf(itemIds: string[]): Promise<Map<string, UserRow[]>>
  /** Channels each user has connected and can receive on. */
  connectedChannels(userIds: number[]): Promise<Map<number, Channel[]>>
  appealFunding(
    registry: string,
    disputeId: string,
    extraData: string,
  ): Promise<Record<'winner' | 'loser' | 'shared', bigint>>
  challengePeriod(registry: string): Promise<number>
  /** Per user, the time up to which they have read an item's evidence. */
  evidenceReadUntil(
    userIds: number[],
    itemId: string,
  ): Promise<Map<number, number>>
  periodDeadline(disputeId: string): Promise<number>
}

const quote = (text: string | null | undefined, max = 160) => {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  return clean
    ? `“${clean.length > max ? `${clean.slice(0, max - 1)}…` : clean}”`
    : ''
}

/** The gist of an evidence: its description when the title is only a label. */
const reasonOf = (
  evidence: { title: string | null; description: string | null } | undefined,
) => {
  const title = (evidence?.title ?? '').trim()
  const description = (evidence?.description ?? '').trim()
  if (!title || GENERIC_EVIDENCE_TITLE.test(title))
    return quote(description || title, 220)
  return description
    ? `${quote(title, 80)}: ${quote(description, 160)}`
    : quote(title, 160)
}

/** A short quote of one piece among several: its title, or its text when the title is a label. */
const gistOf = (evidence: {
  title: string | null
  description: string | null
}) => {
  const title = (evidence.title ?? '').trim()
  return quote(
    !title || GENERIC_EVIDENCE_TITLE.test(title) ? evidence.description : title,
    80,
  )
}

/** Ends a sentence unless the text (maybe inside a closing quote) already does. */
const period = (text: string) => (/[.!?]["”’]?$/.test(text) ? text : `${text}.`)

const sideOfRole = (role: Role, request: IndexedRequest): Side | null => {
  if (role === 'requester' || role === 'challenger') return role
  // Whoever submitted the item wants it kept, like the challenger of its removal.
  if (role === 'submitter' && isRemoval(request)) return 'challenger'
  return null
}

const describePartyOf = (address: string, request: IndexedRequest) => {
  const who = address.toLowerCase()
  if (who === request.requester.toLowerCase())
    return isRemoval(request) ? 'The removal requester' : 'The submitter'
  if (who === request.challenger.toLowerCase()) return 'The challenger'
  return 'Someone'
}

/** What the current ruling means in plain words. */
const rulingMeaning = (winner: Side, request: IndexedRequest) =>
  isRemoval(request)
    ? winner === 'requester'
      ? 'Jurors currently favor removing it'
      : 'Jurors currently favor keeping it'
    : winner === 'requester'
      ? 'Jurors currently favor accepting it'
      : 'Jurors currently favor rejecting it'

const finalOutcome = (request: IndexedRequest) => {
  const winner = rulingWinner(request.disputeOutcome)
  if (!winner)
    return 'Neither side won: the request was reverted and the deposits were split.'
  if (isRemoval(request))
    return winner === 'requester'
      ? 'The entry was removed from the registry.'
      : 'The entry stays in the registry.'
  return winner === 'requester'
    ? 'The entry is now in the registry.'
    : 'The submission was rejected.'
}

const paid = sidePaid
const percent = (part: bigint, whole: bigint) =>
  whole > 0n ? Number((part * 100n) / whole) : 0

interface Audience {
  roles: Map<string, Role>
  followers: boolean
}

/** Addresses to notify for an event, each with its strongest role. */
const audienceFor = (event: DomainEvent): Audience => {
  const roles = new Map<string, Role>()
  const add = (address: string, role: Role) => {
    const current = roles.get(address)
    const rank = (r?: Role) =>
      r === 'requester' || r === 'challenger'
        ? 3
        : r === 'submitter'
          ? 2
          : r
            ? 1
            : 0
    if (rank(role) > rank(current)) roles.set(address, role)
  }
  const sides = requestSides(event.request)
  sides.requester.forEach((a) => add(a, 'requester'))
  sides.challenger.forEach((a) => add(a, 'challenger'))
  if (isRemoval(event.request))
    itemSubmitters(event.item, event.requestIndex).forEach((a) =>
      add(a, 'submitter'),
    )
  if (
    event.kind === 'evidence' ||
    event.kind === 'challenged' ||
    event.kind === 'appealed' ||
    (event.kind === 'resolved' && event.request.disputed)
  ) {
    itemParticipants(event.item).forEach((a) => add(a, 'participant'))
  }
  if (event.kind === 'evidence')
    roles.delete(event.evidence.party.toLowerCase())
  if (event.kind === 'reward') {
    roles.clear()
    roles.set(event.beneficiary, 'participant')
  }
  const personal =
    event.kind === 'reward' ||
    event.kind === 'contribution' ||
    event.kind === 'period'
  const newItem = event.kind === 'submitted' && !isRemoval(event.request)
  return { roles, followers: !personal && !newItem }
}

/** The notification a recipient with `role` gets for `event`, or null. */
export const draftFor = async (
  event: DomainEvent,
  role: Role,
  ctx: PlanContext,
  /** The recipient is the requester or challenger itself, not a crowdfunder. */
  { party = false }: { party?: boolean } = {},
): Promise<Draft | null> => {
  const { item, request } = event
  const label = itemLabel(item)
  const noun = itemNoun(item)
  const removal = isRemoval(request)
  const mySide = sideOfRole(role, request)
  const followerCategory =
    role === 'follower' ? ('follows' as const) : undefined

  switch (event.kind) {
    case 'submitted': {
      const deadline =
        Number(request.submissionTime) +
        (await ctx.challengePeriod(item.registryAddress))
      if (role === 'requester') {
        return removal
          ? {
              kind: 'removal_live',
              urgency: 'soft',
              category: 'receipts',
              title: `Removal requested: ${label}`,
              body: `Your removal request can be challenged until ${formatDeadline(deadline, ctx.now)}. We'll let you know if it is.`,
              deadline,
            }
          : {
              kind: 'submission_live',
              urgency: 'soft',
              category: 'receipts',
              title: `Submitted: ${label}`,
              body: `Your ${noun} can be challenged until ${formatDeadline(deadline, ctx.now)}. We'll tell you right away if someone does.`,
              deadline,
            }
      }
      if (!removal) return null
      const reason = reasonOf(
        request.evidenceGroup?.evidences.find(
          (e) => e.txHash === request.creationTx,
        ),
      )
      if (role === 'submitter') {
        return {
          kind: 'removal_requested',
          urgency: 'urgent',
          title: `Someone wants to remove your ${noun}`,
          body: `A removal request was filed for ${label}.${reason ? ` Reason given: ${period(reason)}` : ''} If the entry still follows the policy, you can challenge the removal until ${formatDeadline(deadline, ctx.now)}.`,
          deadline,
        }
      }
      return {
        kind: 'removal_requested',
        urgency: 'important',
        category: followerCategory,
        title: `Removal requested: ${label}`,
        body: `${reason ? `Reason given: ${period(reason)} ` : ''}It can be challenged until ${formatDeadline(deadline, ctx.now)}.`,
        deadline,
      }
    }

    case 'challenged': {
      const reason = reasonOf(
        request.evidenceGroup?.evidences.find(
          (e) => e.txHash === request.txHashChallenge,
        ),
      )
      const evidenceEnd = await ctx
        .periodDeadline(request.disputeID)
        .catch(() => undefined)
      const until = evidenceEnd
        ? ` The evidence period can end ${formatDeadline(evidenceEnd, ctx.now)}.`
        : ''
      if (role === 'requester') {
        return {
          kind: 'challenged',
          urgency: 'urgent',
          title: removal
            ? `Your removal request was challenged: ${label}`
            : `Your ${noun} was challenged: ${label}`,
          body: `It's now dispute #${request.disputeID} in the Kleros court.${reason ? ` The challenger says: ${period(reason)}` : ''} Add your side's evidence on the item page.${until}`,
          deadline: evidenceEnd,
        }
      }
      if (role === 'challenger') {
        return {
          kind: 'challenge_live',
          urgency: 'soft',
          category: 'receipts',
          title: `Challenge filed: ${label}`,
          body: `Dispute #${request.disputeID} is open. You can add more evidence on the item page.${until}`,
          deadline: evidenceEnd,
        }
      }
      if (role === 'submitter') {
        return {
          kind: 'challenged',
          urgency: 'important',
          title: `The removal of your ${noun} was challenged`,
          body: `Someone challenged the removal request for ${label}, so jurors will decide (dispute #${request.disputeID}).`,
        }
      }
      return {
        kind: 'challenged',
        urgency: 'important',
        category: followerCategory,
        title: `Challenged: ${label}`,
        body: `It's now dispute #${request.disputeID}.${reason ? ` The challenger says: ${period(reason)}` : ''}`,
      }
    }

    case 'evidence': {
      const who = describePartyOf(event.evidence.party, request)
      const pieces = event.pieces
      // What the other side argues is for the parties to answer while the
      // dispute is open; for everyone else it is news.
      const answer = party && request.disputed && !request.resolved
      const reply = answer ? ' You can answer on the item page.' : ''
      if (pieces.length > 1)
        return {
          kind: 'evidence',
          urgency: answer ? 'urgent' : 'important',
          category: followerCategory,
          title: `${pieces.length} new pieces of evidence on ${label}`,
          body: `${who} posted ${pieces.length} pieces of evidence: ${pieces.map(gistOf).join(', ')}.${reply}`,
        }
      const detail = reasonOf(event.evidence)
      return {
        kind: 'evidence',
        urgency: answer ? 'urgent' : 'important',
        category: followerCategory,
        title: `New evidence on ${label}`,
        body: `${who} posted evidence${detail ? `: ${period(detail)}` : '.'}${reply}`,
      }
    }

    case 'appealable': {
      const winner = rulingWinner(event.round.ruling)
      const d = appealDeadlines(event.round)
      const cost = await ctx.appealFunding(
        item.registryAddress,
        request.disputeID,
        request.arbitratorExtraData,
      )
      if (!winner) {
        if (!mySide)
          return {
            kind: 'ruling',
            urgency: 'important',
            category: followerCategory,
            title: `No ruling on ${label}`,
            body: `Jurors refused to rule or tied. Either side can fund an appeal until ${formatDeadline(d.end, ctx.now)}.`,
            deadline: d.end,
          }
        return {
          kind: 'ruling_undecided',
          urgency: 'urgent',
          title: `Jurors couldn't decide on ${label}`,
          body: `They refused to rule or tied. Either side can fund an appeal (${xdai(cost.shared)}) until ${formatDeadline(d.end, ctx.now)}. If only one side is fully funded by then, that side wins; if neither is, the request is reverted and deposits are split.`,
          deadline: d.end,
        }
      }
      if (!mySide) {
        return {
          kind: 'ruling',
          urgency: 'important',
          category: followerCategory,
          title: `Ruling on ${label}`,
          body: `${rulingMeaning(winner, request)}. Appeal funding is open until ${formatDeadline(d.end, ctx.now)}.`,
          deadline: d.end,
        }
      }
      if (mySide === winner) {
        return {
          kind: 'ruling_won',
          urgency: 'important',
          title: `Jurors ruled in your favor on ${label}`,
          body: `${rulingMeaning(winner, request)}. Stay alert: if the other side raises its appeal (${xdai(cost.loser)}) by ${formatDeadline(d.loser, ctx.now)}, you must fund ${xdai(cost.winner)} by ${formatDeadline(d.end, ctx.now)} or you lose despite this ruling. We'll alert you if they do.`,
          deadline: d.loser,
        }
      }
      return {
        kind: 'ruling_lost',
        urgency: 'urgent',
        title: `Jurors ruled against you on ${label}`,
        body: `${rulingMeaning(winner, request)}. To appeal, your side must raise ${xdai(cost.loser)} by ${formatDeadline(d.loser, ctx.now)}. Otherwise the ruling stands.`,
        deadline: d.loser,
      }
    }

    case 'funded': {
      const winner = rulingWinner(event.round.ruling)
      const d = appealDeadlines(event.round)
      const cost = await ctx.appealFunding(
        item.registryAddress,
        request.disputeID,
        request.arbitratorExtraData,
      )
      const fundedSide = event.side
      if (!mySide) {
        return {
          kind: 'side_funded',
          urgency: 'soft',
          category: role === 'follower' ? 'follows' : 'funding',
          title: `Appeal funded on ${label}`,
          body: `The ${fundedSide === 'requester' ? (removal ? 'removal requester' : 'submitter') : 'challenger'} side is fully funded.`,
        }
      }
      if (mySide === fundedSide) {
        const opponentDeadline =
          !winner || fundedSide !== winner ? d.end : d.loser
        return {
          kind: 'side_funded',
          urgency: 'soft',
          category: 'funding',
          title: `Your side's appeal is fully funded: ${label}`,
          body: `The other side has until ${formatDeadline(opponentDeadline, ctx.now)} to fund theirs.${!winner || fundedSide !== winner ? ' If it doesn’t, your side wins the case.' : ''}`,
        }
      }
      if (!winner) {
        return {
          kind: 'opponent_funded',
          urgency: 'urgent',
          title: `The other side funded an appeal on ${label}`,
          body: `If only their side is fully funded when the appeal period ends on ${formatDeadline(d.end, ctx.now)}, they win. Fund ${xdai(cost.shared)} to keep the case going.`,
          deadline: d.end,
        }
      }
      if (fundedSide !== winner) {
        return {
          kind: 'opponent_funded',
          urgency: 'urgent',
          title: `Action needed: the other side appealed ${label}`,
          body: `Jurors ruled for you, but the other side just fully funded its appeal. Fund ${xdai(cost.winner)} by ${formatDeadline(d.end, ctx.now)}, or you lose the case.`,
          deadline: d.end,
        }
      }
      return {
        kind: 'opponent_funded',
        urgency: 'important',
        title: `The other side pre-funded its appeal on ${label}`,
        body: `Jurors ruled for them. To appeal, your side must raise ${xdai(cost.loser)} by ${formatDeadline(d.loser, ctx.now)}.`,
        deadline: d.loser,
      }
    }

    case 'contribution': {
      if (!mySide || mySide === event.side) return null
      const winner = rulingWinner(event.round.ruling)
      const d = appealDeadlines(event.round)
      const cost = await ctx.appealFunding(
        item.registryAddress,
        request.disputeID,
        request.arbitratorExtraData,
      )
      const required = !winner
        ? cost.shared
        : event.side === winner
          ? cost.winner
          : cost.loser
      const theirDeadline = !winner || event.side === winner ? d.end : d.loser
      return {
        kind: 'opponent_contribution',
        urgency: 'soft',
        category: 'funding',
        title: `The other side is funding an appeal on ${label}`,
        body: `They have ${percent(paid(event.round, event.side), required)}% of the ${xdai(required)} they need, with a deadline of ${formatDeadline(theirDeadline, ctx.now)}.`,
        deadline: theirDeadline,
      }
    }

    case 'appealed':
      return {
        kind: 'appealed',
        urgency: 'important',
        category: followerCategory,
        title: `Appealed: ${label}`,
        body: `Both sides funded the appeal of dispute #${request.disputeID}, so a new, larger jury will decide. The evidence period is open again.`,
      }

    case 'resolved': {
      if (request.disputed) {
        const winner = rulingWinner(request.disputeOutcome)
        const outcome = `${finalOutcome(request)} Payouts and appeal rewards are sent automatically.`
        if (!mySide || !winner)
          return {
            kind: 'resolved',
            urgency: 'important',
            category: mySide ? undefined : followerCategory,
            title: `Case closed: ${label}`,
            body: outcome,
          }
        return mySide === winner
          ? {
              kind: 'case_won',
              urgency: 'important',
              title: `You won the case on ${label}`,
              body: outcome,
            }
          : {
              kind: 'case_lost',
              urgency: 'important',
              title: `You lost the case on ${label}`,
              body: outcome,
            }
      }
      if (role === 'requester') {
        return removal
          ? {
              kind: 'removed',
              urgency: 'soft',
              category: 'receipts',
              title: `Removed: ${label}`,
              body: 'Nobody challenged your removal request. The entry is out of the registry and your deposit was returned.',
            }
          : {
              kind: 'accepted',
              urgency: 'soft',
              category: 'receipts',
              title: `Accepted: ${label}`,
              body: `Nobody challenged your ${noun}. It's now in the registry and your deposit was returned.`,
            }
      }
      if (role === 'submitter') {
        return {
          kind: 'removed',
          urgency: 'important',
          title: `Your ${noun} was removed`,
          body: `${label} was removed from the registry after an unchallenged removal request.`,
        }
      }
      return role === 'follower'
        ? {
            kind: 'resolved',
            urgency: 'soft',
            category: 'follows',
            title: `${removal ? 'Removed' : 'Accepted'}: ${label}`,
            body: removal
              ? 'The entry was removed from the registry.'
              : 'The entry is now in the registry.',
          }
        : null
    }

    case 'period': {
      if (!mySide) return null
      const deadline = await ctx
        .periodDeadline(request.disputeID)
        .catch(() => undefined)
      return {
        kind: 'period',
        urgency: 'soft',
        category: 'periods',
        title:
          event.period === 'vote'
            ? `Jurors are voting on ${label}`
            : `Jurors are committing their votes on ${label}`,
        body: `Dispute #${request.disputeID} moved to the ${event.period} period${deadline ? `, which can end ${formatDeadline(deadline, ctx.now)}` : ''}.`,
        deadline,
      }
    }

    case 'reward':
      return {
        kind: 'reward',
        urgency: 'soft',
        category: 'rewards',
        title: `You received ${xdai(event.amount)}`,
        body: `Appeal crowdfunding rewards for ${label} were paid to your wallet.`,
      }
  }
}

/**
 * Appeal deadline reminders for rounds with an open appeal window. Stateless:
 * a reminder fires when its threshold falls inside the processed time window.
 */
export const reminderEvents = async (
  items: IndexedItem[],
  from: number,
  to: number,
  ctx: PlanContext,
): Promise<
  {
    key: string
    item: IndexedItem
    request: IndexedRequest
    side: Side
    draft: Draft
  }[]
> => {
  const reminders: {
    key: string
    item: IndexedItem
    request: IndexedRequest
    side: Side
    draft: Draft
  }[] = []
  for (const item of items) {
    for (const request of item.requests) {
      if (!request.disputed || request.resolved) continue
      const round = currentRound(request)
      if (!round || round.appealPeriodStart === '0' || round.appealed) continue
      if (appealDeadlines(round).end <= ctx.now) continue
      const label = itemLabel(item)
      // Defending a won ruling gets an earlier first reminder.
      const plans = appealObligations(round).map((obligation) => ({
        ...obligation,
        hours: obligation.required === 'winner' ? [12, 3, 1] : [6, 1],
      }))
      for (const plan of plans) {
        if (plan.deadline <= ctx.now) continue
        const hours = plan.hours.find((h) => {
          const at = plan.deadline - h * 3600
          return at > from && at <= to
        })
        if (!hours) continue
        const cost = await ctx.appealFunding(
          item.registryAddress,
          request.disputeID,
          request.arbitratorExtraData,
        )
        const needed = cost[plan.required]
        const raised = percent(paid(round, plan.side), needed)
        const defending = plan.required === 'winner'
        reminders.push({
          key: `reminder:${round.id}:${plan.side}:${hours}h`,
          item,
          request,
          side: plan.side,
          draft: {
            kind: 'appeal_reminder',
            urgency: 'urgent',
            title: defending
              ? `${hours} h left to defend ${label}`
              : `${hours} h left to appeal ${label}`,
            body: defending
              ? `The other side funded its appeal. Fund ${xdai(needed)} (${raised}% raised so far) by ${formatDeadline(plan.deadline, ctx.now)} or you lose despite the ruling.`
              : `Your side needs ${xdai(needed)} (${raised}% raised so far) by ${formatDeadline(plan.deadline, ctx.now)} to appeal. After that, the ruling stands.`,
            deadline: plan.deadline,
          },
        })
      }
    }
  }
  return reminders
}

// Alerts about what someone argued open the item's Evidence tab.
const EVIDENCE_TAB_KINDS = new Set(['evidence', 'challenged'])

/**
 * The newest evidence an alert is about: the burst's last piece, or the
 * challenge (its reason is posted in the same transaction). Reading the
 * item's evidence up to that time reads the alert.
 */
const evidenceAtOf = (event: DomainEvent) =>
  event.kind === 'evidence'
    ? Number(event.evidence.timestamp)
    : event.kind === 'challenged' && event.request.challengeTime
      ? Number(event.request.challengeTime)
      : undefined

/** Turns events and reminders into per-user notifications with delivery channels. */
export const plan = async (
  events: DomainEvent[],
  reminders: Awaited<ReturnType<typeof reminderEvents>>,
  ctx: PlanContext,
): Promise<NewNotification[]> => {
  const audiences = events.map((event) => ({
    event,
    audience: audienceFor(event),
  }))
  const addresses = new Set<string>()
  for (const { audience } of audiences)
    audience.roles.forEach((_, address) => addresses.add(address))
  for (const reminder of reminders)
    requestSides(reminder.request)[reminder.side].forEach((a) =>
      addresses.add(a),
    )
  const [users, followers] = await Promise.all([
    ctx.usersByAddress([...addresses]),
    ctx.followersOf(
      audiences
        .filter(({ audience }) => audience.followers)
        .map(({ event }) => event.item.id),
    ),
  ])

  const pending: {
    user: UserRow
    key: string
    item: IndexedItem
    draft: Draft
    evidenceAt?: number
  }[] = []
  for (const { event, audience } of audiences) {
    const chosen = new Map<
      number,
      { user: UserRow; role: Role; address?: string }
    >()
    audience.roles.forEach((role, address) => {
      for (const user of users.get(address) ?? [])
        if (!chosen.has(user.id)) chosen.set(user.id, { user, role, address })
    })
    if (audience.followers) {
      for (const user of followers.get(event.item.id.toLowerCase()) ?? []) {
        if (!chosen.has(user.id))
          chosen.set(user.id, { user, role: 'follower' })
      }
    }
    // Evidence someone already read (on the item page) needs no alert.
    const read =
      event.kind === 'evidence'
        ? await ctx.evidenceReadUntil([...chosen.keys()], event.item.id)
        : undefined
    for (const { user, role, address } of chosen.values()) {
      if (
        event.kind === 'evidence' &&
        (read?.get(user.id) ?? 0) >= Number(event.evidence.timestamp)
      )
        continue
      const party =
        address === event.request.requester.toLowerCase() ||
        (event.request.disputed &&
          address === event.request.challenger.toLowerCase())
      const draft = await draftFor(event, role, ctx, { party })
      if (draft)
        pending.push({
          user,
          key: event.key,
          item: event.item,
          draft,
          evidenceAt: evidenceAtOf(event),
        })
    }
  }
  for (const reminder of reminders) {
    const seen = new Set<number>()
    requestSides(reminder.request)[reminder.side].forEach((address) => {
      for (const user of users.get(address) ?? []) {
        if (seen.has(user.id)) continue
        seen.add(user.id)
        pending.push({
          user,
          key: reminder.key,
          item: reminder.item,
          draft: reminder.draft,
        })
      }
    })
  }

  const channels = await ctx.connectedChannels([
    ...new Set(pending.map((p) => p.user.id)),
  ])
  return pending
    .filter(
      ({ user, draft }) =>
        !draft.category || user.preferences.categories[draft.category],
    )
    .map(({ user, key, item, draft, evidenceAt }) => ({
      userId: user.id,
      dedupKey: key,
      kind: draft.kind,
      urgency: draft.urgency,
      title: draft.title,
      body: draft.body,
      url: `${itemUrl(ctx.siteUrl, item)}${EVIDENCE_TAB_KINDS.has(draft.kind) ? '?tab=evidence' : ''}`,
      itemId: item.id,
      deadline: draft.deadline ? new Date(draft.deadline * 1000) : undefined,
      evidenceAt: EVIDENCE_TAB_KINDS.has(draft.kind) ? evidenceAt : undefined,
      channels: (channels.get(user.id) ?? []).filter((channel) =>
        channelWants(user.preferences, channel, draft.urgency),
      ),
    }))
}
