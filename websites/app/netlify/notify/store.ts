import type { Db } from './db'
import { sha256Hex } from './tokens'
import {
  normalizePreferences,
  type Channel,
  type Preferences,
  type Urgency,
} from './preferences'

export interface UserRow {
  id: number
  address: string
  preferences: Preferences
}

const toUser = (row: {
  id: string | number
  address: string
  preferences: unknown
}): UserRow => ({
  id: Number(row.id),
  address: row.address,
  preferences: normalizePreferences(
    typeof row.preferences === 'string'
      ? JSON.parse(row.preferences)
      : row.preferences,
  ),
})

export const MAX_WATCHED_ADDRESSES = 10
export const MAX_FOLLOWS = 200

// ---------------------------------------------------------------------------
// Users, watched addresses and follows
// ---------------------------------------------------------------------------

export const upsertUser = async (db: Db, address: string): Promise<UserRow> => {
  const [row] = await db.query<{
    id: string
    address: string
    preferences: unknown
  }>(
    `insert into users (address) values ($1)
     on conflict (address) do update set last_seen_at = now()
     returning id, address, preferences`,
    [address.toLowerCase()],
  )
  return toUser(row)
}

export const getUser = async (db: Db, id: number): Promise<UserRow | null> => {
  const [row] = await db.query<{
    id: string
    address: string
    preferences: unknown
  }>(`select id, address, preferences from users where id = $1`, [id])
  return row ? toUser(row) : null
}

export const setPreferences = async (
  db: Db,
  userId: number,
  preferences: Preferences,
) => {
  await db.query(`update users set preferences = $2::jsonb where id = $1`, [
    userId,
    JSON.stringify(preferences),
  ])
}

export const deleteUser = async (db: Db, userId: number) => {
  await db.query(`delete from users where id = $1`, [userId])
}

export const listWatchedAddresses = async (db: Db, userId: number) =>
  (
    await db.query<{ address: string }>(
      `select address from watched_addresses where user_id = $1 order by created_at`,
      [userId],
    )
  ).map((row) => row.address)

export const addWatchedAddress = async (
  db: Db,
  userId: number,
  address: string,
) => {
  const [{ count }] = await db.query<{ count: string }>(
    `select count(*) from watched_addresses where user_id = $1`,
    [userId],
  )
  if (Number(count) >= MAX_WATCHED_ADDRESSES) return false
  await db.query(
    `insert into watched_addresses (user_id, address) values ($1, $2) on conflict do nothing`,
    [userId, address.toLowerCase()],
  )
  return true
}

export const removeWatchedAddress = async (
  db: Db,
  userId: number,
  address: string,
) => {
  await db.query(
    `delete from watched_addresses where user_id = $1 and address = $2`,
    [userId, address.toLowerCase()],
  )
}

export const listFollows = async (db: Db, userId: number) =>
  (
    await db.query<{ item_id: string }>(
      `select item_id from follows where user_id = $1 order by created_at desc`,
      [userId],
    )
  ).map((row) => row.item_id)

export const follow = async (db: Db, userId: number, itemId: string) => {
  const [{ count }] = await db.query<{ count: string }>(
    `select count(*) from follows where user_id = $1`,
    [userId],
  )
  if (Number(count) >= MAX_FOLLOWS) return false
  await db.query(
    `insert into follows (user_id, item_id) values ($1, $2) on conflict do nothing`,
    [userId, itemId.toLowerCase()],
  )
  return true
}

export const unfollow = async (db: Db, userId: number, itemId: string) => {
  await db.query(`delete from follows where user_id = $1 and item_id = $2`, [
    userId,
    itemId.toLowerCase(),
  ])
}

/** Users whose own or watched address is in `addresses`, keyed by address. */
export const usersByAddress = async (
  db: Db,
  addresses: string[],
): Promise<Map<string, UserRow[]>> => {
  const result = new Map<string, UserRow[]>()
  const lower = [...new Set(addresses.map((a) => a.toLowerCase()))]
  if (lower.length === 0) return result
  const rows = await db.query<{
    matched: string
    id: string
    address: string
    preferences: unknown
  }>(
    `select u.address as matched, u.id, u.address, u.preferences
       from users u where u.address = any($1::text[])
     union all
     select w.address as matched, u.id, u.address, u.preferences
       from watched_addresses w join users u on u.id = w.user_id
      where w.address = any($1::text[])`,
    [lower],
  )
  for (const row of rows) {
    const list = result.get(row.matched) ?? []
    if (!list.some((user) => user.id === Number(row.id))) list.push(toUser(row))
    result.set(row.matched, list)
  }
  return result
}

