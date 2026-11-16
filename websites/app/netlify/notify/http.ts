/** Small HTTP helpers for the notification API (Web Request/Response). */

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const SECURITY_HEADERS = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
}

export const json = (
  data: unknown,
  init: { status?: number; headers?: HeadersInit; cookies?: string[] } = {},
) => {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    ...SECURITY_HEADERS,
  })
  new Headers(init.headers).forEach((value, key) => headers.set(key, value))
  for (const cookie of init.cookies ?? []) headers.append('Set-Cookie', cookie)
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers,
  })
}

export const html = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      ...SECURITY_HEADERS,
    },
  })

export const redirect = (location: string, cookies: string[] = []) => {
  const headers = new Headers({ Location: location, ...SECURITY_HEADERS })
  for (const cookie of cookies) headers.append('Set-Cookie', cookie)
  return new Response(null, { status: 303, headers })
}

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ] as string,
  )

export const parseCookies = (request: Request): Record<string, string> => {
  const cookies: Record<string, string> = {}
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const index = part.indexOf('=')
    if (index < 0) continue
    const name = part.slice(0, index).trim()
    if (!name) continue
    try {
      cookies[name] = decodeURIComponent(part.slice(index + 1).trim())
    } catch {
      // Another cookie on this site that isn't URI-encoded: not ours, skip it.
    }
  }
  return cookies
}

export const serializeCookie = (
  name: string,
  value: string,
  { maxAge, secure = true }: { maxAge: number; secure?: boolean },
) =>
  [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/api/notify',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')

const MAX_BODY_BYTES = 16 * 1024

/** The request's JSON object body (`{}` when empty). */
export const readJson = async <T extends object>(
  request: Request,
): Promise<T> => {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES)
    throw new HttpError(413, 'Request body too large.')
  let body: unknown
  try {
    body = JSON.parse(text || '{}')
  } catch {
    throw new HttpError(400, 'Invalid JSON body.')
  }
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new HttpError(400, 'The request body must be a JSON object.')
  return body as T
}

/** The request's form fields (a confirmation page's POST). */
export const readForm = async (request: Request) => {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES)
    throw new HttpError(413, 'Request body too large.')
  return new URLSearchParams(text)
}

/**
 * Cross-site request guard for state-changing requests: the browser always
 * sends Origin on fetch/XHR POST, PUT and DELETE. Cookies are also SameSite=Lax.
 */
export const assertSameOrigin = (request: Request) => {
  if (request.method === 'GET' || request.method === 'HEAD') return
  const origin = request.headers.get('origin')
  let host: string | null = null
  try {
    // "null" (sandboxed pages, some redirects) or garbage: not this site.
    host = origin ? new URL(origin).host : null
  } catch {
    host = null
  }
  if (!host || host !== new URL(request.url).host)
    throw new HttpError(403, 'Cross-origin request refused.')
}

export type Params = Record<string, string>

/** What the platform knows about who is asking (Netlify: context.ip). */
export interface ClientInfo {
  ip?: string
}

export type Handler = (
  request: Request,
  params: Params,
  client: ClientInfo,
) => Promise<Response>

interface Route {
  method: string
  pattern: RegExp
  keys: string[]
  handler: Handler
}

/** Path router: patterns like `/api/notify/follows/:itemId`. */
export const createRouter = (
  routes: [method: string, path: string, handler: Handler][],
) => {
  const compiled: Route[] = routes.map(([method, path, handler]) => {
    const keys: string[] = []
    const pattern = new RegExp(
      `^${path.replace(/\/:([A-Za-z]+)/g, (_, key) => {
        keys.push(key)
        return '/([^/]+)'
      })}/?$`,
    )
    return { method, pattern, keys, handler }
  })
  return async (
    request: Request,
    client: ClientInfo = {},
  ): Promise<Response> => {
    const { pathname } = new URL(request.url)
    const matches = compiled.filter((route) => route.pattern.test(pathname))
    if (matches.length === 0)
      return json({ error: 'Not found.' }, { status: 404 })
    const route = matches.find(
      (candidate) => candidate.method === request.method,
    )
    if (!route) return json({ error: 'Method not allowed.' }, { status: 405 })
    const values = route.pattern.exec(pathname)?.slice(1) ?? []
    let params: Params
    try {
      params = Object.fromEntries(
        route.keys.map((key, i) => [key, decodeURIComponent(values[i])]),
      )
    } catch {
      // A malformed escape such as %E0%A4%A.
      return json({ error: 'Invalid path.' }, { status: 400 })
    }
    try {
      return await route.handler(request, params, client)
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, { status: error.status })
      console.error('[notify-api]', error)
      return json({ error: 'Internal error.' }, { status: 500 })
    }
  }
}
