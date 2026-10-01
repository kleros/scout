import { isAddress } from 'viem'
import {
  clearCookies,
  clearNonceCookie,
  issueNonce,
  readSession,
  requireSession,
  sessionCookie,
  verifySignIn,
  type Session,
} from './auth'
import { sendEmail } from './channels/email'
import { sendTelegram } from './channels/telegram'
import {
  assertSameOrigin,
  createRouter,
  escapeHtml,
  html,
  HttpError,
  json,
  readJson,
  redirect,
} from './http'
import { itemLabel, itemUrl } from './items'
import { renderVerificationEmail, settingsUrl } from './messages'
import { ensureSchema } from './migrations'
import {
  CATEGORIES,
  normalizePreferences,
  type Preferences,
} from './preferences'
import type { Service } from './service'
import {
  addPushSubscription,
  addWatchedAddress,
  completeTelegramLink,
  consumeNonce,
  createTelegramLinkToken,
  deleteUser,
  follow,
  getEmail,
  getTelegram,
  getUser,
  listFollows,
  listNotifications,
  listPushSubscriptions,
  listEvidenceReads,
  MAX_EVIDENCE_READS,
  setEvidenceReads,
  listWatchedAddresses,
  markRead,
  removeEmail,
  removePushSubscription,
  removeWatchedAddress,
  setPendingEmail,
  setPreferences,
  unfollow,
  unlinkTelegram,
  unreadCount,
  unsubscribeEmail,
  upsertUser,
  verifyEmailToken,
  MAX_WATCHED_ADDRESSES,
} from './store'
import { randomToken, sha256Hex, verifyToken } from './tokens'
import {
  ITEM_ID,
  READS_PER_REQUEST,
  isValidRead,
} from '../../src/utils/cases/reads'

const EMAIL_REGEX = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i
const EMAIL_TOKEN_TTL_MS = 24 * 3600 * 1000

// Browsers' push services. Any other endpoint would have the delivery worker
// post to hosts chosen by whoever registered it.
const PUSH_SERVICE_HOSTS = [
  /^fcm\.googleapis\.com$/, // Chrome, Edge, Opera, Samsung Internet
  /^android\.googleapis\.com$/, // older Chrome subscriptions
  /^updates\.push\.services\.mozilla\.com$/, // Firefox
  /(^|\.)push\.apple\.com$/, // Safari
  /(^|\.)notify\.windows\.com$/, // legacy Edge
]

const isPushServiceUrl = (value: string) => {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (url.port === '' || url.port === '443') &&
      PUSH_SERVICE_HOSTS.some((host) => host.test(url.hostname))
    )
  } catch {
    return false
  }
}

/** Bytes of a base64url-encoded key, or null when it is not base64url. */
const keyBytes = (value: unknown) =>
  typeof value === 'string' && /^[A-Za-z0-9_-]{1,200}={0,2}$/.test(value)
    ? Buffer.from(value, 'base64url')
    : null
const TELEGRAM_TOKEN_TTL_MS = 15 * 60 * 1000

/** Routes that other sites legitimately call (Telegram, mail clients). */
const CROSS_ORIGIN_ROUTES = [
  /^\/api\/notify\/telegram\/webhook$/,
  /^\/api\/notify\/email\/unsubscribe$/,
]

