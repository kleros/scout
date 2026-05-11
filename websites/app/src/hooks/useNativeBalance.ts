import { useAccount, useBalance, useWatchBlockNumber } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'

// useBalance has no `watch` option in wagmi v2; refresh on each new block.
export default function useNativeBalance() {
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const { data, queryKey } = useBalance({ address })

  useWatchBlockNumber({
    enabled: Boolean(address),
    onBlockNumber: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { balance: data?.value }
}
