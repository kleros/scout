import { afterEach, it } from 'node:test'
import assert from 'node:assert/strict'
import { StrictMode, act, createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, settle } from '../test/renderHook'
import { usePayoutAcceptance } from './usePayoutAcceptance'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

const provide = (client: QueryClient) => (children: ReactNode) =>
  createElement(QueryClientProvider, { client }, children)

const settleWhile = async (busy: () => boolean) => {
  const until = Date.now() + 10_000
  while (busy() && Date.now() < until) await settle()
}

const CDN_REGISTRY = '0x957a53a994860be4750810131d9c876b2f52d6e1'

/**
 * Gnosis RPCs answering the simulated 2300-gas payout with `answer` (an
 * Error is an RPC error). With a `gate`, answers wait for it unless their
 * request is cancelled first. Returns the transactions asked about.
 */
const mockGnosis = ({
  answer,
  gate,
}: {
  answer: () => string | Error
  gate?: Promise<void>
}) => {
  const asked: Record<string, string>[] = []
  globalThis.fetch = (async (_: string | URL, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    asked.push(body.params[0])
    if (gate) {
      await new Promise<void>((resolve, reject) => {
        const signal = init?.signal
        if (signal?.aborted) reject(signal.reason)
        signal?.addEventListener('abort', () => reject(signal.reason))
        gate.then(resolve)
      })
    }
    const result = answer()
    return new Response(
      JSON.stringify(
        result instanceof Error
          ? {
              jsonrpc: '2.0',
              id: body.id,
              error: { code: -32000, message: result.message },
            }
          : { jsonrpc: '2.0', id: body.id, result },
      ),
    )
  }) as typeof fetch
  return asked
}

it('warns about a wallet that cannot receive even when the first probe was cancelled', async () => {
  let open!: () => void
  const asked = mockGnosis({
    answer: () => new Error('out of gas: gas required exceeds: 23300'),
    gate: new Promise((resolve) => (open = resolve)),
  })
  const safe = `0x${'a5'.repeat(20)}`
  const queryClient = new QueryClient()
  // StrictMode mounts, unmounts and remounts every component in development,
  // which cancels the first probe while the providers haven't answered yet
  // (as leaving and reopening a page with the warning can in production).
  const { result, unmount } = await renderHook(
    () => usePayoutAcceptance(safe, CDN_REGISTRY),
    (children) =>
      createElement(StrictMode, null, provide(queryClient)(children)),
  )
  open()
  await settleWhile(() => result.current.data === undefined)
  assert.equal(result.current.data, 'rejects')
  // The probe pays from the registry the caller named.
  assert.ok(asked.length > 0)
  for (const tx of asked) assert.equal(tx.from, CDN_REGISTRY)
  await unmount()
  queryClient.clear()
})

it('retries when the providers give no answer, and then shows nothing', async (t) => {
  const asked = mockGnosis({ answer: () => new Error('rate limit exceeded') })
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const queryClient = new QueryClient()
  const { result, unmount } = await renderHook(
    () => usePayoutAcceptance(`0x${'b6'.repeat(20)}`, CDN_REGISTRY),
    provide(queryClient),
  )
  await settleWhile(() => result.current.failureCount < 1)
  const firstAttempt = asked.length
  await act(async () => t.mock.timers.tick(1_000)) // React Query's retry delay
  await settleWhile(() => !result.current.isError)
  assert.ok(asked.length > firstAttempt, 'asked again')
  assert.equal(result.current.isError, true)
  assert.equal(result.current.data, undefined, 'no answer, so no warning')
  await unmount()
  queryClient.clear()
})
