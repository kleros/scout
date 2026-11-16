import { afterEach, it } from 'node:test'
import assert from 'node:assert/strict'
import { markEvidenceSeen, pruneSeen } from './useSeenEvidence'

const VIEWER = `0x${'aa'.repeat(20)}`
const KEY = `scout:evidence-seen:${VIEWER}`
const DAY = 86_400
const now = Math.floor(Date.now() / 1000)

afterEach(() => window.localStorage.clear())

it('drops read marks older than 180 days, but never the one just written', () => {
  assert.deepEqual(
    pruneSeen(
      {
        recent: now - 10 * DAY,
        edge: now - 180 * DAY,
        old: now - 181 * DAY,
        garbage: 'x' as unknown as number,
        written: now - 400 * DAY,
      },
      now,
      'written',
    ),
    { recent: now - 10 * DAY, edge: now - 180 * DAY, written: now - 400 * DAY },
  )
})

it('prunes the stored map whenever it writes to it', () => {
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ 'old@0xr': now - 200 * DAY, 'kept@0xr': now - DAY }),
  )
  markEvidenceSeen(VIEWER, 'New@0xR', now - 60)
  assert.deepEqual(JSON.parse(window.localStorage.getItem(KEY)!), {
    'kept@0xr': now - DAY,
    'new@0xr': now - 60,
  })

  // Nothing newer to record: the map is left as it is.
  markEvidenceSeen(VIEWER, 'new@0xr', now - 120)
  assert.deepEqual(Object.keys(JSON.parse(window.localStorage.getItem(KEY)!)), [
    'kept@0xr',
    'new@0xr',
  ])
})
