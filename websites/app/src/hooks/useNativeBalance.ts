import { useAccount, useBalance } from 'wagmi'
import { DEFAULT_CHAIN } from 'consts/chains'

/**
 * The connected wallet's xDAI balance on Gnosis, where Scout's deposits are paid, whatever
 * network the wallet is currently on (comparing a deposit with an ETH balance would be wrong).
 *
 * Read every 30 seconds while the tab is visible, again when the user comes back to the tab (from
 * a wallet or a bridge, for example), and after the user's own confirmed transaction (see
 * components/RefreshAfterTransactions). Watching every block cost about 40 requests a minute and
 * kept going in background tabs.
 */
export default function useNativeBalance() {
  const { address } = useAccount()
  const { data } = useBalance({
    address,
    chainId: DEFAULT_CHAIN,
    query: {
      enabled: Boolean(address),
      refetchInterval: 30_000,
      refetchOnWindowFocus: true,
    },
  })

  return { balance: data?.value }
}
