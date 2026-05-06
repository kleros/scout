import { JsonRpcProvider, AbiCoder, Log, id as ethersId } from 'ethers'
import { KLEROS_CDN_BASE, GNOSIS_RPC_URL } from 'consts/index'
import { registries } from 'consts/contracts'

export interface PolicyHistoryEntry {
  startDate: string
  endDate: string | null
  policyURI: string
  txHash: string
}

export type PolicyFetchMode = 'full' | 'latest'

const META_EVIDENCE_TOPIC = ethersId('MetaEvidence(uint256,string)')

// Build address → deploymentBlock lookup from the single source of truth
const REGISTRY_START_BLOCKS: Record<string, number> = Object.fromEntries(
  Object.values(registries).map((r) => [r.address, r.deploymentBlock]),
)

const DEFAULT_START_BLOCK = 25_800_000

// Max block range per getLogs call (Gnosis public RPC limit).
const CHUNK_SIZE = 100_000

/**
 * Public Gnosis RPC endpoints used to parallelize the 'full' scan.
 * The first entry is primary — used for one-off calls (getBlockNumber,
 * getBlock) and the 'latest' backward scan. Additional entries let us
 * fan log-fetch chunks across providers, roughly tripling throughput
 * without overloading any single endpoint's rate limit.
 */
const GNOSIS_RPC_URLS = [
  GNOSIS_RPC_URL,
  'https://rpc.gnosis.gateway.fm',
  'https://gnosis-mainnet.public.blastapi.io',
]

// Concurrency budget per provider — matches the single-provider limit the
// original implementation ran at safely. Total budget is this × providers.
const MAX_CONCURRENT_PER_PROVIDER = 3

// Hard timeout per getLogs request. If a provider stalls beyond this, we
// abandon it and try the next one — so one slow RPC doesn't hold up the
// whole scan.
const GET_LOGS_TIMEOUT_MS = 12_000

// Backward-scan window for 'latest' mode. Doubles each iteration until a hit
// is found or the deployment block is reached.
const BACKWARD_SCAN_INITIAL_WINDOW = 100_000
const BACKWARD_SCAN_MAX_ITERATIONS = 20

// Registration policies use odd _metaEvidenceID values (1, 3, 5, ...).
// Even values are clearing policies — filter those out.
const isRegistrationLog = (log: Log): boolean =>
  BigInt(log.topics[1]) % 2n === 1n

const withTimeout = <T>(p: Promise<T>, ms: number, label: string): Promise<T> => {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    )
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Fetches a single chunk with per-provider fallback. Tries the preferred
 * provider first; on timeout or RPC error, falls through to the next
 * provider. Only throws if every provider in the pool fails.
 */
const getLogsWithFallback = async (
  providers: JsonRpcProvider[],
  preferredIdx: number,
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<Log[]> => {
  const order = [
    preferredIdx,
    ...providers.map((_, i) => i).filter((i) => i !== preferredIdx),
  ]

  let lastError: unknown
  for (const idx of order) {
    try {
      return await withTimeout(
        providers[idx].getLogs({
          address,
          topics: [META_EVIDENCE_TOPIC],
          fromBlock,
          toBlock,
        }),
        GET_LOGS_TIMEOUT_MS,
        `getLogs[${idx}] ${fromBlock}-${toBlock}`,
      )
    } catch (e) {
      lastError = e
    }
  }
  throw lastError ?? new Error('All RPC providers failed')
}

/**
 * Forward scan from deployment block to chain head, fanning chunks across
 * multiple RPC providers in parallel. Each provider handles up to
 * MAX_CONCURRENT_PER_PROVIDER in-flight chunks; total in-flight = pool × budget.
 * Used by 'full' mode to produce the complete policy timeline.
 */
const fetchAllRegistrationLogs = async (
  providers: JsonRpcProvider[],
  address: string,
  fromBlock: number,
  toBlock: number,
): Promise<Log[]> => {
  const ranges: [number, number][] = []
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    ranges.push([start, Math.min(start + CHUNK_SIZE - 1, toBlock)])
  }

  const batchSize = providers.length * MAX_CONCURRENT_PER_PROVIDER
  const allLogs: Log[] = []

  for (let i = 0; i < ranges.length; i += batchSize) {
    const batch = ranges.slice(i, i + batchSize)
    const batchResults = await Promise.all(
      batch.map(([start, end], batchIdx) =>
        // Round-robin chunks across providers so each provider gets an even
        // share of MAX_CONCURRENT_PER_PROVIDER in-flight requests.
        getLogsWithFallback(
          providers,
          (i + batchIdx) % providers.length,
          address,
          start,
          end,
        ),
      ),
    )
    for (const logs of batchResults) allLogs.push(...logs)
  }

  return allLogs.filter(isRegistrationLog)
}

