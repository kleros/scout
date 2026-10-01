import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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

// Items and court periods are both read again every minute while shown: a
// dispute moves from evidence to voting without any change to its item.
const REFRESH_MS = 60_000

/** Unix seconds, refreshed every `every` ms so deadlines move on screen. */
export const useNow = (every = 30_000) => {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000))
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), every)
    return () => clearInterval(id)
  }, [every])
  return now
}

const useChallengePeriods = () => {
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
    staleTime: Infinity,
    retry: 2,
  })
}

/**
 * Everything `address` has at stake in open requests, most pressing first,
 * from the current state of the registries and the court. Refreshes every
 * minute.
 */
export const useAttention = (address: string | undefined) => {
  const { indexer, chain } = useContext(AttentionSources)
  const queryClient = useQueryClient()
  const key = address?.toLowerCase()
  const periods = useChallengePeriods()
  const items = useQuery({
    queryKey: ['attention', 'items', key],
    queryFn: async () =>
      indexer.items(await indexer.involvedItemIds(key as string)),
    enabled: Boolean(key),
    staleTime: 30_000,
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: true,
    retry: 1,
  })
  // Court periods of disputes still before a ruling (evidence vs voting).
  const disputeIds = useMemo(
    () => [
      ...new Set(
        (items.data ?? []).flatMap((item) => {
          const request = item.requests.at(-1)
          if (!request?.disputed || request.resolved) return []
          const round = currentRound(request)
          return !round || round.appealPeriodStart === '0' || round.appealed
            ? [request.disputeID]
            : []
        }),
      ),
    ],
    [items.data],
  )
  const disputePeriods = useQueries({
    queries: disputeIds.map((id) => ({
      queryKey: ['attention', 'dispute-period', id],
      queryFn: () => chain.disputePeriod(id),
      staleTime: 30_000,
      refetchInterval: REFRESH_MS,
      retry: 1,
    })),
  })
  const periodOf = disputePeriods.map((q) => q.data?.period)
  const periodKey = periodOf.join()
  const now = useNow()
  const seen = useSeenEvidence(key)
  const entries = useMemo(
    () =>
      key && items.data
        ? withEvidence(
            attentionFor(
              items.data,
              key,
              now,
              (registry) => periods.data?.[registry.toLowerCase()],
              (id) => periodOf[disputeIds.indexOf(id)],
            ),
            key,
            (itemId) => seen[itemId.toLowerCase()] ?? 0,
          )
        : [],
    // periodOf is a fresh array each render; periodKey tracks its content.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, items.data, now, periods.data, periodKey, disputeIds, seen],
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
        entry.request.disputeID,
        entry.request.arbitratorExtraData,
      ),
    enabled: Boolean(entry.required),
    staleTime: 5 * 60_000,
    retry: 1,
  })
}

/** The court period of the entry's dispute and when it can end. */
export const useDisputePeriod = (entry: Attention) => {
  const { chain } = useContext(AttentionSources)
  return useQuery({
    queryKey: ['attention', 'dispute-period', entry.request.disputeID],
    queryFn: () => chain.disputePeriod(entry.request.disputeID),
    enabled:
      entry.request.disputed &&
      (entry.kind === 'challenged' || entry.kind === 'dispute'),
    staleTime: 30_000,
    refetchInterval: REFRESH_MS,
    retry: 1,
  })
}
