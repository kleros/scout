import { useQuery } from '@tanstack/react-query'
import { isAddress } from 'viem'
import { readPayoutAcceptance } from 'utils/checks/evm'
import { registryMap } from 'utils/items'

export type PayoutAcceptance = 'receives' | 'rejects'

/**
 * Whether `address` can receive what Light Curate pays out (deposit refunds,
 * rulings, appeal rewards). Those go out with `.send`, which gives the
 * recipient 2300 gas: plain wallets always accept it, many contract wallets
 * (e.g. a Safe) cannot, and then the xDAI stays in the registry for good.
 *
 * `registry` is the one that pays (the simulated transfer comes from it).
 * Only the wallet's current code is tested: a smart account that is not
 * deployed yet has none, so it passes until it is.
 *
 * When the providers don't agree or don't answer, the query fails (and is
 * retried) rather than caching an "unknown" answer; if it keeps failing,
 * `data` stays undefined and nothing is shown.
 */
export const usePayoutAcceptance = (
  address: string | undefined,
  registry: string = registryMap.tokens,
) =>
  useQuery({
    queryKey: [
      'payout-acceptance',
      registry.toLowerCase(),
      address?.toLowerCase(),
    ],
    queryFn: async ({ signal }): Promise<PayoutAcceptance> => {
      const read = await readPayoutAcceptance(
        registry,
        address as string,
        signal,
      )
      if (read.status !== 'agreed')
        throw new Error(
          read.status === 'disagreed'
            ? 'RPC providers disagree about this wallet.'
            : read.reason,
        )
      return read.value ? 'receives' : 'rejects'
    },
    enabled: Boolean(address && isAddress(address)),
    staleTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  })
