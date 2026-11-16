import type { Config } from '@netlify/functions'
import { connect } from '../notify/db'
import { readEnv } from '../notify/env'
import { createService, deliverDue } from '../notify/service'

// Sends queued email, Telegram and browser notifications, with retries.
const notifyDeliver = async () => {
  let env
  try {
    env = readEnv()
  } catch (error) {
    // Not set up on this deployment yet; see netlify/notify/README.md.
    console.warn(
      '[notify-deliver]',
      error instanceof Error ? error.message : error,
    )
    return
  }
  const result = await deliverDue(createService(env, connect(env.databaseUrl)))
  console.log('[notify-deliver]', JSON.stringify(result))
}

export default notifyDeliver

export const config: Config = { schedule: '* * * * *' }
