import { afterEach, it } from 'node:test'
import assert from 'node:assert/strict'
import { act, createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, settle } from '../test/renderHook'
import { decodePng, logoFile } from '../utils/checks/logoFixtures'
import type { SubmissionDraft } from '../utils/checks'
import { useSubmissionChecks } from './useSubmissionChecks'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
  Object.assign(globalThis, { createImageBitmap: undefined })
})

const provide = (client: QueryClient) => (children: ReactNode) =>
  createElement(QueryClientProvider, { client }, children)

/** Lets queries, effects and (real) module loading finish, up to a few seconds. */
const settleWhile = async (busy: () => boolean) => {
  const until = Date.now() + 10_000
  while (busy() && Date.now() < until) await settle()
}

// Chains answer that the address holds `code` and a token with `decimals`
// decimals. With a `gate`, answers wait for it unless cancelled first.
// Returns the request bodies, in order.
const mockNetwork = ({
  code = () => '0x6080',
  decimals = 6,
  gate,
}: {
  code?: () => string
  decimals?: number
  gate?: Promise<void>
} = {}) => {
  const asked: string[] = []
  globalThis.fetch = (async (_: string | URL, init?: RequestInit) => {
    asked.push(String(init?.body))
    if (gate) {
      await new Promise<void>((resolve, reject) => {
        const signal = init?.signal
        if (signal?.aborted) reject(signal.reason)
        signal?.addEventListener('abort', () => reject(signal.reason))
        gate.then(resolve)
      })
    }
    const body = init?.body ? JSON.parse(String(init.body)) : null
    const answer = (call: { id: number; method: string }) => ({
      jsonrpc: '2.0',
      id: call.id,
      result:
        call.method === 'eth_getCode'
          ? code()
          : `0x${decimals.toString(16).padStart(64, '0')}`,
    })
    return new Response(
      JSON.stringify(Array.isArray(body) ? body.map(answer) : answer(body)),
    )
  }) as typeof fetch
  return asked
}

const tokenDraft = (
  logo: File,
  values: Record<string, string> = {},
): SubmissionDraft => ({
  registry: 'tokens',
  values: {
    Address: 'eip155:1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    Name: 'USD Coin',
    Symbol: 'USDC',
    Decimals: '6',
    Logo: '',
    Website: 'https://www.circle.com',
    ...values,
  },
  files: { Logo: logo },
})

it('keeps the submit button disabled while the logo cannot be decoded', async (t) => {
  mockNetwork()
  Object.assign(globalThis, { createImageBitmap: decodePng })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const cases: [string, File, boolean][] = [
    ['decodable logo', logoFile(128, 128), false],
    ['no pixel data', logoFile(128, 128, { idat: null }), true],
    [
      'corrupt pixel data',
      logoFile(128, 128, { idat: new Uint8Array(9) }),
      true,
    ],
  ]
  for (const [name, logo, blocked] of cases) {
    const draft = tokenDraft(logo)
    const queryClient = new QueryClient()
    // The registry has no entry for this token (the indexer isn't mocked).
    queryClient.setQueryData(
      ['submission-checks', 'duplicates', 'tokens', draft.values.Address],
      [],
    )
    const { result, unmount } = await renderHook(
      () => useSubmissionChecks(draft),
      provide(queryClient),
    )
    // The checks run once the input has been still for 600 ms.
    await act(async () => t.mock.timers.tick(600))
    for (let i = 0; i < 100 && result.current.checking; i++) await settle()
    // The form disables submission while `checking` or `blocking`.
    assert.equal(result.current.checking, false, name)
    assert.equal(result.current.blocking, blocked, name)
    await unmount()
    queryClient.clear()
  }
})

it('checks Decimals typed while the address is still being read', async (t) => {
  let open!: () => void
  mockNetwork({ decimals: 0, gate: new Promise((resolve) => (open = resolve)) })
  Object.assign(globalThis, { createImageBitmap: decodePng })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  // SingularDTV (0 decimals), an address no other test reads.
  let draft = tokenDraft(logoFile(128, 128), {
    Address: 'eip155:1:0xaeC2E87E0A235266D9C5ADc9DEb4b2E29b54D009',
    Decimals: '',
  })
  const queryClient = new QueryClient()
  queryClient.setQueryData(
    ['submission-checks', 'duplicates', 'tokens', draft.values.Address],
    [],
  )
  const { result, rerender, unmount } = await renderHook(
    () => useSubmissionChecks(draft),
    provide(queryClient),
  )
  // The address is being read and the providers haven't answered...
  await act(async () => t.mock.timers.tick(600))
  // ...when Decimals is typed, and settles.
  draft = { ...draft, values: { ...draft.values, Decimals: '7' } }
  await rerender()
  await act(async () => t.mock.timers.tick(600))
  open()
  await settleWhile(() => result.current.checking)
  const decimals = result.current.results.find(
    (r) => r.id === 'tokens.decimals-onchain',
  )
  assert.deepEqual([decimals?.outcome, decimals?.fix], ['fail', '0'])
  assert.equal(result.current.blocking, true)
  await unmount()
  queryClient.clear()
})