/** Followers of the given items, keyed by item id. */
export const followersOf = async (
  db: Db,
  itemIds: string[],
): Promise<Map<string, UserRow[]>> => {
  const result = new Map<string, UserRow[]>()
  if (itemIds.length === 0) return result
  const rows = await db.query<{
    item_id: string
    id: string
    address: string
    preferences: unknown
  }>(
    `select f.item_id, u.id, u.address, u.preferences
       from follows f join users u on u.id = f.user_id
      where f.item_id = any($1::text[])`,
    [[...new Set(itemIds.map((id) => id.toLowerCase()))]],
  )
  for (const row of rows) {
    const list = result.get(row.item_id) ?? []
    list.push(toUser(row))
    result.set(row.item_id, list)
  }
  return result
}

// ---------------------------------------------------------------------------
// Channels
// ---------------------------------------------------------------------------

export interface EmailRow {
  email: string
  verified: boolean
  unsubscribed: boolean
}

export const getEmail = async (
  db: Db,
  userId: number,
): Promise<EmailRow | null> => {
  const [row] = await db.query<{
    email: string
    verified_at: Date | null
    unsubscribed_at: Date | null
  }>(
    `select email, verified_at, unsubscribed_at from emails where user_id = $1`,
    [userId],
  )
  return row
    ? {
        email: row.email,
        verified: Boolean(row.verified_at),
        unsubscribed: Boolean(row.unsubscribed_at),
      }
    : null
}

const EMAIL_SENDS_PER_DAY = 5
const EMAIL_RESEND_SECONDS = 60

/**
 * Verification email limits that hold however many wallets ask (anyone can
 * create wallets): per recipient, and for the whole service.
 */
export const EMAIL_SEND_LIMITS = { perRecipientPerDay: 3, perHour: 200 }

/**
 * Stores an unverified address with a hashed verification token. Returns
 * 'rate-limited' when the user's, the recipient's or the service's
 * verification email limit would be exceeded.
 */
export const setPendingEmail = async (
  db: Db,
  userId: number,
  email: string,
  tokenHash: string,
  expiresAt: Date,
  limits = EMAIL_SEND_LIMITS,
): Promise<'ok' | 'rate-limited'> =>
  db.transaction(async (tx) => {
    const [current] = await tx.query<{
      sent_at: Date | null
      sends_in_window: number
      window_started_at: Date | null
    }>(
      `select sent_at, sends_in_window, window_started_at from emails where user_id = $1 for update`,
      [userId],
    )
    const now = Date.now()
    const windowFresh =
      current?.window_started_at &&
      now - new Date(current.window_started_at).getTime() < 86_400_000
    const sends = windowFresh ? current.sends_in_window : 0
    if (
      current?.sent_at &&
      now - new Date(current.sent_at).getTime() < EMAIL_RESEND_SECONDS * 1000
    )
      return 'rate-limited'
    if (sends >= EMAIL_SENDS_PER_DAY) return 'rate-limited'
    // Serializes sends so concurrent requests cannot overshoot the shared limits.
    await tx.query(`select pg_advisory_xact_lock(7426160)`)
    const recipient = sha256Hex(email.toLowerCase())
    const [counts] = await tx.query<{ recipient: string; recent: string }>(
      `select count(*) filter (where email_hash = $1) as recipient,
              count(*) filter (where sent_at > now() - interval '1 hour') as recent
         from email_sends where sent_at > now() - interval '1 day'`,
      [recipient],
    )
    if (
      Number(counts.recipient) >= limits.perRecipientPerDay ||
      Number(counts.recent) >= limits.perHour
    )
      return 'rate-limited'
    await tx.query(`insert into email_sends (email_hash) values ($1)`, [
      recipient,
    ])
    await tx.query(
      `insert into emails (user_id, email, token_hash, token_expires_at, sent_at, sends_in_window, window_started_at)
       values ($1, $2, $3, $4, now(), $5, $6)
       on conflict (user_id) do update set
         email = excluded.email, verified_at = null, unsubscribed_at = null,
         token_hash = excluded.token_hash, token_expires_at = excluded.token_expires_at,
         sent_at = now(), sends_in_window = excluded.sends_in_window, window_started_at = excluded.window_started_at`,
      [
        userId,
        email,
        tokenHash,
        expiresAt,
        sends + 1,
        windowFresh ? current.window_started_at : new Date(now),
      ],
    )
    return 'ok'
  })

