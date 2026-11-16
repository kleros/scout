import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { onTxConfirmed } from 'utils/txEvents'

/*
 * After the user's own transaction is confirmed, the data it can change is read again a few times
 * while the indexer catches up (usually seconds, sometimes a minute or two), so a submission, a
 * challenge, a piece of evidence or a contribution shows up without a reload. Queries on screen
 * refetch; matching queries not on screen are marked stale and reload when next shown.
 */
const REFRESHED = new Set([
  'itemDetails',
  'items',
  'itemCounts',
  'pendingItems',
  'resolvedItems',
  'disputes',
  'refetchOnBlock',
  'appealCost',
  'balance',
])

const DELAYS_MS = [2_000, 5_000, 10_000, 20_000, 35_000, 60_000, 90_000, 120_000]

const RefreshAfterTransactions: React.FC = () => {
  const queryClient = useQueryClient()

  useEffect(() => {
    let timers: ReturnType<typeof setTimeout>[] = []
    const clear = () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers = []
    }
    const refresh = () => {
      queryClient.invalidateQueries({
        predicate: (query) => REFRESHED.has(String(query.queryKey[0])),
        refetchType: 'active',
      })
    }
    const unsubscribe = onTxConfirmed(() => {
      clear()
      timers = DELAYS_MS.map((ms) => setTimeout(refresh, ms))
    })
    return () => {
      unsubscribe()
      clear()
    }
  }, [queryClient])

  return null
}

export default RefreshAfterTransactions
