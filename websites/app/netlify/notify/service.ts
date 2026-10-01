import { createChain, KLEROS_LIQUID, type Chain } from './chain'
import { sendEmail } from './channels/email'
import { sendPush } from './channels/push'
import { sendTelegram } from './channels/telegram'
import type { Db } from './db'
import type { NotifyEnv } from './env'
import { detectItemEvents, periodEvents, rewardEvents } from './events'
import { createIndexer, REGISTRY_ADDRESSES, type Indexer } from './indexer'
import { renderEmail, renderPush, renderTelegram } from './messages'
import { ensureSchema } from './migrations'
import { plan, reminderEvents, type PlanContext } from './plan'
import type { Channel } from './preferences'
import {
  claimDueDeliveries,
  evidenceReadSince,
  finishDelivery,
  evidenceReadUntil,
  followersOf,
  getEmail,
  getTelegram,
  getUser,
  getWatcherState,
  insertNotifications,
  listPushSubscriptions,
  pruneOldNotifications,
  removePushSubscription,
  setWatcherState,
  unlinkTelegram,
  usersByAddress,
  type DueDelivery,
} from './store'
import { signToken } from './tokens'

export interface Service {
  env: NotifyEnv
  db: Db
  indexer: Indexer
  chain: Chain
}

export const createService = (
  env: NotifyEnv,
  db: Db,
  overrides: Partial<Pick<Service, 'indexer' | 'chain'>> = {},
): Service => ({
  env,
  db,
  indexer: overrides.indexer ?? createIndexer(env.indexerUrl),
  chain: overrides.chain ?? createChain(env.gnosisRpcUrls),
})

/** Channels a user can receive on right now (configured here and connected by them). */
export const connectedChannels = async (
  service: Service,
  userIds: number[],
): Promise<Map<number, Channel[]>> => {
  const result = new Map<number, Channel[]>()
  if (userIds.length === 0) return result
  const rows = await service.db.query<{
    id: string
    email: boolean
    telegram: boolean
    push: boolean
  }>(
    `select u.id,
            exists (select 1 from emails e where e.user_id = u.id and e.verified_at is not null and e.unsubscribed_at is null) as email,
            exists (select 1 from telegram_links t where t.user_id = u.id and t.chat_id is not null) as telegram,
            exists (select 1 from push_subscriptions p where p.user_id = u.id) as push
       from users u where u.id = any($1::bigint[])`,
    [userIds],
  )
  for (const row of rows) {
    const channels: Channel[] = []
    if (row.email && service.env.email) channels.push('email')
    if (row.telegram && service.env.telegram) channels.push('telegram')
    if (row.push && service.env.push) channels.push('push')
    result.set(Number(row.id), channels)
  }
  return result
}

export const planContext = (service: Service, now: number): PlanContext => ({
  siteUrl: service.env.siteUrl,
  now,
  usersByAddress: (addresses) => usersByAddress(service.db, addresses),
  followersOf: (itemIds) => followersOf(service.db, itemIds),
  connectedChannels: (userIds) => connectedChannels(service, userIds),
  appealFunding: (registry, disputeId, extraData) =>
    service.chain.appealFunding(registry, disputeId, extraData),
  challengePeriod: (registry) => service.chain.challengePeriod(registry),
  periodDeadline: async (disputeId) =>
    (await service.chain.disputePeriod(disputeId)).deadline,
  evidenceReadUntil: (userIds, itemId) =>
    evidenceReadUntil(service.db, userIds, itemId),
})

/** Blocks processed per tick at most (~1 hour of Gnosis), so catch-up fits the 30 s limit. */
const MAX_BLOCKS_PER_TICK = 720

/**
 * One watcher pass: processes everything between the stored cursor and the
 * latest block that is both finalized and indexed, then advances the cursor.
 * Notifications are keyed, so a crash before the cursor moves only causes a
 * harmless replay.
 */
export const runWatcherTick = async (
  service: Service,
  now = Math.floor(Date.now() / 1000),
) => {
  const { db, chain, indexer } = service
  await ensureSchema(db)
  const [finalized, indexedBlock] = await Promise.all([
    chain.finalizedBlock(),
    indexer.headBlock(),
  ])
  const headNumber = Math.min(finalized.number, indexedBlock)
  const head =
    headNumber === finalized.number
      ? finalized
      : await chain.blockAt(headNumber)

  const state = await getWatcherState(db)
  if (!state) {
    // First run: start from now instead of replaying history.
    await setWatcherState(db, {
      cursorTs: head.timestamp,
      cursorBlock: head.number,
    })
    return { initialized: true, block: head.number }
  }
  if (head.number <= state.cursorBlock)
    return { idle: true, block: state.cursorBlock }

  let toNumber = Math.min(head.number, state.cursorBlock + MAX_BLOCKS_PER_TICK)
  for (;;) {
    const to = toNumber === head.number ? head : await chain.blockAt(toNumber)
    const changes = await indexer.changesBetween(state.cursorTs, to.timestamp)
    if (changes.truncated && toNumber - state.cursorBlock > 10) {
      toNumber =
        state.cursorBlock + Math.ceil((toNumber - state.cursorBlock) / 2)
      continue
    }
    const [periodChanges, rewards, openAppeals] = await Promise.all([
      chain.periodChanges(state.cursorBlock + 1, to.number),
      chain.rewardsPaid(REGISTRY_ADDRESSES, state.cursorBlock + 1, to.number),
      indexer.openAppealItemIds(now),
    ])
    const disputeItems = await indexer.itemIdsForDisputes(
      KLEROS_LIQUID,
      periodChanges.map((change) => change.disputeId),
    )
    const ids = new Set([
      ...changes.itemIds,
      ...disputeItems,
      ...openAppeals,
      ...rewards.map((reward) => `${reward.itemID}@${reward.registry}`),
    ])
    const items = await indexer.items([...ids])
    const events = [
      ...items.flatMap((item) =>
        detectItemEvents(item, state.cursorTs, to.timestamp),
      ),
      ...periodEvents(items, periodChanges),
      ...rewardEvents(items, rewards),
    ]
    const ctx = planContext(service, now)
    const reminders = await reminderEvents(
      items.filter((item) => openAppeals.includes(item.id)),
      state.cursorTs,
      to.timestamp,
      ctx,
    )
    const notifications = await plan(events, reminders, ctx)
    const created = await insertNotifications(db, notifications)
    await setWatcherState(db, {
      cursorTs: to.timestamp,
      cursorBlock: to.number,
    })
    if (new Date(now * 1000).getUTCMinutes() === 0)
      await pruneOldNotifications(db)
    return {
      fromBlock: state.cursorBlock + 1,
      toBlock: to.number,
      events: events.length,
      reminders: reminders.length,
      created,
    }
  }
}

