import { afterEach, it } from 'node:test'
import assert from 'node:assert/strict'
import { act, createElement } from 'react'
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

// Chains answer that USDC is deployed with 6 decimals.
const mockNetwork = () => {
  globalThis.fetch = (async (_: string | URL, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null
    const answer = (call: { id: number; method: string }) => ({
      jsonrpc: '2.0',
      id: call.id,
      result:
        call.method === 'eth_getCode'
          ? '0x6080'
          : `0x${(6).toString(16).padStart(64, '0')}`,
    })
    return new Response(
      JSON.stringify(Array.isArray(body) ? body.map(answer) : answer(body)),
    )
  }) as typeof fetch
}

const tokenDraft = (logo: File): SubmissionDraft => ({
  registry: 'tokens',
  values: {
    Address: 'eip155:1:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    Name: 'USD Coin',
    Symbol: 'USDC',
    Decimals: '6',
    Logo: '',
    Website: 'https://www.circle.com',
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
      (children) =>
        createElement(QueryClientProvider, { client: queryClient }, children),
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
