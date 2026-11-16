import type { Config, Context } from '@netlify/functions'
import { createApi } from '../notify/api'
import { connect } from '../notify/db'
import { readEnv } from '../notify/env'
import { createService } from '../notify/service'

let handle: ReturnType<typeof createApi> | undefined

const notifyApi = async (request: Request, context: Context) => {
  if (!handle) {
    try {
      const env = readEnv()
      handle = createApi(createService(env, connect(env.databaseUrl)))
    } catch (error) {
      console.error(
        '[notify-api]',
        error instanceof Error ? error.message : error,
      )
      return new Response(
        JSON.stringify({
          error: 'Notifications are not configured on this deployment.',
        }),
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        },
      )
    }
  }
  // The client's IP, for per-network limits (stored only as a keyed hash).
  return handle(request, { ip: context.ip })
}

export default notifyApi

export const config: Config = {
  path: '/api/notify/*',
  // Generous for people, tight for scripts hammering sign-in or email sends.
  rateLimit: {
    windowLimit: 120,
    windowSize: 60,
    aggregateBy: ['ip', 'domain'],
  },
}
