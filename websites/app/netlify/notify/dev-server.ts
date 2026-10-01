import { createServer } from 'node:http'
import { PGlite } from '@electric-sql/pglite'
import { createApi } from './api'
import { readEnv } from './env'
import { migrate } from './migrations'
import { pgliteDb } from './pglite'
import { createService, deliverDue, runWatcherTick } from './service'

/**
 * Runs the notification API locally on PGlite (no Postgres or Netlify CLI
 * needed). The watcher/deliver loops run only with NOTIFY_DEV_WATCH=1 since
 * they read the live indexer and Gnosis RPC.
 */
export const startDevServer = async (
  port = Number(process.env.NOTIFY_DEV_PORT ?? 8788),
) => {
  const pg = new PGlite(process.env.NOTIFY_DEV_DATA_DIR)
  const db = pgliteDb(pg)
  await migrate(db)
  const env = readEnv({
    ...process.env,
    NOTIFY_DATABASE_URL: 'pglite',
    NOTIFY_SESSION_SECRET:
      process.env.NOTIFY_SESSION_SECRET ??
      'local-development-secret-not-for-production',
    NOTIFY_SITE_URL: process.env.NOTIFY_SITE_URL ?? 'http://localhost:5173',
    NOTIFY_INDEXER_URL:
      process.env.NOTIFY_INDEXER_URL ??
      process.env.REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT,
  })
  const service = createService(env, db)
  const handle = createApi(service)

  const server = createServer(async (req, res) => {
    const chunks: Buffer[] = []
    for await (const chunk of req) chunks.push(chunk as Buffer)
    const headers = new Headers()
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') headers.set(key, value)
      else if (Array.isArray(value))
        value.forEach((v) => headers.append(key, v))
    }
    const request = new Request(`http://${req.headers.host}${req.url}`, {
      method: req.method,
      headers,
      body:
        req.method === 'GET' || req.method === 'HEAD'
          ? undefined
          : Buffer.concat(chunks),
    })
    const response = await handle(request)
    const outgoing: Record<string, string | string[]> = {}
    response.headers.forEach((value, key) => {
      if (key !== 'set-cookie') outgoing[key] = value
    })
    const cookies = response.headers.getSetCookie()
    if (cookies.length > 0) outgoing['set-cookie'] = cookies
    res.writeHead(response.status, outgoing)
    res.end(Buffer.from(await response.arrayBuffer()))
  })
  await new Promise<void>((resolve) => server.listen(port, resolve))
  console.log(
    `[notify-dev] API on http://localhost:${port}/api/notify (channels: ${
      [env.email && 'email', env.telegram && 'telegram', env.push && 'push']
        .filter(Boolean)
        .join(', ') || 'in-app only'
    })`,
  )

  if (process.env.NOTIFY_DEV_WATCH) {
    const loop = async () => {
      try {
        console.log(
          '[notify-dev] watcher',
          JSON.stringify(await runWatcherTick(service)),
        )
        console.log(
          '[notify-dev] deliver',
          JSON.stringify(await deliverDue(service)),
        )
      } catch (error) {
        console.error('[notify-dev]', error)
      }
    }
    await loop()
    setInterval(loop, 60_000)
  }
  return { server, db, service }
}
