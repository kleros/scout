// Local notification API: `yarn notify:dev`, then in another terminal
// `NOTIFY_API_URL=http://localhost:8788 yarn start`. Reads .env for the
// indexer endpoint and optional channel credentials.
import { build } from 'esbuild'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const envFile = join(root, '.env')
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, 'utf8').split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (match && process.env[match[1]] === undefined)
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '')
  }
}

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