export const verifyEmailToken = async (
  db: Db,
  tokenHash: string,
): Promise<number | null> => {
  const [row] = await db.query<{ user_id: string }>(
    `update emails set verified_at = now(), token_hash = null, token_expires_at = null
      where token_hash = $1 and token_expires_at > now()
      returning user_id`,
    [tokenHash],
  )
  return row ? Number(row.user_id) : null
}

export const removeEmail = async (db: Db, userId: number) => {
  await db.query(`delete from emails where user_id = $1`, [userId])
}

export const unsubscribeEmail = async (db: Db, userId: number) => {
  await db.query(
    `update emails set unsubscribed_at = now() where user_id = $1`,
    [userId],
  )
}

export interface TelegramRow {
  chatId: string | null
  username: string | null
}

export const getTelegram = async (
  db: Db,
  userId: number,
): Promise<TelegramRow | null> => {
  const [row] = await db.query<{
    chat_id: string | null
    username: string | null
  }>(`select chat_id, username from telegram_links where user_id = $1`, [
    userId,
  ])
  return row ? { chatId: row.chat_id, username: row.username } : null
}

export const createTelegramLinkToken = async (
  db: Db,
  userId: number,
  tokenHash: string,
  expiresAt: Date,
) => {
  await db.query(
    `insert into telegram_links (user_id, token_hash, token_expires_at) values ($1, $2, $3)
     on conflict (user_id) do update set token_hash = excluded.token_hash, token_expires_at = excluded.token_expires_at`,
    [userId, tokenHash, expiresAt],
  )
}

/** Binds a chat to the user who created the link token. One chat, one user. */
export const completeTelegramLink = async (
  db: Db,
  tokenHash: string,
  chatId: string,
  username: string | null,
): Promise<number | null> =>
  db.transaction(async (tx) => {
    const [row] = await tx.query<{ user_id: string }>(
      `select user_id from telegram_links where token_hash = $1 and token_expires_at > now() for update`,
      [tokenHash],
    )
    if (!row) return null
    await tx.query(
      `update telegram_links set chat_id = null, linked_at = null where chat_id = $1`,
      [chatId],
    )
    await tx.query(
      `update telegram_links set chat_id = $2, username = $3, linked_at = now(), token_hash = null, token_expires_at = null
        where user_id = $1`,
      [row.user_id, chatId, username],
    )
    return Number(row.user_id)
  })

export const unlinkTelegram = async (
  db: Db,
  where: { userId: number } | { chatId: string },
) => {
  if ('userId' in where)
    await db.query(`delete from telegram_links where user_id = $1`, [
      where.userId,
    ])
  else
    await db.query(`delete from telegram_links where chat_id = $1`, [
      where.chatId,
    ])
}

export interface PushSubscriptionRow {
  id: number
  endpoint: string
  p256dh: string
  auth: string
}

export const MAX_PUSH_DEVICES = 10

/** Saves a browser subscription. Users keep their most recently registered browsers. */
export const addPushSubscription = async (
  db: Db,
  userId: number,
  subscription: { endpoint: string; p256dh: string; auth: string },
) =>
  db.transaction(async (tx) => {
    // Serializes a user's registrations so the cap holds under concurrency.
    await tx.query(`select 1 from users where id = $1 for update`, [userId])
    // A fresh row on every registration, so ids give the registration order.
    await tx.query(`delete from push_subscriptions where endpoint = $1`, [
      subscription.endpoint,
    ])
    await tx.query(
      `insert into push_subscriptions (user_id, endpoint, p256dh, auth) values ($1, $2, $3, $4)
       on conflict (endpoint) do nothing`,
      [userId, subscription.endpoint, subscription.p256dh, subscription.auth],
    )
    await tx.query(
      `delete from push_subscriptions where user_id = $1 and id not in (
         select id from push_subscriptions where user_id = $1 order by id desc limit $2)`,
      [userId, MAX_PUSH_DEVICES],
    )
  })

