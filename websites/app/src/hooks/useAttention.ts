import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { SUBGRAPH_GNOSIS_ENDPOINT } from 'consts/index'
import { PUBLIC_RPC_URLS } from 'utils/checks/rpc'
import { useSeenEvidence } from './useSeenEvidence'
// The same case logic the notification service applies, so this view and
// the alerts always agree.
import {
  attentionFor,
  withEvidence,
  type Attention,
} from 'utils/cases/attention'
import { createCaseChain } from 'utils/cases/chain'
import { currentRound } from 'utils/cases/disputes'
import { createCaseIndexer, REGISTRY_ADDRESSES } from 'utils/cases/indexer'

/** Where the attention hooks read registries and the court; tests pass their own. */
export const AttentionSources = createContext({
  indexer: createCaseIndexer(SUBGRAPH_GNOSIS_ENDPOINT),
  chain: createCaseChain([...PUBLIC_RPC_URLS[100]]),
})

/**
 * How often cases are read. The indexer's rate limit is shared by every
 * visitor of Scout and Curate, so only the views that show cases in full
 * (the profile panel, the item page banner) read again every minute: items
 * and court periods both, since a dispute moves from evidence to voting
 * without any change to its item. Elsewhere (the header badge) cases are
 * read once per page load, and again on focus once five minutes old.
 */
const LIVE = { staleTime: 30_000, refetchInterval: 60_000 } as const
const IDLE = { staleTime: 5 * 60_000, refetchInterval: false } as const

export interface AttentionOptions {
  /** Keep reading every minute while shown (see LIVE). */
  live?: boolean
}

/** Unix seconds, refreshed every `every` ms so deadlines move on screen. */
export const useNow = (every = 30_000) => {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), every)
    return () => clearInterval(id)
  }, [every])
  return now
}

/** Challenge periods of the registries, read once, and only for a wallet. */
const useChallengePeriods = (enabled: boolean) => {
  const { chain } = useContext(AttentionSources)
  return useQuery({
    queryKey: ['attention', 'challenge-periods'],
    queryFn: async () =>
      Object.fromEntries(
        await Promise.all(
          REGISTRY_ADDRESSES.map(
            async (registry) =>
              [registry, await chain.challengePeriod(registry)] as const,
          ),
        ),
      ),
    enabled,
    staleTime: Infinity,
    retry: 2,
  })
}

/** Dispute ids are per arbitrator. */
const disputeKey = (arbitrator: string, disputeId: string) =>
  `${arbitrator.toLowerCase()}:${disputeId}`

/**
 * Everything `address` has at stake in open requests, most pressing first,
 * from the current state of the registries and the court. With `live`, it
 * reads again every minute while shown; otherwise once per page load.
 */
export const useAttention = (
  address: string | undefined,
  { live = false }: AttentionOptions = {},
) => {
  const { indexer, chain } = useContext(AttentionSources)
  const queryClient = useQueryClient()
  const key = address?.toLowerCase()
  const timing = live ? LIVE : IDLE
  const periods = useChallengePeriods(Boolean(key))
  const items = useQuery({
    queryKey: ['attention', 'items', key],
    queryFn: () => indexer.openCases(key as string),
    enabled: Boolean(key),
    ...timing,
    refetchOnWindowFocus: true,
    retry: 1,
  })
  // Court periods of disputes still before a ruling (evidence vs voting).
  const disputes = useMemo(() => {
    const byKey = new Map<string, { arbitrator: string; id: string }>()
    for (const item of items.data ?? []) {
      const request = item.requests.at(-1)
      if (!request?.disputed || request.resolved) continue
      const round = currentRound(request)
      if (round && round.appealPeriodStart !== '0' && !round.appealed) continue
      byKey.set(disputeKey(request.arbitrator, request.disputeID), {
        arbitrator: request.arbitrator.toLowerCase(),
        id: request.disputeID,
      })
    }
    return [...byKey.values()]
  }, [items.data])
  const disputePeriods = useQueries({
    queries: disputes.map(({ arbitrator, id }) => ({
      queryKey: ['attention', 'dispute-period', arbitrator, id],
      queryFn: () => chain.disputePeriod(arbitrator, id),
      ...timing,
      retry: 1,
    })),
  })
  const periodOf = disputePeriods.map((q) => q.data?.period)
  const periodKey = periodOf.join()
  const now = useNow()
  const seen = useSeenEvidence(key)
  const entries = useMemo(
    () => {
      const index = new Map(
        disputes.map((d, i) => [disputeKey(d.arbitrator, d.id), i]),
      )
      return key && items.data
        ? withEvidence(
            attentionFor(
              items.data,
              key,
              now,
              (registry) => periods.data?.[registry.toLowerCase()],
              (id, arbitrator) =>
                periodOf[index.get(disputeKey(arbitrator, id)) ?? -1],
            ),
            key,
            (itemId) => seen[itemId.toLowerCase()] ?? 0,
          )
        : []
    },
    // periodOf is a fresh array each render; periodKey tracks its content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, items.data, now, periods.data, periodKey, disputes, seen],
  )
  const refetchItems = items.refetch
  /** Reads the items and their court periods again. */
  const refetch = useCallback(
    () =>
      Promise.all([
        refetchItems(),
        queryClient.refetchQueries({
          queryKey: ['attention', 'dispute-period'],
          type: 'active',
        }),
      ]),
    [refetchItems, queryClient],
  )
  return {
    entries,
    isLoading: items.isLoading,
    error: items.error,
    refetch,
  }
}

/**
 * Calls `refetch` when `key` (some data the page already polls) changes from
 * one value to another: not on mount, nor when the data first loads.
 */
export const useRefetchOnChange = (
  key: string | undefined,
  refetch: () => unknown,
  enabled = true,
) => {
  const last = useRef(key)
  useEffect(() => {
    const previous = last.current
    last.current = key
    if (enabled && previous !== undefined && key !== undefined && key !== previous)
      refetch()
  }, [key, refetch, enabled])
}

/** Total each side must raise in the entry's current appeal round, in wei. */
export const useAppealFunding = (entry: Attention) => {
  const { chain } = useContext(AttentionSources)
  return useQuery({
    queryKey: [
      'attention',
      'appeal-funding',
      entry.request.id,
      currentRound(entry.request)?.id,
    ],
    queryFn: () =>
      chain.appealFunding(
        entry.item.registryAddress,
        entry.request.arbitrator,
        entry.request.disputeID,
        entry.request.arbitratorExtraData,
      ),
    enabled: Boolean(entry.required),
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

/**
 * The court period of the entry's dispute and when it can end. Only cards in
 * the live views (profile panel, item page banner) use it.
 */
export const useDisputePeriod = (entry: Attention) => {
  const { chain } = useContext(AttentionSources)
  const arbitrator = entry.request.arbitrator.toLowerCase()
  return useQuery({
    queryKey: ['attention', 'dispute-period', arbitrator, entry.request.disputeID],
    queryFn: () => chain.disputePeriod(arbitrator, entry.request.disputeID),
    enabled:
      entry.request.disputed &&
      (entry.kind === 'challenged' || entry.kind === 'dispute'),
    ...LIVE,
    retry: 1,
  })
}
