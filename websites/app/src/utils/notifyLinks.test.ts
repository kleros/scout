import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { sitePath } from './sitePath'

const ORIGIN = 'https://scout.test'

describe('links in notifications (the bell)', () => {
  it('keeps the path of this site, on any of its hosts', () => {
    assert.equal(
      sitePath('https://scout-app.kleros.io/tokens/0xab?tab=evidence', ORIGIN),
      '/tokens/0xab?tab=evidence',
    )
    assert.equal(sitePath('/single-tags/0x1#x', ORIGIN), '/single-tags/0x1#x')
  })

  it('never leads to another site', () => {
    // A path starting with // would: there is none.
    for (const url of [
      'https://scout.test//evil.example/x',
      'https://other.test//evil.example/',
      'javascript:alert(1)',
      'data:text/html,hi',
    ])
      assert.equal(sitePath(url, ORIGIN), null, url)
    // Another host's link keeps only its path, on this site.
    assert.equal(sitePath('//evil.example/x', ORIGIN), '/x')
    assert.equal(sitePath('/\\evil.example/x', ORIGIN), '/x')
  })
})

describe('the notification service worker (src/public/notify-sw.js)', () => {
  // The worker as the browser runs it, with fake clients.
  const load = (windows: { url: string }[]) => {
    const listeners: Record<string, (event: unknown) => void> = {}
    const done: Promise<unknown>[] = []
    const actions: string[] = []
    const self = {
      location: { origin: ORIGIN },
      addEventListener: (type: string, fn: (event: unknown) => void) => {
        listeners[type] = fn
      },
      skipWaiting: () => undefined,
      clients: {
        claim: async () => undefined,
        matchAll: async () =>
          windows.map((client) => ({
            ...client,
            focus: async () => actions.push(`focus ${client.url}`),
            navigate: async (url: string) =>
              actions.push(`navigate ${client.url} -> ${url}`),
          })),
        openWindow: async (url: string) => actions.push(`open ${url}`),
      },
      registration: { showNotification: async () => undefined },
    }
    runInNewContext(
      readFileSync(join(process.cwd(), 'src/public/notify-sw.js'), 'utf8'),
      { self, URL },
    )
    const click = async (url: unknown) => {
      listeners.notificationclick({
        notification: { close: () => undefined, data: { url } },
        waitUntil: (promise: Promise<unknown>) => done.push(promise),
      })
      await Promise.all(done)
    }
    return { click, actions }
  }

  it('brings forward a tab already on the page, and never navigates another', async () => {
    const page = `${ORIGIN}/tokens/0xab?tab=evidence`
    const onIt = load([{ url: `${ORIGIN}/tokens/submit` }, { url: page }])
    await onIt.click('https://scout-app.kleros.io/tokens/0xab?tab=evidence')
    assert.deepEqual(onIt.actions, [`focus ${page}`])
    // A tab with a half-filled form stays as it is; the page opens in a new one.
    const elsewhere = load([{ url: `${ORIGIN}/tokens/submit` }])
    await elsewhere.click(page)
    assert.deepEqual(elsewhere.actions, [`open ${page}`])
  })

  it('opens only pages of this site', async () => {
    for (const [url, opens] of [
      ['https://scout.test//evil.example/x', '/'],
      ['https://other.test//evil.example/', '/'],
      ['javascript:alert(1)', '/'],
      ['data:text/html,hi', '/'],
      [undefined, '/'],
      // Another host's link keeps only its path, on this site.
      ['/\\evil.example/x', '/x'],
    ]) {
      const { click, actions } = load([])
      await click(url)
      assert.deepEqual(actions, [`open ${ORIGIN}${opens}`], String(url))
    }
  })
})