export const createApi = (service: Service) => {
  const { env, db } = service

  // Sessions name the address too, so they can never resolve to another
  // user, even if ids were reused (e.g. after restoring the database).
  const sessionUser = async (session: Session) => {
    const user = await getUser(db, session.userId)
    return user?.address === session.address.toLowerCase() ? user : null
  }

  const currentUser = async (request: Request) => {
    const user = await sessionUser(requireSession(env, request))
    if (!user)
      throw new HttpError(
        401,
        'Your notification account no longer exists. Sign in again.',
      )
    // The app names the account a request is for; a session that has
    // since moved to another wallet (say, in another tab) must not get it.
    const meant = request.headers.get('x-notify-account')
    if (meant && meant.toLowerCase() !== user.address)
      throw new HttpError(
        409,
        'You are signed in to notifications with another wallet now.',
      )
    return user
  }

  const profile = async (userId: number) => {
    const [user, email, telegram, push, watched, unread] = await Promise.all([
      getUser(db, userId),
      getEmail(db, userId),
      getTelegram(db, userId),
      listPushSubscriptions(db, userId),
      listWatchedAddresses(db, userId),
      unreadCount(db, userId),
    ])
    return {
      address: user?.address,
      preferences: user?.preferences,
      email: email && {
        address: email.email,
        verified: email.verified,
        unsubscribed: email.unsubscribed,
      },
      telegram: {
        connected: Boolean(telegram?.chatId),
        username: telegram?.username ?? null,
      },
      push: { devices: push.length, endpoints: push.map((p) => p.endpoint) },
      watchedAddresses: watched,
      unread,
    }
  }

  const router = createRouter([
    [
      'GET',
      '/api/notify/config',
      async () =>
        json({
          channels: {
            email: Boolean(env.email),
            telegram: env.telegram ? { bot: env.telegram.botUsername } : null,
            push: env.push ? { publicKey: env.push.publicKey } : null,
          },
          categories: CATEGORIES,
          maxWatchedAddresses: MAX_WATCHED_ADDRESSES,
        }),
    ],

    // --- Sign-in with Ethereum -------------------------------------------------
    [
      'GET',
      '/api/notify/auth/nonce',
      async (request) => {
        const { nonce, cookie } = issueNonce(env, request)
        return json({ nonce }, { cookies: [cookie] })
      },
    ],
    [
      'POST',
      '/api/notify/auth/verify',
      async (request) => {
        const address = await verifySignIn(
          env,
          request,
          await readJson(request),
          (nonce, validFor) => consumeNonce(db, nonce, validFor),
        )
        const user = await upsertUser(db, address)
        return json(await profile(user.id), {
          cookies: [
            sessionCookie(env, request, { userId: user.id, address }),
            clearNonceCookie(request),
          ],
        })
      },
    ],
    [
      'POST',
      '/api/notify/auth/logout',
      async (request) => json({ ok: true }, { cookies: clearCookies(request) }),
    ],

    // --- Profile and preferences ----------------------------------------------
    [
      'GET',
      '/api/notify/me',
      async (request) => {
        const session = readSession(env, request)
        if (!session) return json({ signedIn: false })
        const user = await sessionUser(session)
        if (!user)
          return json({ signedIn: false }, { cookies: clearCookies(request) })
        return json({ signedIn: true, ...(await profile(user.id)) })
      },
    ],
    [
      'DELETE',
      '/api/notify/me',
      async (request) => {
        const user = await currentUser(request)
        await deleteUser(db, user.id)
        return json({ ok: true }, { cookies: clearCookies(request) })
      },
    ],
    [
      'PUT',
      '/api/notify/me/preferences',
      async (request) => {
        const user = await currentUser(request)
        const update = await readJson<Partial<Preferences>>(request)
        const merged = normalizePreferences({
          channels: {
            ...user.preferences.channels,
            ...(update.channels ?? {}),
          },
          categories: {
            ...user.preferences.categories,
            ...(update.categories ?? {}),
          },
        })
        await setPreferences(db, user.id, merged)
        return json({ preferences: merged })
      },
    ],

    // --- Email -----------------------------------------------------------------
    [
      'PUT',
      '/api/notify/me/email',
      async (request) => {
        const user = await currentUser(request)
        if (!env.email)
          throw new HttpError(503, 'Email notifications are not configured.')
        const { email } = await readJson<{ email?: string }>(request)
        const address = (email ?? '').trim()
        if (address.length > 254 || !EMAIL_REGEX.test(address))
          throw new HttpError(400, 'Enter a valid email address.')
        const token = randomToken()
        const status = await setPendingEmail(
          db,
          user.id,
          address,
          sha256Hex(token),
          new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
        )
        if (status === 'rate-limited')
          throw new HttpError(
            429,
            'Too many verification emails. Try again later.',
          )
        const verifyUrl = `${env.siteUrl}/api/notify/email/verify?token=${encodeURIComponent(token)}`
        const sent = await sendEmail(env.email, {
          to: address,
          ...renderVerificationEmail(verifyUrl, user.address),
        })
        if (!sent.ok)
          throw new HttpError(
            502,
            'The verification email could not be sent. Try again shortly.',
          )
        return json({
          email: { address, verified: false, unsubscribed: false },
        })
      },
    ],
    [
      'DELETE',
      '/api/notify/me/email',
      async (request) => {
        const user = await currentUser(request)
        await removeEmail(db, user.id)
        return json({ email: null })
      },
    ],
    [
      'GET',
      '/api/notify/email/verify',
      async (request) => {
        const token = new URL(request.url).searchParams.get('token') ?? ''
        const userId = token
          ? await verifyEmailToken(db, sha256Hex(token))
          : null
        return redirect(
          `${env.siteUrl}/home?notify=${userId ? 'email-verified' : 'email-link-invalid'}#notifications`,
        )
      },
    ],
    [
      'GET',
      '/api/notify/email/unsubscribe',
      async (request) => {
        // Link scanners follow GET links, so GET only shows a confirmation form.
        const token = new URL(request.url).searchParams.get('token') ?? ''
        const valid = Boolean(
          verifyToken(token, env.sessionSecret, 'unsubscribe'),
        )
        return html(`<!doctype html><meta name="viewport" content="width=device-width"><title>Unsubscribe</title>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:48px auto;padding:0 16px">
${
  valid
    ? `<h1 style="font-size:20px">Stop Scout emails?</h1><form method="post"><input type="hidden" name="token" value="${escapeHtml(token)}"><button style="padding:10px 18px;border-radius:999px;border:0;background:#1c1c1e;color:#fff;font-size:15px">Unsubscribe</button></form>`
    : '<h1 style="font-size:20px">This unsubscribe link is invalid or expired.</h1>'
}<p><a href="${escapeHtml(settingsUrl(env.siteUrl))}">Notification settings</a></p></body>`)
      },
    ],
    [
      'POST',
      '/api/notify/email/unsubscribe',
      async (request) => {
        // RFC 8058 one-click (token in the URL) or the confirmation form (token in the body).
        const url = new URL(request.url)
        let token = url.searchParams.get('token') ?? ''
        if (!token)
          token = new URLSearchParams(await request.text()).get('token') ?? ''
        const payload = verifyToken<{ userId: number }>(
          token,
          env.sessionSecret,
          'unsubscribe',
        )
        if (!payload) throw new HttpError(400, 'Invalid unsubscribe link.')
        await unsubscribeEmail(db, payload.userId)
        return html(`<!doctype html><meta name="viewport" content="width=device-width"><title>Unsubscribed</title>
<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:48px auto;padding:0 16px">
<h1 style="font-size:20px">You won't get Scout emails anymore.</h1>
<p>Other channels (Telegram, browser) are unchanged. <a href="${escapeHtml(settingsUrl(env.siteUrl))}">Notification settings</a></p></body>`)
      },
    ],

    // --- Telegram --------------------------------------------------------------
    [
      'POST',
      '/api/notify/me/telegram',
      async (request) => {
        const user = await currentUser(request)
        if (!env.telegram)
          throw new HttpError(503, 'Telegram notifications are not configured.')
        const token = randomToken(24)
        await createTelegramLinkToken(
          db,
          user.id,
          sha256Hex(token),
          new Date(Date.now() + TELEGRAM_TOKEN_TTL_MS),
        )
        return json({
          url: `https://t.me/${env.telegram.botUsername}?start=${token}`,
        })
      },
    ],
    [
      'DELETE',
      '/api/notify/me/telegram',
      async (request) => {
        const user = await currentUser(request)
        await unlinkTelegram(db, { userId: user.id })
        return json({ telegram: { connected: false, username: null } })
      },
    ],
    [
      'POST',
      '/api/notify/telegram/webhook',
      async (request) => {
        if (
          !env.telegram ||
          request.headers.get('x-telegram-bot-api-secret-token') !==
            env.telegram.webhookSecret
        ) {
          throw new HttpError(401, 'Unauthorized.')
        }
        const update = await readJson<{
          message?: {
            chat?: { id?: number; type?: string }
            from?: { username?: string }
            text?: string
          }
        }>(request)
        const chat = update.message?.chat
        const text = update.message?.text?.trim() ?? ''
        if (!chat?.id || chat.type !== 'private') return json({ ok: true })
        const chatId = String(chat.id)
        const reply = (message: string) =>
          sendTelegram(env.telegram!.botToken, chatId, message)
        const start = /^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{16,64})$/.exec(text)
        if (start) {
          const userId = await completeTelegramLink(
            db,
            sha256Hex(start[1]),
            chatId,
            update.message?.from?.username ?? null,
          )
          const user = userId ? await getUser(db, userId) : null
          await reply(
            user
              ? `Connected. You'll get Scout notifications for <b>${escapeHtml(user.address)}</b> here.\nSend /stop to disconnect.`
              : 'This link expired. Open Scout → Settings → Notifications and connect Telegram again.',
          )
        } else if (/^\/stop(?:@\w+)?$/.test(text)) {
          await unlinkTelegram(db, { chatId })
          await reply(
            'Disconnected. You will not get Scout notifications here anymore.',
          )
        } else {
          await reply(
            `This bot sends Kleros Scout notifications. Connect it from Scout → Settings → Notifications: ${escapeHtml(settingsUrl(env.siteUrl))}`,
          )
        }
        return json({ ok: true })
      },
    ],

    // --- Web push --------------------------------------------------------------
    [
      'POST',
      '/api/notify/me/push',
      async (request) => {
        const user = await currentUser(request)
        if (!env.push)
          throw new HttpError(503, 'Browser notifications are not configured.')
        const body = await readJson<{
          endpoint?: string
          keys?: { p256dh?: string; auth?: string }
        }>(request)
        const endpoint = body.endpoint ?? ''
        if (endpoint.length > 1000 || !isPushServiceUrl(endpoint))
          throw new HttpError(
            400,
            "This browser's push service isn't supported.",
          )
        // An uncompressed P-256 public key and a 16-byte auth secret (RFC 8291).
        const p256dh = keyBytes(body.keys?.p256dh)
        const auth = keyBytes(body.keys?.auth)
        if (p256dh?.length !== 65 || p256dh[0] !== 4 || auth?.length !== 16)
          throw new HttpError(400, 'Invalid push subscription.')
        await addPushSubscription(db, user.id, {
          endpoint,
          p256dh: body.keys!.p256dh!,
          auth: body.keys!.auth!,
        })
        return json({ ok: true })
      },
    ],
    [
      'DELETE',
      '/api/notify/me/push',
      async (request) => {
        const user = await currentUser(request)
        const { endpoint } = await readJson<{ endpoint?: string }>(request)
        if (endpoint) await removePushSubscription(db, endpoint, user.id)
        return json({ ok: true })
      },
    ],

    // --- Inbox -------------------------------------------------------------------
    [
      'GET',
      '/api/notify/me/notifications',
      async (request) => {
        const user = await currentUser(request)
        const params = new URL(request.url).searchParams
        const before = Number(params.get('before')) || undefined
        const limit = Math.min(
          Math.max(Number(params.get('limit')) || 20, 1),
          50,
        )
        const [notifications, unread] = await Promise.all([
          listNotifications(db, user.id, { before, limit }),
          unreadCount(db, user.id),
        ])
        return json({ notifications, unread })
      },
    ],
    [
      'POST',
      '/api/notify/me/notifications/read',
      async (request) => {
        const user = await currentUser(request)
        const { ids } = await readJson<{ ids?: unknown }>(request)
        const valid = Array.isArray(ids)
          ? ids
              .map(Number)
              .filter((id) => Number.isSafeInteger(id) && id > 0)
              .slice(0, 200)
          : undefined
        await markRead(db, user.id, valid)
        return json({ unread: await unreadCount(db, user.id) })
      },
    ],

    // --- Evidence reads (the "new" counts, across devices) ------------------------------
    [
      'GET',
      '/api/notify/me/reads',
      async (request) => {
        const user = await currentUser(request)
        return json({ reads: await listEvidenceReads(db, user.id) })
      },
    ],
    [
      'POST',
      '/api/notify/me/reads',
      async (request) => {
        const user = await currentUser(request)
        const { reads } = await readJson<{ reads?: unknown }>(request)
        const entries =
          reads && typeof reads === 'object' ? Object.entries(reads) : []
        const valid = entries.filter((entry): entry is [string, number] =>
          isValidRead(entry[0], entry[1]),
        )
        if (valid.length !== entries.length || valid.length > READS_PER_REQUEST)
          throw new HttpError(400, 'Invalid evidence reads.')
        const alerts = await setEvidenceReads(
          db,
          user.id,
          Object.fromEntries(valid),
        )
        return json({
          reads: await listEvidenceReads(db, user.id),
          alertsRead: alerts,
          max: MAX_EVIDENCE_READS,
        })
      },
    ],

    // --- Follows and watched addresses ---------------------------------------------
    [
      'GET',
      '/api/notify/me/follows',
      async (request) => {
        const user = await currentUser(request)
        const ids = await listFollows(db, user.id)
        const summaries = await service.indexer
          .itemSummaries(ids)
          .catch(() => [])
        return json({
          follows: ids.map((id) => {
            const item = summaries.find((s) => s.id === id)
            return {
              itemId: id,
              label: item ? itemLabel(item) : id,
              url: item ? itemUrl(env.siteUrl, item) : null,
            }
          }),
        })
      },
    ],
    [
      'PUT',
      '/api/notify/me/follows/:itemId',
      async (request, { itemId }) => {
        const user = await currentUser(request)
        if (!ITEM_ID.test(itemId.toLowerCase()))
          throw new HttpError(400, 'Invalid item id.')
        if (!(await follow(db, user.id, itemId)))
          throw new HttpError(422, 'You follow too many items already.')
        return json({ following: true })
      },
    ],
    [
      'DELETE',
      '/api/notify/me/follows/:itemId',
      async (request, { itemId }) => {
        const user = await currentUser(request)
        await unfollow(db, user.id, itemId)
        return json({ following: false })
      },
    ],
    [
      'POST',
      '/api/notify/me/watched',
      async (request) => {
        const user = await currentUser(request)
        const { address } = await readJson<{ address?: string }>(request)
        if (!address || !isAddress(address, { strict: false }))
          throw new HttpError(400, 'Enter a valid EVM address.')
        if (address.toLowerCase() === user.address)
          throw new HttpError(400, 'That is already your address.')
        if (!(await addWatchedAddress(db, user.id, address))) {
          throw new HttpError(
            409,
            `You can watch at most ${MAX_WATCHED_ADDRESSES} addresses.`,
          )
        }
        return json({
          watchedAddresses: await listWatchedAddresses(db, user.id),
        })
      },
    ],
    [
      'DELETE',
      '/api/notify/me/watched/:address',
      async (request, { address }) => {
        const user = await currentUser(request)
        await removeWatchedAddress(db, user.id, address)
        return json({
          watchedAddresses: await listWatchedAddresses(db, user.id),
        })
      },
    ],
  ])

  return async (request: Request): Promise<Response> => {
    try {
      const { pathname } = new URL(request.url)
      if (!CROSS_ORIGIN_ROUTES.some((route) => route.test(pathname)))
        assertSameOrigin(request)
      await ensureSchema(db)
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, { status: error.status })
      console.error('[notify-api]', error)
      return json({ error: 'Service unavailable.' }, { status: 503 })
    }
    return router(request)
  }
}
