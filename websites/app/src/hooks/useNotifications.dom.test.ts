import { it, type TestContext } from 'node:test'
import assert from 'node:assert/strict'
import { act, createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, settle } from '../test/renderHook'
import { useNotifyActions, useTelegramLink } from './useNotifications'

const ACCOUNT = `0x${'aa'.repeat(20)}`
const LINK = 'https://t.me/scout_bot?start=test-link-code-0123456789'

/** The notification service, with one signed-in account and a Telegram bot. */
const service = () => {
  const state = { connected: false, profileReads: 0 }
  const json = (body: unknown) =>
    new Response(JSON.stringify(body), {
      headers: { 'Content-Type': 'application/json' },
    })
  const fetch = async (input: string | URL | Request, init?: RequestInit) => {
    const path = String(input)
    const method = init?.method ?? 'GET'
    if (path === '/api/notify/config')
      return json({
        channels: { email: false, telegram: { bot: 'scout_bot' }, push: null },
        maxWatchedAddresses: 10,
      })
    if (path === '/api/notify/me') {
      state.profileReads += 1
      return json({
        signedIn: true,
        address: ACCOUNT,
        telegram: { connected: state.connected, username: null },
      })
    }
    if (path === '/api/notify/me/telegram' && method === 'POST')
      return json({ url: LINK })
    throw new Error(`Unexpected request: ${method} ${path}`)
  }
  return { state, fetch }
}

const mount = async (t: TestContext) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const { state, fetch } = service()
  t.mock.method(globalThis, 'fetch', fetch)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  const { result, unmount } = await renderHook(
    () => useTelegramLink(),
    (children) =>
      createElement(QueryClientProvider, { client: queryClient }, children),
  )
  const settled = async () => {
    for (let i = 0; i < 20; i++) await settle()
  }
  await settled()
  const done = async () => {
    await unmount()
    queryClient.clear()
  }
  return { result, state, settled, done }
}

it('shows Telegram as connected once the bot confirms, without a reload', async (t) => {
  const { result, state, settled, done } = await mount(t)
  let url = ''
  await act(async () => {
    url = await result.current.start()
  })
  await settled()
  assert.equal(url, LINK)
  // What to send the bot where the link can't open the app (Telegram Web).
  assert.equal(result.current.command, '/start test-link-code-0123456789')

  // Start is pressed in Telegram; the settings learn it on the next read.
  state.connected = true
  const reads = state.profileReads
  await act(async () => t.mock.timers.tick(3_000))
  await settled()
  assert.equal(state.profileReads, reads + 1)
  assert.equal(result.current.command, null)

  // Connected: the profile is no longer polled.
  await act(async () => t.mock.timers.tick(60_000))
  await settled()
  assert.equal(state.profileReads, reads + 1)
  await done()
})

it('stops waiting once the link has expired unused', async (t) => {
  const { result, state, settled, done } = await mount(t)
  await act(async () => {
    await result.current.start()
  })
  await settled()
  await act(async () => t.mock.timers.tick(15 * 60 * 1000))
  await settled()
  assert.equal(result.current.command, null)
  const reads = state.profileReads
  await act(async () => t.mock.timers.tick(60_000))
  await settled()
  assert.equal(state.profileReads, reads)
  await done()
})

/** A browser with push on: the notification worker registered, one subscription. */
const browserWithPush = (t: TestContext) => {
  const steps: string[] = []
  let registered = true
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/this-browser',
    unsubscribe: async () => {
      steps.push('unsubscribe')
      return true
    },
  }
  const registration = {
    active: { scriptURL: 'https://scout.test/notify-sw.js' },
    pushManager: {
      getSubscription: async () => (registered ? subscription : null),
    },
    unregister: async () => {
      steps.push('unregister')
      registered = false
      return true
    },
  }
  const serviceWorker = {
    getRegistration: async () => (registered ? registration : undefined),
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    value: serviceWorker,
    configurable: true,
  })
  Object.assign(window, { PushManager: class {}, Notification: class {} })
  t.after(() => {
    delete (navigator as { serviceWorker?: unknown }).serviceWorker
    delete (window as { PushManager?: unknown }).PushManager
    delete (window as { Notification?: unknown }).Notification
  })
  return steps
}

it('turns push off in this browser on sign-out, delete and turn-off', async (t) => {
  for (const action of ['signOut', 'deleteAccount', 'disablePush'] as const) {
    const steps = browserWithPush(t)
    const requests: string[] = []
    t.mock.method(
      globalThis,
      'fetch',
      async (input: string | URL | Request, init?: RequestInit) => {
        requests.push(`${init?.method ?? 'GET'} ${String(input)}`)
        steps.push('server')
        return new Response('{"ok":true}', {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    )
    // No garbage-collection timers, which would keep the test process running.
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { gcTime: Infinity, retry: false },
        mutations: { gcTime: Infinity },
      },
    })
    queryClient.setQueryData(['notify', 'me'], {
      signedIn: true,
      address: ACCOUNT,
    })
    const { result, unmount } = await renderHook(
      () => useNotifyActions(),
      (children) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
    )
    await act(async () => {
      await result.current[action].mutateAsync()
    })
    assert.deepEqual(
      requests,
      {
        signOut: ['DELETE /api/notify/me/push', 'POST /api/notify/auth/logout'],
        deleteAccount: ['DELETE /api/notify/me'],
        disablePush: ['DELETE /api/notify/me/push'],
      }[action],
      action,
    )
    // The browser drops the subscription and the worker once the server
    // has forgotten it (or the account is gone), before signing out.
    assert.deepEqual(
      steps,
      action === 'signOut'
        ? ['server', 'unsubscribe', 'unregister', 'server']
        : ['server', 'unsubscribe', 'unregister'],
      action,
    )
    await unmount()
    queryClient.clear()
    t.mock.restoreAll()
  }
})