export const removePushSubscription = async (
  db: Db,
  endpoint: string,
  userId?: number,
) => {
  if (userId === undefined)
    await db.query(`delete from push_subscriptions where endpoint = $1`, [
      endpoint,
    ])
  else
    await db.query(
      `delete from push_subscriptions where endpoint = $1 and user_id = $2`,
      [endpoint, userId],
    )
}

export const listPushSubscriptions = async (
  db: Db,
  userId: number,
): Promise<PushSubscriptionRow[]> =>
  (
    await db.query<{
      id: string
      endpoint: string
      p256dh: string
      auth: string
    }>(
      `select id, endpoint, p256dh, auth from push_subscriptions where user_id = $1
        order by id desc limit $2`,
      [userId, MAX_PUSH_DEVICES],
    )
  ).map((row) => ({ ...row, id: Number(row.id) }))

// ---------------------------------------------------------------------------
// Notifications and deliveries
// ---------------------------------------------------------------------------

export interface NewNotification {
  userId: number
  dedupKey: string
  kind: string
  urgency: Urgency
  title: string
  body: string
  url?: string
  itemId?: string
  deadline?: Date
  /** For alerts about an item's evidence: the newest piece's time, which reading the evidence up to clears. */
  evidenceAt?: number
  channels: Channel[]
}

export interface NotificationRow {
  id: number
  kind: string
  urgency: Urgency
  title: string
  body: string
  url: string | null
  itemId: string | null
  deadline: string | null
  createdAt: string
  read: boolean
}

/**
 * Inserts notifications (skipping ones already recorded for the same user
 * and key) and queues a delivery per requested channel. One transaction: an
 * interrupted run leaves no notification without its deliveries, so the
 * replay queues everything. Returns how many notifications were new.
 */
export const insertNotifications = async (
  db: Db,
  notifications: NewNotification[],
): Promise<number> =>
  db.transaction(async (tx) => {
    let created = 0
    for (const n of notifications) {
      const [row] = await tx.query<{ id: string }>(
        `insert into notifications (user_id, dedup_key, kind, urgency, title, body, url, item_id, deadline, evidence_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         on conflict (user_id, dedup_key) do nothing
         returning id`,
        [
          n.userId,
          n.dedupKey,
          n.kind,
          n.urgency,
          n.title,
          n.body,
          n.url ?? null,
          n.itemId ?? null,
          n.deadline ?? null,
          n.evidenceAt ?? null,
        ],
      )
      if (!row) continue
      created += 1
      if (n.channels.length > 0)
        await tx.query(
          `insert into deliveries (notification_id, channel)
           select $1, channel from unnest($2::text[]) as channel
           on conflict do nothing`,
          [row.id, n.channels],
        )
    }
    return created
  })

export const listNotifications = async (
  db: Db,
  userId: number,
  { before, limit }: { before?: number; limit: number },
): Promise<NotificationRow[]> => {
  const rows = await db.query<{
    id: string
    kind: string
    urgency: Urgency
    title: string
    body: string
    url: string | null
    item_id: string | null
    deadline: Date | null
    created_at: Date
    read_at: Date | null
  }>(
    `select id, kind, urgency, title, body, url, item_id, deadline, created_at, read_at
       from notifications
      where user_id = $1 and ($2::bigint is null or id < $2)
      order by id desc
      limit $3`,
    [userId, before ?? null, limit],
  )
  return rows.map((row) => ({
    id: Number(row.id),
    kind: row.kind,
    urgency: row.urgency,
    title: row.title,
    body: row.body,
    url: row.url,
    itemId: row.item_id,
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    read: Boolean(row.read_at),
  }))
}

export const unreadCount = async (db: Db, userId: number) => {
  const [{ count }] = await db.query<{ count: string }>(
    `select count(*) from notifications where user_id = $1 and read_at is null`,
    [userId],
  )
  return Number(count)
}

export const markRead = async (db: Db, userId: number, ids?: number[]) => {
  if (ids) {
    await db.query(
      `update notifications set read_at = now() where user_id = $1 and id = any($2::bigint[]) and read_at is null`,
      [userId, ids],
    )
  } else {
    await db.query(
      `update notifications set read_at = now() where user_id = $1 and read_at is null`,
      [userId],
    )
  }
}

