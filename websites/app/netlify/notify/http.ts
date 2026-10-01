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
    if (name) cookies[name] = decodeURIComponent(part.slice(index + 1).trim())
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

export const readJson = async <T>(request: Request): Promise<T> => {
  const text = await request.text()
  if (text.length > MAX_BODY_BYTES)
    throw new HttpError(413, 'Request body too large.')
  try {
    return JSON.parse(text || '{}') as T
  } catch {
    throw new HttpError(400, 'Invalid JSON body.')
  }
}

/**
 * Cross-site request guard for state-changing requests: the browser always
 * sends Origin on fetch/XHR POST, PUT and DELETE. Cookies are also SameSite=Lax.
 */
export const assertSameOrigin = (request: Request) => {
  if (request.method === 'GET' || request.method === 'HEAD') return
  const origin = request.headers.get('origin')
  const host = new URL(request.url).host
  if (!origin || new URL(origin).host !== host)
    throw new HttpError(403, 'Cross-origin request refused.')
}

export type Params = Record<string, string>
export type Handler = (request: Request, params: Params) => Promise<Response>

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
  return async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url)
    const matches = compiled.filter((route) => route.pattern.test(pathname))
    if (matches.length === 0)
      return json({ error: 'Not found.' }, { status: 404 })
    const route = matches.find(
      (candidate) => candidate.method === request.method,
    )
    if (!route) return json({ error: 'Method not allowed.' }, { status: 405 })
    const values = route.pattern.exec(pathname)?.slice(1) ?? []
    const params = Object.fromEntries(
      route.keys.map((key, i) => [key, decodeURIComponent(values[i])]),
    )
    try {
      return await route.handler(request, params)
    } catch (error) {
      if (error instanceof HttpError)
        return json({ error: error.message }, { status: error.status })
      console.error('[notify-api]', error)
      return json({ error: 'Internal error.' }, { status: 500 })
    }
  }
}
