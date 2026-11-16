import {
  createPublicClient,
  getAddress,
  http,
  isAddress,
  recoverMessageAddress,
  type Hex,
} from 'viem'
import { gnosis } from 'viem/chains'
import {
  parseSiweMessage,
  validateSiweMessage,
  verifySiweMessage,
} from 'viem/siwe'
import type { NotifyEnv } from './env'
import { HttpError, parseCookies, serializeCookie } from './http'
import { randomNonce, signToken, verifyToken } from './tokens'

const NONCE_COOKIE = 'scout_notify_nonce'
const SESSION_COOKIE = 'scout_notify_session'
const NONCE_TTL = 10 * 60
const SESSION_TTL = 30 * 24 * 60 * 60
const MAX_MESSAGE_AGE_MS = 10 * 60 * 1000
/** How far ahead of the server a wallet's clock may be. */
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000
/** Smart-account checks are one eth_call: no retries, and a short wait. */
const RPC_TIMEOUT_MS = 5_000

export interface Session {
  userId: number
  address: string
  /** The account's session version when it was issued: signing out bumps it, which ends every session. */
  v: number
}

const isLocalhost = (request: Request) =>
  ['localhost', '127.0.0.1'].includes(new URL(request.url).hostname)

/** Issues a sign-in nonce, bound to this browser by an HttpOnly cookie. */
export const issueNonce = (env: NotifyEnv, request: Request) => {
  const nonce = randomNonce()
  const cookie = serializeCookie(
    NONCE_COOKIE,
    signToken({ nonce }, env.sessionSecret, 'siwe-nonce', NONCE_TTL),
    {
      maxAge: NONCE_TTL,
      secure: !isLocalhost(request),
    },
  )
  return { nonce, cookie }
}

/** Marks a nonce as used; false if it already was. */
export type ConsumeNonce = (
  nonce: string,
  validForSeconds: number,
) => Promise<boolean>

/**
 * Verifies an EIP-4361 sign-in: the message must be for this host, carry the
 * nonce issued to this browser, be fresh, and be signed by its address.
 * EOAs are checked locally; contract accounts through ERC-1271 / ERC-6492
 * on Gnosis only, where Scout's accounts live: the same address can belong
 * to someone else on another chain. Each nonce signs in once.
 */
export const verifySignIn = async (
  env: NotifyEnv,
  request: Request,
  { message, signature }: { message?: unknown; signature?: unknown },
  consumeNonce: ConsumeNonce,
): Promise<string> => {
  if (
    typeof message !== 'string' ||
    message.length > 4000 ||
    typeof signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(signature)
  ) {
    throw new HttpError(400, 'A SIWE message and signature are required.')
  }
  const nonceToken = verifyToken<{ nonce: string }>(
    parseCookies(request)[NONCE_COOKIE],
    env.sessionSecret,
    'siwe-nonce',
  )
  if (!nonceToken)
    throw new HttpError(401, 'Sign-in expired. Request a new nonce.')

  const parsed = parseSiweMessage(message)
  const domain = new URL(request.url).host
  if (
    !parsed.address ||
    !isAddress(parsed.address) ||
    !parsed.issuedAt ||
    !parsed.chainId
  ) {
    throw new HttpError(400, 'Malformed sign-in message.')
  }
  const age = Date.now() - parsed.issuedAt.getTime()
  if (age < -MAX_CLOCK_SKEW_MS)
    throw new HttpError(
      401,
      "The sign-in message is dated in the future. Check your device's clock.",
    )
  if (
    age >= MAX_MESSAGE_AGE_MS ||
    !validateSiweMessage({ message: parsed, domain, nonce: nonceToken.nonce })
  ) {
    throw new HttpError(
      401,
      'Sign-in message is not valid for this site, nonce or time.',
    )
  }

  const address = getAddress(parsed.address)
  const signer = await recoverMessageAddress({
    message,
    signature: signature as Hex,
  }).catch(() => null)
  if (signer !== address) {
    // Not the address's own key: maybe a smart account. Checked before any
    // RPC call, so a sign-in for another chain costs nothing.
    if (parsed.chainId !== gnosis.id)
      throw new HttpError(
        401,
        'Invalid signature. To sign in with a smart account, switch your wallet to Gnosis.',
      )
    const client = createPublicClient({
      chain: gnosis,
      transport: http(env.gnosisRpcUrls[0], {
        timeout: RPC_TIMEOUT_MS,
        retryCount: 0,
      }),
    })
    const valid = await verifySiweMessage(client, {
      message,
      signature: signature as Hex,
      domain,
      nonce: nonceToken.nonce,
    }).catch(() => false)
    if (!valid) throw new HttpError(401, 'Invalid signature.')
  }
  // Only now, so requests without a valid signature can't use it up. A copy
  // of the cookie, message and signature can't sign in a second time.
  if (!(await consumeNonce(nonceToken.nonce, NONCE_TTL)))
    throw new HttpError(401, 'This sign-in was already used. Sign in again.')
  return address.toLowerCase()
}

export const sessionCookie = (
  env: NotifyEnv,
  request: Request,
  session: Session,
) =>
  serializeCookie(
    SESSION_COOKIE,
    signToken({ ...session }, env.sessionSecret, 'session', SESSION_TTL),
    {
      maxAge: SESSION_TTL,
      secure: !isLocalhost(request),
    },
  )

/** Drops the nonce cookie once it has served its sign-in. */
export const clearNonceCookie = (request: Request) =>
  serializeCookie(NONCE_COOKIE, '', {
    maxAge: 0,
    secure: !isLocalhost(request),
  })

export const clearCookies = (request: Request) => [
  serializeCookie(SESSION_COOKIE, '', {
    maxAge: 0,
    secure: !isLocalhost(request),
  }),
  serializeCookie(NONCE_COOKIE, '', {
    maxAge: 0,
    secure: !isLocalhost(request),
  }),
]

export const readSession = (
  env: NotifyEnv,
  request: Request,
): Session | null => {
  const token = verifyToken<{ userId: number; address: string; v: number }>(
    parseCookies(request)[SESSION_COOKIE],
    env.sessionSecret,
    'session',
  )
  return token &&
    typeof token.userId === 'number' &&
    typeof token.address === 'string' &&
    typeof token.v === 'number'
    ? { userId: token.userId, address: token.address, v: token.v }
    : null
}

export const requireSession = (env: NotifyEnv, request: Request): Session => {
  const session = readSession(env, request)
  if (!session) throw new HttpError(401, 'Sign in to manage notifications.')
  return session
}
