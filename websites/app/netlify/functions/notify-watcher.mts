import type { Config } from '@netlify/functions'
import { connect } from '../notify/db'
import { readEnv } from '../notify/env'
import { createService, runWatcherTick } from '../notify/service'

// Detects new registry and court activity and queues notifications.
const notifyWatcher = async () => {
  let env
  try {
    env = readEnv()
  } catch (error) {
    // Not set up on this deployment yet; see netlify/notify/README.md.
    console.warn(
      '[notify-watcher]',
      error instanceof Error ? error.message : error,
    )
    return
  }
  const result = await runWatcherTick(
    createService(env, connect(env.databaseUrl)),
  )
  console.log('[notify-watcher]', JSON.stringify(result))
}

export default notifyWatcher

export const config: Config = { schedule: '* * * * *' }