export interface DueDelivery {
  id: number
  channel: Channel
  attempts: number
  notificationId: number
  userId: number
  kind: string
  urgency: Urgency
  title: string
  body: string
  url: string | null
  deadline: string | null
}

const LEASE_SECONDS = 120

/**
 * Claims up to `limit` due deliveries, most urgent first. Claimed rows are
 * leased (their next attempt moves forward) so an overlapping run skips them.
 */
export const claimDueDeliveries = async (
  db: Db,
  limit: number,
): Promise<DueDelivery[]> => {
  const rows = await db.query<{
    id: string
    channel: Channel
    attempts: number
    notification_id: string
    user_id: string
    kind: string
    urgency: Urgency
    title: string
    body: string
    url: string | null
    deadline: Date | null
  }>(
    `with due as (
       select d.id from deliveries d join notifications n on n.id = d.notification_id
        where d.status = 'pending' and d.next_attempt_at <= now()
        order by case n.urgency when 'urgent' then 0 when 'important' then 1 else 2 end, d.id
        limit $1
        for update of d skip locked
     )
     update deliveries d set attempts = d.attempts + 1, next_attempt_at = now() + make_interval(secs => $2)
       from due, notifications n
      where d.id = due.id and n.id = d.notification_id
     returning d.id, d.channel, d.attempts, d.notification_id, n.user_id, n.kind, n.urgency, n.title, n.body, n.url, n.deadline`,
    [limit, LEASE_SECONDS],
  )
  return rows.map((row) => ({
    id: Number(row.id),
    channel: row.channel,
    attempts: row.attempts,
    notificationId: Number(row.notification_id),
    userId: Number(row.user_id),
    kind: row.kind,
    urgency: row.urgency,
    title: row.title,
    body: row.body,
    url: row.url,
    deadline: row.deadline ? new Date(row.deadline).toISOString() : null,
  }))
}

export const MAX_DELIVERY_ATTEMPTS = 6

export const finishDelivery = async (
  db: Db,
  id: number,
  outcome:
    | { status: 'sent' }
    | { status: 'skipped'; reason?: string }
    | { status: 'retry'; error: string; attempts: number },
) => {
  if (outcome.status === 'retry') {
    const give = outcome.attempts >= MAX_DELIVERY_ATTEMPTS
    // 1, 4, 16, 64, 256 minutes.
    const delay = 60 * 4 ** Math.min(outcome.attempts - 1, 4)
    await db.query(
      `update deliveries set status = $2, last_error = $3, next_attempt_at = now() + make_interval(secs => $4)
        where id = $1`,
      [id, give ? 'failed' : 'pending', outcome.error.slice(0, 500), delay],
    )
  } else {
    // A skipped delivery keeps why it wasn't sent.
    await db.query(
      `update deliveries set status = $2, sent_at = now(), last_error = $3 where id = $1`,
      [
        id,
        outcome.status,
        outcome.status === 'skipped' ? (outcome.reason ?? null) : null,
      ],
    )
  }
}

export const pruneOldNotifications = async (db: Db, days = 90) => {
  await db.query(
    `delete from notifications where created_at < now() - make_interval(days => $1)`,
    [days],
  )
  await db.query(
    `delete from email_sends where sent_at < now() - interval '2 days'`,
  )
  await db.query(`delete from used_nonces where expires_at < now()`)
}

// ---------------------------------------------------------------------------
// Evidence reads
// ---------------------------------------------------------------------------

/** Alerts about what someone argued, which reading the item's evidence reads. */
const EVIDENCE_ALERT_KINDS = ['evidence', 'challenged']

/** Items whose reads a user keeps; older ones are dropped. */
export const MAX_EVIDENCE_READS = 2000

/**
 * Records how far a user has read items' evidence (never moving back), and
 * marks the alerts about evidence up to there as read. Alerts about newer
 * evidence, or with no evidence time, stay unread. Returns how many alerts
 * it read.
 */
