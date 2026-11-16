import { it } from 'node:test'
import assert from 'node:assert/strict'
import { act, createElement, useState, type ContextType } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, settle } from '../test/renderHook'
import type { IndexedItem } from '../utils/cases/indexer'
import {
  AttentionSources,
  useAttention,
  useRefetchOnChange,
  type AttentionOptions,
} from './useAttention'

const REGISTRY = '0x66260c69d03837016d88c9877e61e08ef74c59f2'
const ITEM_ID = `0x${'ab'.repeat(32)}`
const SUBMITTER = `0x${'aa'.repeat(20)}`
const CHALLENGER = `0x${'bb'.repeat(20)}`
const ARBITRATOR = '0x9c1da9a04925bdfdedf0f6421bc7eea8305f9002'

// Challenged, in court, no ruling yet.
const item: IndexedItem = {
  id: `${ITEM_ID}@${REGISTRY}`,
  itemID: ITEM_ID,
  registryAddress: REGISTRY,
  status: 'RegistrationRequested',
  data: '/ipfs/x',
  key0: null,
  key1: null,
  key2: null,
  props: [],
  requests: [
    {
      id: `${ITEM_ID}@${REGISTRY}-0`,
      requestType: 'RegistrationRequested',
      requester: SUBMITTER,
      challenger: CHALLENGER,
      disputed: true,
      disputeID: '1010',
      arbitrator: ARBITRATOR,
      arbitratorExtraData: '0x',
      submissionTime: '1000',
      challengeTime: '2000',
      txHashChallenge: '0xc1',
      creationTx: '0xa1',
      resolved: false,
      resolutionTime: '0',
      disputeOutcome: 'None',
      numberOfRounds: '1',
      evidenceGroup_id: `1@${REGISTRY}`,
      evidenceGroup: null,
      rounds: [],
    },
  ],
}

/** Fake indexer and court that count their reads. */
const fakeSources = () => {
  const reads = { cases: 0, challengePeriods: 0, periods: [] as string[] }
  let period = 'evidence'
  const sources = {
    indexer: {
      openCases: async () => {
        reads.cases += 1
        return [item]
      },
    },
    chain: {
      challengePeriod: async () => {
        reads.challengePeriods += 1
        return 3600
      },
      disputePeriod: async (arbitrator: string, id: string) => {
        reads.periods.push(`${arbitrator}:${id}`)
        return { period, deadline: Math.floor(Date.now() / 1000) + 86_400 }
      },
      appealFunding: async () => {
        throw new Error('not needed')
      },
    },
  } as unknown as ContextType<typeof AttentionSources>
  return {
    sources,
    reads,
    setPeriod: (next: string) => {
      period = next
    },
  }
}

const mount = async <T>(
  hook: () => T,
  sources: ContextType<typeof AttentionSources>,
) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  const view = await renderHook(hook, (children) =>
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(AttentionSources.Provider, { value: sources }, children),
    ),
  )
  return {
    ...view,
    unmount: async () => {
      await view.unmount()
      queryClient.clear()
    },
  }
}

const settled = async () => {
  for (let i = 0; i < 20; i++) await settle()
}

const watch = (address: string | undefined, options?: AttentionOptions) => {
  const { entries, refetch } = useAttention(address, options)
  // What the My Profile badge counts.
  const pressing = entries.filter((e) => e.level !== 'waiting').length
  return { entry: entries[0], pressing, refetch }
}

it('moves a case on when its dispute enters voting, while the page stays open', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const { sources, reads, setPeriod } = fakeSources()
  // The profile panel and the item page banner keep reading.
  const { result, unmount } = await mount(
    () => watch(SUBMITTER, { live: true }),
    sources,
  )
  await settled()
  assert.deepEqual(
    [
      result.current.entry?.kind,
      result.current.entry?.level,
      result.current.pressing,
    ],
    ['challenged', 'action', 1],
  )
  // The court is read from the request's own arbitrator.
  assert.deepEqual(reads.periods, [`${ARBITRATOR}:1010`])

  // Voting starts; nothing about the item itself changes.
  setPeriod('vote')
  await act(async () => t.mock.timers.tick(60_000))
  await settled()
  assert.deepEqual(
    [
      result.current.entry?.kind,
      result.current.entry?.level,
      result.current.pressing,
    ],
    ['dispute', 'waiting', 0],
  )
  assert.equal(reads.periods.length, 2)
  assert.equal(reads.cases, 2)

  // A manual refresh reads the court again too, not only the items.
  setPeriod('evidence')
  await act(async () => {
    await result.current.refetch()
  })
  await settled()
  assert.equal(result.current.entry?.kind, 'challenged')
  assert.equal(reads.periods.length, 3)

  await unmount()
})

it('reads once for the header badge, without polling the shared indexer', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  const { sources, reads } = fakeSources()
  const { result, unmount } = await mount(() => watch(SUBMITTER), sources)
  await settled()
  assert.equal(result.current.pressing, 1)
  assert.deepEqual([reads.cases, reads.periods.length], [1, 1])

  // Minutes pass on the same page: no new reads.
  for (let minute = 0; minute < 10; minute++)
    await act(async () => t.mock.timers.tick(60_000))
  await settled()
  assert.deepEqual([reads.cases, reads.periods.length], [1, 1])

  await unmount()
})

it('reads nothing for a visitor without a wallet', async () => {
  const { sources, reads } = fakeSources()
  const { result, unmount } = await mount(() => watch(undefined), sources)
  await settled()
  assert.equal(result.current.entry, undefined)
  assert.deepEqual(reads, { cases: 0, challengePeriods: 0, periods: [] })
  await unmount()
})

it('refreshes the banner when the page data changes, not when it first loads', async () => {
  let refetches = 0
  const refetch = () => {
    refetches += 1
  }
  const { sources } = fakeSources()
  const { result, unmount } = await mount(() => {
    const [key, setKey] = useState<string | undefined>(undefined)
    useRefetchOnChange(key, refetch)
    return { setKey }
  }, sources)
  // The page's own data loads: no extra read.
  await act(async () => result.current.setKey('round:a'))
  assert.equal(refetches, 0)
  // It changes (say, an appeal got funded): read again, once.
  await act(async () => result.current.setKey('round:b'))
  await act(async () => result.current.setKey('round:b'))
  assert.equal(refetches, 1)
  await unmount()
})
