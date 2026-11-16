/**
 * Public JSON-RPC endpoints used by the in-browser pre-submission checks.
 *
 * Every endpoint below was last probed on 2026-11-16: it answers the CORS
 * preflight, serves batched `eth_getCode` and a plain `eth_call`, reports the
 * expected `eth_chainId` and returns Multicall3 bytecode. Endpoints from
 * different operators are listed so a "no bytecode" or decimals verdict can
 * require two independent providers to agree before a submission is blocked;
 * a chain with a single working operator (Fantom, Moonbeam, Polygon zkEVM)
 * can only warn. Polygon zkEVM's own endpoint answers intermittently (the
 * network is being retired), and Blast and Harmony are left out: none of
 * their public endpoints served these calls.
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
  // fantom.drpc.org no longer serves eth_call, and no other public operator
  // answered reliably (1rpc.io, OnFinality). Both nodes are the Fantom
  // Foundation's, so they count as one operator; the second is a fallback.
  250: ['https://rpcapi.fantom.network', 'https://rpc.fantom.network'],
  288: ['https://mainnet.boba.network', 'https://boba-eth.drpc.org'],
  324: ['https://mainnet.era.zksync.io', 'https://zksync.drpc.org'],
  369: ['https://rpc.pulsechain.com', 'https://pulsechain-rpc.publicnode.com'],
  999: [
    'https://rpc.hyperliquid.xyz/evm',
    'https://hyperliquid.drpc.org',
    'https://hyperliquid-json-rpc.stakely.io',
  ],
  // polygon-zkevm.drpc.org fails most calls on its free plan.
  1101: ['https://zkevm-rpc.com'],
  1111: ['https://api.wemix.com', 'https://wemix.drpc.org'],
  // moonbeam.drpc.org has no eth_getCode or eth_call.
  1284: ['https://moonbeam.api.onfinality.io/public'],
  1285: [
    'https://moonriver.drpc.org',
    'https://moonriver.api.onfinality.io/public',
  ],
  4326: ['https://mainnet.megaeth.com/rpc', 'https://megaeth.drpc.org'],
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
  534352: [
    'https://rpc.scroll.io',
    'https://scroll-rpc.publicnode.com',
    'https://scroll.drpc.org',
  ],
  1313161554: ['https://mainnet.aurora.dev', 'https://aurora.drpc.org'],
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

export interface QuorumOptions<T> {
  equals?: (a: T, b: T) => boolean
  /** Distinct operators that must answer (fewer when the chain has fewer). */
  needed?: number
  /** The caller's cancellation, which `read` should also honour. */
  signal?: AbortSignal
}

/**
 * Reads the same value from independent providers until `needed` of them
 * (distinct operators) agree. Transport failures move on to the next
 * endpoint; a disagreement between providers is reported as such rather than
 * resolved by majority, so callers can surface it as inconclusive.
 *
 * `read` may throw to signal that a provider could not produce a value.
 * Cancelling `signal` rejects with its reason instead: a cancelled read says
 * nothing about the providers, so it must not come back as "unavailable".
 */
export const readWithQuorum = async <T>(
  chainId: number,
  read: (url: string) => Promise<T>,
  { equals = Object.is, needed = 2, signal }: QuorumOptions<T> = {},
): Promise<QuorumRead<T>> => {
  const throwIfCancelled = (error?: unknown) => {
    if (signal?.aborted) throw signal.reason ?? error
  }
  throwIfCancelled()
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
      throwIfCancelled()
      seenOperators.add(operator)
      answers.push({ value, provider: hostOf(url) })
    } catch (error) {
      throwIfCancelled(error)
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