export const setEvidenceReads = async (
  db: Db,
  userId: number,
  reads: Record<string, number>,
): Promise<number> =>
  db.transaction(async (tx) => {
    let alerts = 0
    for (const [itemId, until] of Object.entries(reads)) {
      await tx.query(
        `insert into evidence_reads (user_id, item_id, seen_until) values ($1, $2, $3)
         on conflict (user_id, item_id) do update set
           seen_until = greatest(evidence_reads.seen_until, excluded.seen_until), updated_at = now()`,
        [userId, itemId, until],
      )
      alerts += (
        await tx.query(
          `update notifications set read_at = now()
            where user_id = $1 and item_id = $2 and read_at is null
              and kind = any($4::text[]) and evidence_at <= $3
            returning id`,
          [userId, itemId, until, EVIDENCE_ALERT_KINDS],
        )
      ).length
    }
    await tx.query(
      `delete from evidence_reads where user_id = $1 and item_id not in (
         select item_id from evidence_reads where user_id = $1
          order by updated_at desc, item_id limit $2)`,
      [userId, MAX_EVIDENCE_READS],
    )
    return alerts
  })

/** Per item id, the time up to which the user has read its evidence (most recent first). */
export const listEvidenceReads = async (
  db: Db,
  userId: number,
): Promise<Record<string, number>> =>
  Object.fromEntries(
    (
      await db.query<{ item_id: string; seen_until: string }>(
        `select item_id, seen_until from evidence_reads where user_id = $1
          order by updated_at desc, item_id limit $2`,
        [userId, MAX_EVIDENCE_READS],
      )
    ).map((row) => [row.item_id, Number(row.seen_until)]),
  )

/**
 * Whether the user has since read, in the app, the evidence a notification
 * is about. Its email, Telegram and push deliveries are then not sent.
 */
export const evidenceReadSince = async (
  db: Db,
  notificationId: number,
): Promise<boolean> => {
  const [row] = await db.query<{ read: boolean }>(
    `select exists (
       select 1 from notifications n
         join evidence_reads r on r.user_id = n.user_id and r.item_id = n.item_id
        where n.id = $1 and n.kind = any($2::text[]) and r.seen_until >= n.evidence_at
     ) as read`,
    [notificationId, EVIDENCE_ALERT_KINDS],
  )
  return Boolean(row?.read)
}

/** Per user, how far each has read one item's evidence. */
export const evidenceReadUntil = async (
  db: Db,
  userIds: number[],
  itemId: string,
): Promise<Map<number, number>> => {
  if (userIds.length === 0) return new Map()
  const rows = await db.query<{ user_id: string; seen_until: string }>(
    `select user_id, seen_until from evidence_reads where item_id = $1 and user_id = any($2::bigint[])`,
    [itemId.toLowerCase(), userIds],
  )
  return new Map(rows.map((r) => [Number(r.user_id), Number(r.seen_until)]))
}

// ---------------------------------------------------------------------------
// Sign-in nonces
// ---------------------------------------------------------------------------

/**
 * Records a sign-in nonce as used, for as long as it could still be valid.
 * False if it already was: a signed sign-in message works once, even when
 * two requests race with it.
 */
export const consumeNonce = async (
  db: Db,
  nonce: string,
  validForSeconds: number,
): Promise<boolean> =>
  (
    await db.query(
      `insert into used_nonces (nonce_hash, expires_at)
       values ($1, now() + make_interval(secs => $2))
       on conflict do nothing
       returning 1`,
      [sha256Hex(nonce), validForSeconds],
    )
  ).length === 1

// ---------------------------------------------------------------------------
// Watcher cursor
// ---------------------------------------------------------------------------

export interface WatcherState {
  cursorTs: number
  cursorBlock: number
}

export const getWatcherState = async (db: Db): Promise<WatcherState | null> => {
  const [row] = await db.query<{ cursor_ts: string; cursor_block: string }>(
    `select cursor_ts, cursor_block from watcher_state where id = 'main'`,
  )
  return row
    ? { cursorTs: Number(row.cursor_ts), cursorBlock: Number(row.cursor_block) }
    : null
}

export const setWatcherState = async (db: Db, state: WatcherState) => {
  await db.query(
    `insert into watcher_state (id, cursor_ts, cursor_block) values ('main', $1, $2)
     on conflict (id) do update set cursor_ts = excluded.cursor_ts, cursor_block = excluded.cursor_block, updated_at = now()`,
    [state.cursorTs, state.cursorBlock],
  )
}
