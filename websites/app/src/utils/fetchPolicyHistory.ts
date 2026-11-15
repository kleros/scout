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
 * fan log-fetch chunks across providers without overloading any single
 * endpoint's rate limit. (gnosis-mainnet.public.blastapi.io was removed:
 * Blast API shut down and answers every call with HTTP 403.)
 */
const GNOSIS_RPC_URLS = [GNOSIS_RPC_URL, 'https://rpc.gnosis.gateway.fm']

/**
 * The chain is known, so skip ethers' network detection: without `staticNetwork`
 * a provider whose endpoint is down retries detection every second for ever.
 */
const createProvider = (url: string) =>
  new JsonRpcProvider(url, 100, { staticNetwork: true })

// Hard timeout for reading a MetaEvidence JSON file from IPFS.
const METAEVIDENCE_TIMEOUT_MS = 15_000

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
  // A request abandoned after the timeout may still fail later; that is not an unhandled rejection.
  p.catch(() => undefined)
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

const abiCoder = AbiCoder.defaultAbiCoder()

/**
 * Reads the policy file a registration MetaEvidence log points to (the `fileURI` of its JSON).
 *
 * Returns undefined when the log can never yield a policy (undecodable data, a URI outside IPFS,
 * a file the gateway reports missing, invalid JSON, no usable `fileURI`): such logs are skipped.
 * Throws when IPFS did not answer (network error, timeout, 5xx, 408, 429), so a temporary
 * outage ends in an error the user can retry, instead of a history with silent gaps (or an
 * empty one) that would then be cached for a day.
 */
const fetchPolicyFileURI = async (log: Log): Promise<string | undefined> => {
  let metaEvidenceURI: string
  try {
    metaEvidenceURI = abiCoder.decode(['string'], log.data)[0]
  } catch {
    return undefined
  }
  if (typeof metaEvidenceURI !== 'string' || !metaEvidenceURI.startsWith('/ipfs/')) {
    return undefined
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), METAEVIDENCE_TIMEOUT_MS)
  try {
    const response = await fetch(`${KLEROS_CDN_BASE}${metaEvidenceURI}`, {
      signal: controller.signal,
    })
    if (!response.ok) {
      const temporary =
        response.status >= 500 || response.status === 408 || response.status === 429
      if (temporary) throw new Error(`IPFS gateway answered HTTP ${response.status}`)
      return undefined
    }
    let json: { fileURI?: unknown }
    try {
      json = await response.json()
    } catch (error) {
      if (error instanceof SyntaxError) return undefined
      throw error
    }
    return typeof json?.fileURI === 'string' && json.fileURI.startsWith('/ipfs/')
      ? json.fileURI
      : undefined
  } finally {
    clearTimeout(timer)
  }
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

// Newest first: by block, then by position in the block.
const newestFirst = (a: Log, b: Log): number =>
  b.blockNumber - a.blockNumber || b.index - a.index

/**
 * Backward scan from chain head in exponentially growing windows, for the
 * current policy only. A registration event that re-registers the file
 * already in force is not a policy change (the full history merges such
 * events, see buildEntries), so the scan continues past them until it meets
 * an event with a different policy file, and dates the current policy from
 * the earliest event of that unchanged run. That keeps the "updated X ago"
 * badge in agreement with the history modal. Usually a handful of windows
 * and IPFS reads. Used by 'latest' mode.
 */
const fetchCurrentPolicy = async (
  providers: JsonRpcProvider[],
  address: string,
  deployBlock: number,
  latestBlock: number,
): Promise<PolicyHistoryEntry[]> => {
  let toBlock = latestBlock
  let windowSize = BACKWARD_SCAN_INITIAL_WINDOW
  let currentFile: string | undefined
  // The oldest event (so far) that registered the current file.
  let earliest: Log | undefined

  const toEntry = async (): Promise<PolicyHistoryEntry[]> => {
    if (!earliest || !currentFile) return []
    const block = await providers[0].getBlock(earliest.blockNumber)
    if (!block) throw new Error(`Block ${earliest.blockNumber} not found`)
    return [
      {
        startDate: new Date(block.timestamp * 1000).toISOString(),
        endDate: null,
        policyURI: currentFile,
        txHash: earliest.transactionHash,
      },
    ]
  }

  for (let i = 0; i < BACKWARD_SCAN_MAX_ITERATIONS; i++) {
    const fromBlock = Math.max(deployBlock, toBlock - windowSize + 1)

    const logs = await getLogsWithFallback(
      providers,
      0,
      address,
      fromBlock,
      toBlock,
    )
    const registrationLogs = logs.filter(isRegistrationLog).sort(newestFirst)

    for (const log of registrationLogs) {
      const fileURI = await fetchPolicyFileURI(log)
      // Same rule as the full history: an event without a usable policy file is skipped.
      if (!fileURI) continue
      if (currentFile === undefined) currentFile = fileURI
      // The previous real change: the current policy started with the run after it.
      else if (fileURI !== currentFile) return toEntry()
      earliest = log
    }

    if (fromBlock <= deployBlock) break

    toBlock = fromBlock - 1
    windowSize *= 2
  }

  return toEntry()
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

  // Throws if IPFS does not answer for one of them (see fetchPolicyFileURI).
  const ipfsResults = await Promise.all(
    logs.map(async (log) => ({
      txHash: log.transactionHash,
      blockNumber: log.blockNumber,
      fileURI: await fetchPolicyFileURI(log),
    })),
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

  // Merge consecutive entries that share the same policyURI. These are
  // re-registrations of identical content (a governance act that re-affirmed
  // the existing policy without changing it). Surfacing them as separate rows
  // is misleading: each row would point to the same IPFS file, and clicking
  // one in the history modal looks like a no-op to the user. Collapse them
  // into one continuous active period, keeping the earliest startDate/txHash
  // (the original registration) and extending endDate to the next real change.
  const deduped: PolicyHistoryEntry[] = []
  for (const entry of entries) {
    const prev = deduped[deduped.length - 1]
    if (prev && prev.policyURI === entry.policyURI) {
      prev.endDate = entry.endDate
    } else {
      deduped.push({ ...entry })
    }
  }

  return deduped
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
 *   - `'latest'`: scans backward from the chain head to the last real policy
 *     change. Returns a single-entry array with the current active policy,
 *     dated as in the full history. A few seconds at most.
 */
export const fetchPolicyHistory = async (
  registryAddress: string,
  mode: PolicyFetchMode = 'full',
): Promise<PolicyHistoryEntry[]> => {
  const providers = GNOSIS_RPC_URLS.map(createProvider)
  const deployBlock =
    REGISTRY_START_BLOCKS[registryAddress] ?? DEFAULT_START_BLOCK
  const latestBlock = await providers[0].getBlockNumber()

  if (mode === 'latest') {
    return fetchCurrentPolicy(
      providers,
      registryAddress,
      deployBlock,
      latestBlock,
    )
  }

  const logs = await fetchAllRegistrationLogs(
    providers,
    registryAddress,
    deployBlock,
    latestBlock,
  )

  return buildEntries(providers[0], logs)
}
