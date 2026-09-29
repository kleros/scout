/**
 * Mounts a hook in a React root, the way a component in the app would, for
 * tests that need effects, timers and queries to run. Only for
 * `*.dom.test.ts` files, which run on a jsdom page (scripts/test-dom.mjs).
 * Test-only; the app never imports this.
 */
import { act, createElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { notifyManager } from '@tanstack/react-query'

// React Query hands results to components on a zero timeout, which a test's
// fake clock would hold back.
notifyManager.setScheduler(queueMicrotask)

export const renderHook = async <T>(
  hook: () => T,
  wrap: (children: ReactNode) => ReactNode = (children) => children,
) => {
  if (typeof document === 'undefined')
    throw new Error('Name the test file *.dom.test.ts so it runs on a page.')
  const result = { current: undefined as T }
  const Probe = () => {
    result.current = hook()
    return null
  }
  const root = createRoot(document.createElement('div'))
  await act(async () => root.render(wrap(createElement(Probe))))
  return { result, unmount: () => act(async () => root.unmount()) }
}

/** Lets pending promises, queries and React updates settle. */
export const settle = () =>
  act(async () => {
    await new Promise((resolve) => setImmediate(resolve))
  })
