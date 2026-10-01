import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto'

const b64url = (buffer: Buffer) => buffer.toString('base64url')

/** Random URL-safe token (default 32 bytes of entropy). */
export const randomToken = (bytes = 32) => b64url(randomBytes(bytes))

/** Alphanumeric nonce, as EIP-4361 requires (`[a-zA-Z0-9]{8,}`). */
export const randomNonce = () => randomBytes(16).toString('hex')

export const sha256Hex = (value: string) =>
  createHash('sha256').update(value).digest('hex')

const mac = (data: string, secret: string, purpose: string) =>
  createHmac('sha256', secret).update(`${purpose}.${data}`).digest()

/**
 * Compact signed token: base64url(JSON payload) + "." + base64url(HMAC).
 * `purpose` binds a token to one use, so a nonce token can never be replayed
 * as a session, and so on.
 */
export const signToken = (
  payload: Record<string, unknown>,
  secret: string,
  purpose: string,
  ttlSeconds: number,
): string => {
  const body = b64url(
    Buffer.from(
      JSON.stringify({
        ...payload,
        exp: Math.floor(Date.now() / 1000) + ttlSeconds,
      }),
    ),
  )
  return `${body}.${b64url(mac(body, secret, purpose))}`
}

export const verifyToken = <T extends Record<string, unknown>>(
  token: string | undefined | null,
  secret: string,
  purpose: string,
): (T & { exp: number }) | null => {
  if (!token) return null
  const [body, signature, extra] = token.split('.')
  if (!body || !signature || extra !== undefined) return null
  const expected = mac(body, secret, purpose)
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected))
    return null
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (
      typeof payload?.exp !== 'number' ||
      payload.exp < Math.floor(Date.now() / 1000)
    )
      return null
    return payload
  } catch {
    return null
  }
}
