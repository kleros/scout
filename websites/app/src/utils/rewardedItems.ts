import { chains } from 'utils/chains'
import { revRegistryMap, getItemAddress, getChainId } from 'utils/items'
import { RewardedEntry } from 'hooks/useCurateRewards'

// Registry labels used in the curate-rewards snapshots -> app registry keys
const SNAPSHOT_REGISTRY_KEYS: Record<string, string> = {
  'Address Tags': 'single-tags',
  'Kleros Tokens': 'tokens',
  Domains: 'cdn',
  atq: 'tags-queries',
}

// Snapshot chain names are free-form ("Base" vs "Base Mainnet", "Arbitrum" vs
// "Arbitrum One"), so both sides are compared with suffixes stripped
const normalizeChainName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/\s+(mainnet|one|c-chain)$/, '')
    .trim()

/**
 * Total reward (in wei) the snapshots attribute to this specific item, summed
 * over the recipient's itemized entries. An entry matches when its tagAddress
 * equals the item's address and neither registry nor chain contradicts it.
 */
export const getItemRewardTotal = (
  item: { registryAddress: string; props?: Array<{ label: string; value: string }>; key0?: string },
  entries?: RewardedEntry[],
): bigint => {
  if (!entries?.length) return 0n
  const registryKey = revRegistryMap[item.registryAddress]
  const itemAddress = (getItemAddress(item, registryKey) ?? '').split(':').pop()?.toLowerCase()
  if (!itemAddress) return 0n
  const itemChain = normalizeChainName(chains.find((c) => c.id === getChainId(item))?.name ?? '')

  let total = 0n
  for (const entry of entries) {
    if (entry.tagAddress.toLowerCase() !== itemAddress) continue
    const entryRegistryKey = SNAPSHOT_REGISTRY_KEYS[entry.registry]
    if (entryRegistryKey && registryKey && entryRegistryKey !== registryKey) continue
    const entryChain = normalizeChainName(entry.chainName)
    if (entryChain && itemChain && entryChain !== itemChain) continue
    try {
      total += BigInt(entry.amountWei)
    } catch {
      // skip malformed amounts
    }
  }
  return total
}
