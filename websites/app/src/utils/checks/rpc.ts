/**
 * Public JSON-RPC endpoints used by the in-browser pre-submission checks.
 *
 * Every endpoint below was probed from a browser origin on 2026-09-25: it
 * answers the CORS preflight, serves the requests below, reports the expected
 * `eth_chainId` and returns Multicall3 bytecode. Endpoints from different
 * operators are listed so a "no bytecode" or decimals verdict can require two
 * independent providers to agree before a submission is blocked.
 * Order matters: earlier endpoints are tried first.
 */
export const PUBLIC_RPC_URLS: Record<number, readonly string[]> = {
  1: ['https://ethereum-rpc.publicnode.com', 'https://eth.drpc.org'],
  10: [
    'https://mainnet.optimism.io',
    'https://optimism-rpc.publicnode.com',
    'https://optimism.drpc.org',
  ],
  25: [
    'https://evm.cronos.org',
    'https://cronos-evm-rpc.publicnode.com',
    'https://cronos.drpc.org',
  ],
  56: [
    'https://bsc-rpc.publicnode.com',
    'https://bsc-dataseed1.bnbchain.org',
    'https://bsc.drpc.org',
  ],
  100: [
    'https://rpc.gnosischain.com',
    'https://gnosis-rpc.publicnode.com',
    'https://rpc.gnosis.gateway.fm',
  ],
  122: ['https://rpc.fuse.io', 'https://fuse.drpc.org'],
  137: ['https://polygon-bor-rpc.publicnode.com', 'https://polygon.drpc.org'],
  146: [
    'https://rpc.soniclabs.com',
    'https://sonic-rpc.publicnode.com',
    'https://sonic.drpc.org',
  ],
  199: ['https://rpc.bt.io', 'https://bittorrent.drpc.org'],
  250: ['https://fantom.drpc.org'],
  288: ['https://mainnet.boba.network', 'https://boba-eth.drpc.org'],
  324: ['https://mainnet.era.zksync.io', 'https://zksync.drpc.org'],
  369: ['https://rpc.pulsechain.com', 'https://pulsechain-rpc.publicnode.com'],
  999: [
    'https://rpc.hyperliquid.xyz/evm',
    'https://hyperliquid.drpc.org',
    'https://hyperliquid-json-rpc.stakely.io',
  ],
  1101: ['https://zkevm-rpc.com', 'https://polygon-zkevm.drpc.org'],
  1111: ['https://api.wemix.com'],
  1284: ['https://moonbeam.drpc.org'],
  1285: ['https://moonriver.drpc.org'],
  4326: ['https://mainnet.megaeth.com/rpc'],
  4663: [
    'https://rpc.mainnet.chain.robinhood.com',
    'https://robinhood-rpc.publicnode.com',
    'https://robinhood.drpc.org',
  ],
  5042: ['https://rpc.mainnet.arc.io', 'https://arc.drpc.org'],
  8453: [
    'https://mainnet.base.org',
    'https://base-rpc.publicnode.com',
    'https://base.drpc.org',
  ],
  42161: [
    'https://arb1.arbitrum.io/rpc',
    'https://arbitrum-one-rpc.publicnode.com',
    'https://arbitrum.drpc.org',
  ],
  42220: [
    'https://forno.celo.org',
    'https://celo-rpc.publicnode.com',
    'https://celo.drpc.org',
  ],
  43114: [
    'https://api.avax.network/ext/bc/C/rpc',
    'https://avalanche-c-chain-rpc.publicnode.com',
    'https://avalanche.drpc.org',
  ],
  59144: [
    'https://rpc.linea.build',
    'https://linea-rpc.publicnode.com',
    'https://linea.drpc.org',
  ],
  81457: [
    'https://rpc.blast.io',
    'https://blast-rpc.publicnode.com',
    'https://blast.drpc.org',
  ],
  534352: [
    'https://rpc.scroll.io',
    'https://scroll-rpc.publicnode.com',
    'https://scroll.drpc.org',
  ],
  1313161554: ['https://mainnet.aurora.dev', 'https://aurora.drpc.org'],
  1666600000: [
    'https://api.harmony.one',
    'https://harmony-0.drpc.org',
    'https://1rpc.io/one',
  ],
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

/** Operator identity: `rpc.drpc.org` and `eth.drpc.org` count as one. */
const operatorOf = (url: string): string =>
  hostOf(url).split('.').slice(-2).join('.')

/** A JSON-RPC error answered by the node itself (as opposed to a transport failure). */
export class RpcError extends Error {
  code?: number
  data?: unknown

  constructor(message: string, code?: number, data?: unknown) {
    super(message)
    this.code = code
    this.data = data
  }
}

export type QuorumRead<T> =
  | { status: 'agreed'; value: T; values: T[]; providers: string[] }
  | { status: 'disagreed'; values: { value: T; provider: string }[] }
  | { status: 'unavailable'; reason: string }

/**
 * Reads the same value from independent providers until `needed` of them
 * (distinct operators) agree. Transport failures move on to the next
 * endpoint; a disagreement between providers is reported as such rather than
 * resolved by majority, so callers can surface it as inconclusive.
 *
 * `read` may throw to signal that a provider could not produce a value.
 */
export const readWithQuorum = async <T>(
  chainId: number,
  read: (url: string) => Promise<T>,
  equals: (a: T, b: T) => boolean = Object.is,
  needed = 2,
): Promise<QuorumRead<T>> => {
  const urls = PUBLIC_RPC_URLS[chainId]
  if (!urls?.length) {
    return {
      status: 'unavailable',
      reason: `No public RPC is configured for chain ${chainId}.`,
    }
  }
  const seenOperators = new Set<string>()
  const answers: { value: T; provider: string }[] = []
  const errors: string[] = []
  // Chains served by a single operator can only ever reach one answer.
  const distinctOperators = new Set(urls.map(operatorOf)).size
  const required = Math.min(needed, distinctOperators)

  for (const url of urls) {
    const operator = operatorOf(url)
    if (seenOperators.has(operator)) continue
    try {
      const value = await read(url)
      seenOperators.add(operator)
      answers.push({ value, provider: hostOf(url) })
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      continue
    }
    if (answers.length >= required) break
  }

  if (answers.length < required) {
    return {
      status: 'unavailable',
      reason: errors.length
        ? `RPC providers did not answer (${errors.slice(0, 2).join('; ')}).`
        : 'RPC providers did not answer.',
    }
  }
  const [first, ...rest] = answers
  if (rest.every((answer) => equals(answer.value, first.value))) {
    return {
      status: 'agreed',
      value: first.value,
      values: answers.map((a) => a.value),
      providers: answers.map((a) => a.provider),
    }
  }
  return { status: 'disagreed', values: answers }
}