const UNSUBSCRIBE_TTL = 365 * 24 * 3600

export const unsubscribeUrl = (env: NotifyEnv, userId: number) =>
  `${env.siteUrl}/api/notify/email/unsubscribe?token=${encodeURIComponent(
    signToken({ userId }, env.sessionSecret, 'unsubscribe', UNSUBSCRIBE_TTL),
  )}`

type DeliveryOutcome =
  | { status: 'sent' }
  | { status: 'skipped'; reason?: string }
  | { status: 'retry'; error: string }

const deliverOne = async (
  service: Service,
  delivery: DueDelivery,
): Promise<DeliveryOutcome> => {
  const { env, db } = service
  // Still queued (or waiting to retry) when its evidence was read in the app.
  // A message already handed to a provider can't be recalled.
  if (await evidenceReadSince(db, delivery.notificationId))
    return { status: 'skipped', reason: 'Read in the app before delivery.' }
  const message = { ...delivery, id: delivery.notificationId }
  if (delivery.channel === 'email') {
    const [user, email] = await Promise.all([
      getUser(db, delivery.userId),
      getEmail(db, delivery.userId),
    ])
    if (!env.email || !user || !email?.verified || email.unsubscribed)
      return { status: 'skipped' }
    const unsubscribe = unsubscribeUrl(env, delivery.userId)
    const rendered = renderEmail(message, {
      siteUrl: env.siteUrl,
      unsubscribeUrl: unsubscribe,
      address: user.address,
    })
    const result = await sendEmail(env.email, {
      to: email.email,
      ...rendered,
      unsubscribeUrl: unsubscribe,
    })
    if (result.ok) return { status: 'sent' }
    return result.retryable
      ? { status: 'retry', error: result.error ?? 'email failed' }
      : { status: 'skipped' }
  }
  if (delivery.channel === 'telegram') {
    const link = await getTelegram(db, delivery.userId)
    if (!env.telegram || !link?.chatId) return { status: 'skipped' }
    const result = await sendTelegram(
      env.telegram.botToken,
      link.chatId,
      renderTelegram(message),
      message.url ? { text: 'Open in Scout', url: message.url } : undefined,
    )
    if (result.ok) return { status: 'sent' }
    if (result.gone) {
      await unlinkTelegram(db, { chatId: link.chatId })
      return { status: 'skipped' }
    }
    return result.retryable
      ? { status: 'retry', error: result.error ?? 'telegram failed' }
      : { status: 'skipped' }
  }
  const subscriptions = await listPushSubscriptions(db, delivery.userId)
  if (!env.push || subscriptions.length === 0) return { status: 'skipped' }
  const payload = renderPush(message)
  const results = await Promise.all(
    subscriptions.map(async (subscription) => {
      const result = await sendPush(
        env.push!,
        subscription,
        payload,
        delivery.urgency,
      )
      if (result.gone) await removePushSubscription(db, subscription.endpoint)
      return result
    }),
  )
  if (results.some((r) => r.ok)) return { status: 'sent' }
  const retryable = results.find((r) => r.retryable)
  return retryable
    ? { status: 'retry', error: retryable.error ?? 'push failed' }
    : { status: 'skipped' }
}

/** Sends due deliveries until the time budget runs out. */
export const deliverDue = async (service: Service, budgetMs = 22_000) => {
  await ensureSchema(service.db)
  const started = Date.now()
  const totals = { sent: 0, skipped: 0, retried: 0 }
  while (Date.now() - started < budgetMs) {
    const due = await claimDueDeliveries(service.db, 20)
    if (due.length === 0) break
    for (const delivery of due) {
      // Unprocessed claims are retried once their lease expires.
      if (Date.now() - started >= budgetMs) break
      const outcome = await deliverOne(service, delivery).catch(
        (error): DeliveryOutcome => ({
          status: 'retry',
          error: error instanceof Error ? error.message : String(error),
        }),
      )
      if (outcome.status === 'retry') {
        await finishDelivery(service.db, delivery.id, {
          status: 'retry',
          error: outcome.error,
          attempts: delivery.attempts,
        })
        totals.retried += 1
      } else {
        await finishDelivery(service.db, delivery.id, outcome)
        totals[outcome.status] += 1
      }
    }
  }
  return totals
}
