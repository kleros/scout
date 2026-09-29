import { it } from 'node:test'
import assert from 'node:assert/strict'
import { act, createElement, type ContextType } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, settle } from '../test/renderHook'
import type { IndexedItem } from '../utils/cases/indexer'
import { AttentionSources, useAttention } from './useAttention'

const REGISTRY = '0x66260c69d03837016d88c9877e61e08ef74c59f2'
const ITEM_ID = `0x${'ab'.repeat(32)}`
const SUBMITTER = `0x${'aa'.repeat(20)}`
const CHALLENGER = `0x${'bb'.repeat(20)}`

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
      arbitrator: '0x9c1da9a04925bdfdedf0f6421bc7eea8305f9002',
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

it('moves a case on when its dispute enters voting, while the page stays open', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout', 'setInterval', 'Date'] })
  let period = 'evidence'
  let periodReads = 0
  const sources = {
    indexer: {
      involvedItemIds: async () => [item.id],
      items: async () => [item],
    },
    chain: {
      challengePeriod: async () => 3600,
      disputePeriod: async () => {
        periodReads += 1
        return { period, deadline: Math.floor(Date.now() / 1000) + 86_400 }
      },
      appealFunding: async () => {
        throw new Error('not needed')
      },
    },
  } as unknown as ContextType<typeof AttentionSources>
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  })
  const { result, unmount } = await renderHook(
    () => {
      const { entries, refetch } = useAttention(SUBMITTER)
      // What the My Profile badge counts.
      const pressing = entries.filter((e) => e.level !== 'waiting').length
      return { entry: entries[0], pressing, refetch }
    },
    (children) =>
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(AttentionSources.Provider, { value: sources }, children),
      ),
  )
  const settled = async () => {
    for (let i = 0; i < 20; i++) await settle()
  }
  await settled()
  assert.deepEqual(
    [
      result.current.entry?.kind,
      result.current.entry?.level,
      result.current.pressing,
    ],
    ['challenged', 'action', 1],
  )

  // Voting starts; nothing about the item itself changes.
  period = 'vote'
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
  assert.equal(periodReads, 2)

  // A manual refresh reads the court again too, not only the items.
  period = 'evidence'
  await act(async () => {
    await result.current.refetch()
  })
  await settled()
  assert.equal(result.current.entry?.kind, 'challenged')
  assert.equal(periodReads, 3)

  await unmount()
  queryClient.clear()
})
