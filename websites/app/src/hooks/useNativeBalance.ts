import { useEffect } from 'react'
import { useAccount, useBalance, useBlockNumber } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'

/**
 * Returns the connected wallet's native balance, kept fresh by invalidating
 * the underlying query on every new block (wagmi v2 dropped the `watch` flag
 * on data hooks, so this is the documented replacement).
 */
export default function useNativeBalance() {
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const { data: blockNumber } = useBlockNumber({ watch: true })
  const { data, queryKey, refetch } = useBalance({ address })

  useEffect(() => {
    if (!address) return
    queryClient.invalidateQueries({ queryKey })
  }, [blockNumber, queryKey, queryClient, address])

  return { balance: data?.value, refetch }
}
