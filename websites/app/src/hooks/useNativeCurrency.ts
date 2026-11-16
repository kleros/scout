/**
 * Returns the symbol of the currency Scout's deposits, bounties and appeal fees are paid in.
 * Every Scout registry lives on Gnosis, so this is xDAI whatever network the wallet is on:
 * showing the wallet's own currency (ETH on Ethereum, for example) would misstate the amounts.
 */
export function useNativeCurrency(): string {
  return 'xDAI'
}

export default useNativeCurrency
