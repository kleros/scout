// Runs the unit tests (`src/**/*.test.ts` and `netlify/**/*.test.ts`) with
// Node's built-in test runner. `*.dom.test.ts` files get a jsdom page first
// (scripts/test-dom.mjs), for tests that mount React hooks.
// esbuild (already a Vite dependency) bundles each test so the app's path
// aliases and `import.meta.env` resolve outside Vite; packages stay external
// and load from node_modules, except react-use (see below).
import { build } from 'esbuild'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, rmSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const root = fileURLToPath(new URL('..', import.meta.url))
const outdir = join(root, 'node_modules/.cache/scout-tests')

// react-use's CommonJS build doesn't expose its hooks as named exports that
// Node 20 and 22 can import from an ES module, so tests bundle its ES build,
// the one Vite uses.
const reactUseEsm = {
  name: 'react-use-esm',
  setup(build) {
    const manifest = require.resolve('react-use/package.json')
    const entry = join(dirname(manifest), require(manifest).module)
    build.onResolve({ filter: /^react-use$/ }, () => ({ path: entry }))
  },
}

const findTests = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return findTests(path)
    return entry.name.endsWith('.test.ts') ? [path] : []
  })

const entryPoints = ['src', 'netlify']
  .map((dir) => join(root, dir))
  .filter(existsSync)
  .flatMap(findTests)
if (entryPoints.length === 0) {
  console.log('No tests found.')
  process.exit(0)
}

rmSync(outdir, { recursive: true, force: true })
await build({
  plugins: [reactUseEsm],
  entryPoints,
  outdir,
  outbase: root,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  tsconfig: join(root, 'tsconfig.json'),
  logLevel: 'warning',
  define: {
    'import.meta.env': JSON.stringify({
      REACT_APP_DAPPLOOKER_API_KEY: 'test',
      REACT_APP_SUBGRAPH_GNOSIS_ENDPOINT: 'http://localhost/graphql',
      REACT_APP_SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT:
        'http://localhost/graphql',
    }),
  },
})

const bundled = (entry) =>
  join(outdir, relative(root, entry).replace(/\.ts$/, '.mjs'))
const isDom = (entry) => entry.endsWith('.dom.test.ts')
const runs = [
  [[], entryPoints.filter((entry) => !isDom(entry))],
  [['--import', join(root, 'scripts/test-dom.mjs')], entryPoints.filter(isDom)],
]
let failed = false
for (const [flags, entries] of runs) {
  if (entries.length === 0) continue
  const { status } = spawnSync(
    process.execPath,
    [...flags, '--test', ...entries.map(bundled)],
    { stdio: 'inherit', cwd: root },
  )
  failed ||= status !== 0
}
process.exit(failed ? 1 : 0)
