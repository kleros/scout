import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readEnv } from './env'

describe('configuration', () => {
  const base = {
    NOTIFY_SESSION_SECRET: 'x'.repeat(40),
    NOTIFY_SITE_URL: 'https://scout.test',
    NOTIFY_INDEXER_URL: 'https://indexer.test/graphql',
  }

  it('needs its own database URL, never a generic one', () => {
    for (const generic of [
      { NETLIFY_DATABASE_URL: 'postgres://netlify' },
      { DATABASE_URL: 'postgres://other' },
    ])
      assert.throws(
        () => readEnv({ ...base, ...generic }),
        /Missing: NOTIFY_DATABASE_URL\./,
      )
    assert.equal(
      readEnv({ ...base, NOTIFY_DATABASE_URL: 'postgres://notify' })
        .databaseUrl,
      'postgres://notify',
    )
  })
})

describe('deploy (scripts/notify-prune.mjs, the last step of the Netlify build)', () => {
  // The tests run from the app's folder (scripts/test.mjs).
  const script = join(process.cwd(), 'scripts/notify-prune.mjs')
  const run = (dir: string, flag?: string) => {
    const env = { ...process.env }
    delete env.NOTIFY_ENABLED
    if (flag !== undefined) env.NOTIFY_ENABLED = flag
    return spawnSync(process.execPath, [script, dir], { env, encoding: 'utf8' })
  }
  const functionsDir = (t: { after: (fn: () => void) => void }) => {
    const dir = mkdtempSync(join(tmpdir(), 'scout-notify-prune-'))
    t.after(() => rmSync(dir, { recursive: true, force: true }))
    for (const name of [
      'notify-api.mts',
      'notify-deliver.mts',
      'notify-watcher.mts',
      'other.mts',
    ])
      writeFileSync(join(dir, name), '')
    return dir
  }
  const files = (dir: string) => readdirSync(dir).sort()

  it('removes the notification functions unless NOTIFY_ENABLED is "true"', (t) => {
    for (const flag of [undefined, '', 'false', '1', 'TRUE']) {
      const dir = functionsDir(t)
      const result = run(dir, flag)
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(files(dir), ['other.mts'], String(flag))
      assert.match(result.stdout, /removed notify-api\.mts, notify-deliver\.mts, notify-watcher\.mts/)
    }
  })

  it('leaves them in place with NOTIFY_ENABLED=true', (t) => {
    const dir = functionsDir(t)
    const result = run(dir, 'true')
    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(files(dir), [
      'notify-api.mts',
      'notify-deliver.mts',
      'notify-watcher.mts',
      'other.mts',
    ])
  })

  it('is fine with nothing to remove, and fails loudly on a real error', (t) => {
    const dir = functionsDir(t)
    assert.equal(run(join(dir, 'missing')).status, 0)
    // A file where the functions folder should be.
    const broken = run(join(dir, 'other.mts'))
    assert.notEqual(broken.status, 0)
    assert.match(broken.stderr, /Could not remove the notification functions/)
  })
})