it('offers "Check again" for a failed network check, and does not keep the failure fresh', async (t) => {
  let code = '0x'
  const asked = mockNetwork({ code: () => code })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const address = 'eip155:1:0x7a250d5630b4cf539739df2c5dacb4c659f2488d'
  const draft: SubmissionDraft = {
    registry: 'single-tags',
    values: {
      'Contract Address': address,
      'Public Name Tag': 'Router 2',
      'Project Name': 'Uniswap',
      'UI/Website Link': 'https://app.uniswap.org',
      'Public Note': 'The router contract of Uniswap V2',
    },
  }
  const queryClient = new QueryClient()
  queryClient.setQueryData(
    ['submission-checks', 'duplicates', 'single-tags', address],
    [],
  )
  const mount = () =>
    renderHook(() => useSubmissionChecks(draft), provide(queryClient))

  let view = await mount()
  await settleWhile(() => view.result.current.checking)
  // No code: two providers agree, so this blocks.
  assert.equal(view.result.current.blocking, true)
  assert.equal(typeof view.result.current.retry, 'function')

  // A failure is re-read when it is needed again (here: the form reopens).
  const reads = asked.length
  await view.unmount()
  view = await mount()
  await settleWhile(() => view.result.current.checking)
  assert.ok(asked.length > reads, 'read again')

  // The contract gets deployed: "Check again" picks it up, no edit needed.
  code = '0x6080'
  await act(async () => view.result.current.retry?.())
  await settleWhile(
    () => view.result.current.checking || view.result.current.blocking,
  )
  assert.equal(view.result.current.blocking, false)
  assert.equal(view.result.current.retry, undefined)

  // A passing answer stays fresh: reopening doesn't read it again.
  const passingReads = asked.length
  await view.unmount()
  view = await mount()
  await settleWhile(() => view.result.current.checking)
  assert.equal(asked.length, passingReads)
  await view.unmount()
  queryClient.clear()
})

it('asks GitHub only for 7+ character commits, after a longer pause, and about a repository once', async (t) => {
  await import('typescript-5') // loaded once here, so the check below finishes quickly
  const github: string[] = []
  globalThis.fetch = (async (input: string | URL) => {
    const url = String(input)
    github.push(url)
    if (url.startsWith('https://raw.githubusercontent.com/'))
      return new Response(
        'export async function returnTags(chainId: string, apiKey: string) { return []; }\n',
      )
    if (url.includes('/commits/')) return new Response('c'.repeat(40))
    return new Response(JSON.stringify({ name: 'my-module' }))
  }) as typeof fetch
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const repository = 'https://github.com/owner/my-module'
  const values = (commit: string) => ({
    'Github Repository URL': repository,
    'Commit hash': commit,
    'EVM Chain ID': '1',
    Description: 'x',
  })
  const queryClient = new QueryClient()
  for (const commit of ['abc12', 'abc1234', 'abc5678'])
    queryClient.setQueryData(
      [
        'submission-checks',
        'duplicates',
        'tags-queries',
        repository,
        commit,
        '1',
      ],
      [],
    )
  let draft: SubmissionDraft = {
    registry: 'tags-queries',
    values: values('abc12'),
  }
  const { result, rerender, unmount } = await renderHook(
    () => useSubmissionChecks(draft),
    provide(queryClient),
  )
  const api = () =>
    github.filter((url) => url.startsWith('https://api.github.com/'))

  await act(async () => t.mock.timers.tick(2_000))
  assert.equal(github.length, 0, 'a 5-character hash is not looked up')
  assert.ok(result.current.results.some((r) => r.id === 'atq.commit-length'))

  draft = { ...draft, values: values('abc1234') }
  await rerender()
  await act(async () => t.mock.timers.tick(600))
  await settle()
  assert.equal(github.length, 0, 'not after the usual 600 ms pause')
  assert.equal(result.current.checking, true)
  await act(async () => t.mock.timers.tick(900))
  await settleWhile(() => result.current.checking)
  assert.equal(api().length, 2, 'the repository and the commit')
  assert.equal(result.current.blocking, false)

  draft = { ...draft, values: values('abc5678') }
  await rerender()
  await act(async () => t.mock.timers.tick(600))
  await act(async () => t.mock.timers.tick(900))
  await settleWhile(() => result.current.checking)
  assert.deepEqual(
    api().map((url) =>
      url.replace(`https://api.github.com/repos/owner/my-module`, ''),
    ),
    ['', '/commits/abc1234', '/commits/abc5678'],
  )
  await unmount()
  queryClient.clear()
})
