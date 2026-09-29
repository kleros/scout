import { chains } from '../chains'
import { registryKeyOf, type IndexedItem } from './indexer'

type ItemLike = Pick<
  IndexedItem,
  'itemID' | 'registryAddress' | 'key0' | 'key1' | 'key2' | 'props'
>

const REGISTRY_NOUN: Record<string, string> = {
  tokens: 'token',
  cdn: 'contract domain',
  'single-tags': 'address tag',
  'tags-queries': 'tags query module',
}

const prop = (item: ItemLike, label: string) =>
  item.props?.find((p) => p.label === label)?.value?.trim() ?? ''

const chainNameOf = (caip: string) => {
  const [namespace, reference] = caip.split(':')
  return (
    chains.find((c) => c.namespace === namespace && c.id === reference)?.name ??
    (reference ? `chain ${reference}` : '')
  )
}

const shortAddress = (caip: string) => {
  const account = caip.split(':').pop() ?? ''
  return account.length > 14
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : account
}

const truncate = (value: string, max = 60) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value

// Titles the Curate UI and bots use as labels rather than content.
export const GENERIC_EVIDENCE_TITLE =
  /^(challenge|removal|request)?\s*(justification|reason|evidence)s?$/i

/** Short human reference for an item, e.g. "USD Coin (USDC) on Ethereum Mainnet". */
export const itemLabel = (item: ItemLike): string => {
  const registry = registryKeyOf(item.registryAddress)
  let label = ''
  if (registry === 'tokens') {
    const name = prop(item, 'Name')
    const symbol = prop(item, 'Symbol')
    const address = prop(item, 'Address') || item.key0 || ''
    label = [
      name && symbol && name !== symbol
        ? `${name} (${symbol})`
        : name || symbol,
      address && `on ${chainNameOf(address)}`,
    ]
      .filter(Boolean)
      .join(' ')
  } else if (registry === 'cdn') {
    const domain = prop(item, 'Domain name') || item.key1 || ''
    const address = prop(item, 'Contract address') || item.key0 || ''
    label = [
      domain,
      address && `→ ${shortAddress(address)} on ${chainNameOf(address)}`,
    ]
      .filter(Boolean)
      .join(' ')
  } else if (registry === 'single-tags') {
    const tag = prop(item, 'Public Name Tag') || prop(item, 'Project Name')
    const address = prop(item, 'Contract Address') || item.key0 || ''
    label = [
      tag && `“${tag}”`,
      address && `(${shortAddress(address)} on ${chainNameOf(address)})`,
    ]
      .filter(Boolean)
      .join(' ')
  } else if (registry === 'tags-queries') {
    const repo =
      prop(item, 'Github Repository URL')
        .replace(/\.git$/i, '')
        .split('/')
        .filter(Boolean)
        .pop() ?? ''
    const chainId = prop(item, 'EVM Chain ID')
    label = [repo, chainId && `for chain ${chainId}`].filter(Boolean).join(' ')
  }
  return truncate(label || `item ${item.itemID.slice(0, 10)}…`, 90)
}

export const itemNoun = (item: Pick<ItemLike, 'registryAddress'>) =>
  REGISTRY_NOUN[registryKeyOf(item.registryAddress) ?? ''] ?? 'item'

export const xdai = (wei: bigint) => {
  const value = Number(wei) / 1e18
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2).replace(/\.?0+$/, '')} xDAI`
}
