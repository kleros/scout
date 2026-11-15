import { useAccount, useBalance, useWatchBlockNumber } from 'wagmi'
import { useQueryClient } from '@tanstack/react-query'
import { DEFAULT_CHAIN } from 'consts/chains'

/**
 * The connected wallet's xDAI balance on Gnosis, where Scout's deposits are paid, whatever
 * network the wallet is currently on (comparing a deposit with an ETH balance would be wrong).
 * useBalance has no `watch` option in wagmi v2; refresh on each new block.
 */
export default function useNativeBalance() {
  const { address } = useAccount()
  const queryClient = useQueryClient()
  const { data, queryKey } = useBalance({ address, chainId: DEFAULT_CHAIN })

  useWatchBlockNumber({
    chainId: DEFAULT_CHAIN,
    enabled: Boolean(address),
    onBlockNumber: () => queryClient.invalidateQueries({ queryKey }),
  })

  return { balance: data?.value }
}
