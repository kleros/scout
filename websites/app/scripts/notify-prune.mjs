// Keeps the notification service (netlify/notify) out of a deploy until it is
// switched on. Netlify deploys every function it finds in netlify/functions
// once the build command has finished, and reads a scheduled function's
// schedule from its source, so these functions can't be turned off in code:
// they must be absent. The build command (netlify.toml) ends with this
// script, which deletes the notify-* entries there unless the build
// environment has NOTIFY_ENABLED=true. It exits non-zero only on a real error.
//
//   node scripts/notify-prune.mjs [functions-dir]   (default: netlify/functions)
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const dir = process.argv[2] ?? join(root, 'netlify/functions')
const flag = process.env.NOTIFY_ENABLED

if (flag === 'true') {
  console.log('[notify] NOTIFY_ENABLED=true: the notification functions are deployed.')
  process.exit(0)
}

try {
  const entries = existsSync(dir)
    ? readdirSync(dir).filter((name) => name.startsWith('notify-'))
    : []
  for (const name of entries) rmSync(join(dir, name), { recursive: true })
  console.log(
    `[notify] NOTIFY_ENABLED is ${flag === undefined ? 'not set' : `"${flag}", not "true"`}: ` +
      (entries.length > 0
        ? `removed ${entries.join(', ')} from ${relative(process.cwd(), dir) || '.'}, so this deploy has no notification functions.`
        : 'no notification functions to remove.'),
  )
} catch (error) {
  console.error('[notify] Could not remove the notification functions:', error)
  process.exit(1)
}
