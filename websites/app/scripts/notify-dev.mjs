// Local notification API: `yarn notify:dev`, then in another terminal
// `REACT_APP_NOTIFY_ENABLED=true NOTIFY_API_URL=http://127.0.0.1:8788 yarn start`.
// From .env it reads only what the local service needs: NOTIFY_* settings and
// the indexer endpoint. Channel credentials (RESEND_*, TELEGRAM_*, VAPID_*)
// are never read from .env: to try a channel, set them in this command's
// environment yourself.
import { build } from 'esbuild'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const NEEDED = /^(NOTIFY_[A-Z0-9_]+|REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT)$/

const root = fileURLToPath(new URL('..', import.meta.url))
const envFile = join(root, '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (match && NEEDED.test(match[1]) && process.env[match[1]] === undefined)
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}

const channels = [
  process.env.RESEND_API_KEY && 'email (RESEND_API_KEY)',
  process.env.TELEGRAM_BOT_TOKEN && 'Telegram (TELEGRAM_BOT_TOKEN)',
  process.env.VAPID_PRIVATE_KEY && 'browser push (VAPID_PRIVATE_KEY)',
].filter(Boolean)
if (channels.length > 0)
  console.warn(
    `[notify-dev] Real channel credentials in the environment: ${channels.join(', ')}.\n` +
      `[notify-dev] Anything this service sends through them reaches real people${
        process.env.NOTIFY_DEV_WATCH
          ? ', and NOTIFY_DEV_WATCH=1 sends notifications about live activity.'
          : '.'
      }`,
  )

const outfile = join(root, 'node_modules/.cache/notify-dev/server.mjs')
await build({
  entryPoints: [join(root, 'netlify/notify/dev-server.ts')],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  logLevel: 'warning',
})
const { startDevServer } = await import(pathToFileURL(outfile).href)
await startDevServer()