/**
 * Backward scan from chain head in exponentially growing windows. Stops as
 * soon as a registration event is found — typically 1-2 windows (<2s) on
 * Gnosis since most policies have been updated within the last few months.
 * Used by 'latest' mode to avoid scanning the full history when the badge
 * only needs the newest entry.
 */
const fetchLatestRegistrationLog = async (
  providers: JsonRpcProvider[],
  address: string,
  deployBlock: number,
  latestBlock: number,
): Promise<Log[]> => {
  let toBlock = latestBlock
  let windowSize = BACKWARD_SCAN_INITIAL_WINDOW

  for (let i = 0; i < BACKWARD_SCAN_MAX_ITERATIONS; i++) {
    const fromBlock = Math.max(deployBlock, toBlock - windowSize + 1)

    const logs = await getLogsWithFallback(
      providers,
      0,
      address,
      fromBlock,
      toBlock,
    )
    const registrationLogs = logs.filter(isRegistrationLog)

    if (registrationLogs.length > 0) {
      const latest = registrationLogs.reduce((a, b) =>
        a.blockNumber > b.blockNumber ? a : b,
      )
      return [latest]
    }

    if (fromBlock <= deployBlock) return []

    toBlock = fromBlock - 1
    windowSize *= 2
  }

  return []
}

/**
 * Hydrates a set of MetaEvidence registration logs with block timestamps and
 * IPFS policy URIs, then links them into `PolicyHistoryEntry` records where
 * each entry's `endDate` is the `startDate` of the next valid entry.
 *
 * Expects `logs` to be in block-ascending order.
 */
const buildEntries = async (
  provider: JsonRpcProvider,
  logs: Log[],
): Promise<PolicyHistoryEntry[]> => {
  if (logs.length === 0) return []

  const blockTimestamps = new Map<number, number>()
  const uniqueBlocks = [...new Set(logs.map((l) => l.blockNumber))]
  await Promise.all(
    uniqueBlocks.map(async (blockNum) => {
      const block = await provider.getBlock(blockNum)
      if (block) blockTimestamps.set(blockNum, block.timestamp)
    }),
  )

  const abiCoder = AbiCoder.defaultAbiCoder()
  const ipfsResults = await Promise.all(
    logs.map(async (log) => {
      try {
        const decoded = abiCoder.decode(['string'], log.data)
        const metaEvidenceURI: string = decoded[0]
        const response = await fetch(`${KLEROS_CDN_BASE}${metaEvidenceURI}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json = await response.json()
        const fileURI =
          typeof json.fileURI === 'string' && json.fileURI.startsWith('/ipfs/')
            ? json.fileURI
            : undefined
        return {
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          fileURI,
        }
      } catch {
        return {
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          fileURI: undefined,
        }
      }
    }),
  )

  const entries: PolicyHistoryEntry[] = []
  for (let i = 0; i < ipfsResults.length; i++) {
    const result = ipfsResults[i]
    const timestamp = blockTimestamps.get(result.blockNumber)
    if (!timestamp) continue
    if (!result.fileURI) continue

    const startDate = new Date(timestamp * 1000).toISOString()

    let endDate: string | null = null
    for (let j = i + 1; j < ipfsResults.length; j++) {
      const nextTimestamp = blockTimestamps.get(ipfsResults[j].blockNumber)
      if (nextTimestamp && ipfsResults[j].fileURI) {
        endDate = new Date(nextTimestamp * 1000).toISOString()
        break
      }
    }

    entries.push({
      startDate,
      endDate,
      policyURI: result.fileURI,
      txHash: result.txHash,
    })
  }

  return entries
}

/**
 * Fetches the registration-policy history for a registry by reading
 * MetaEvidence events from Gnosis chain RPC endpoints.
 *
 * @param mode
 *   - `'full'` (default): scans forward from deployment block across multiple
 *     RPC endpoints in parallel, returns every registration policy the
 *     registry has ever had, chained by date ranges. ~3-8s typical (was
 *     8-24s pre-parallelization). Necessary for the "Previous Policies"
 *     timeline.
 *   - `'latest'`: scans backward from the chain head, stops at the first
 *     registration event. Returns a single-entry array with the current
 *     active policy. ~1-2s typical.
 */
export const fetchPolicyHistory = async (
  registryAddress: string,
  mode: PolicyFetchMode = 'full',
): Promise<PolicyHistoryEntry[]> => {
  const providers = GNOSIS_RPC_URLS.map((url) => new JsonRpcProvider(url, 100))
  const deployBlock =
    REGISTRY_START_BLOCKS[registryAddress] ?? DEFAULT_START_BLOCK
  const latestBlock = await providers[0].getBlockNumber()

  const logs =
    mode === 'latest'
      ? await fetchLatestRegistrationLog(
          providers,
          registryAddress,
          deployBlock,
          latestBlock,
        )
      : await fetchAllRegistrationLogs(
          providers,
          registryAddress,
          deployBlock,
          latestBlock,
        )

  return buildEntries(providers[0], logs)
}
