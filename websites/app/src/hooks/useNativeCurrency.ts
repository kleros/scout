import { useChainId } from 'wagmi'

/**
 * Returns the native currency symbol for the current chain
 */
export function useNativeCurrency(): string {
  const chainId = useChainId()

  switch (chainId) {
    case 1: // Ethereum Mainnet
      return 'ETH'
    case 100: // Gnosis Chain
      return 'xDAI'
    case 137: // Polygon
      return 'MATIC'
    case 42161: // Arbitrum One
      return 'ETH'
    case 10: // Optimism
      return 'ETH'
    default:
      return 'xDAI' // Default to xDAI for Gnosis
  }
}

export default useNativeCurrency
