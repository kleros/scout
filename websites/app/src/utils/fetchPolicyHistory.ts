import { JsonRpcProvider, AbiCoder, Log, id as ethersId } from 'ethers'
import { KLEROS_CDN_BASE, GNOSIS_RPC_URL } from 'consts/index'

export interface PolicyHistoryEntry {
  startDate: string
  endDate: string | null
  policyURI: string
  txHash: string
}

const META_EVIDENCE_TOPIC = ethersId('MetaEvidence(uint256,string)')

// Earliest deployment block across all registries (CDN deployed ~Jan 2023)
const EARLIEST_BLOCK = 25_800_000

// Max block range per getLogs call (Gnosis public RPC limit)
const CHUNK_SIZE = 100_000

/**
 * Fetches event logs in chunks to avoid RPC block range limits.
 */
const getLogsChunked = async (
  provider: JsonRpcProvider,
  address: string,
  topics: string[],
  fromBlock: number,
  toBlock: number
): Promise<Log[]> => {
  const allLogs: Log[] = []

  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = Math.min(start + CHUNK_SIZE - 1, toBlock)
    const logs = await provider.getLogs({ address, topics, fromBlock: start, toBlock: end })
    allLogs.push(...logs)
  }

  return allLogs
}

/**
 * Fetches the full registration policy history for a registry by reading
 * MetaEvidence event logs from the Gnosis chain RPC.
 *
 * Registration policies use odd-numbered _metaEvidenceID values (1, 3, 5, ...).
 * Clearing policies use even-numbered ones and are filtered out.
 */
export const fetchPolicyHistory = async (
  registryAddress: string
): Promise<PolicyHistoryEntry[]> => {
  const provider = new JsonRpcProvider(GNOSIS_RPC_URL, 100)

  const latestBlock = await provider.getBlockNumber()

  // Fetch all MetaEvidence event logs in chunks
  const logs = await getLogsChunked(
    provider,
    registryAddress,
    [META_EVIDENCE_TOPIC],
    EARLIEST_BLOCK,
    latestBlock
  )

  // Filter for registration policies (odd _metaEvidenceID)
  const registrationLogs = logs.filter((log) => {
    const metaEvidenceID = BigInt(log.topics[1])
    return metaEvidenceID % 2n === 1n
  })

  if (registrationLogs.length === 0) return []

  // Fetch block timestamps in parallel
  const blockTimestamps = new Map<number, number>()
  const uniqueBlocks = [...new Set(registrationLogs.map((l) => l.blockNumber))]

  await Promise.all(
    uniqueBlocks.map(async (blockNum) => {
      const block = await provider.getBlock(blockNum)
      if (block) blockTimestamps.set(blockNum, block.timestamp)
    })
  )

  // Fetch IPFS MetaEvidence JSONs in parallel to extract fileURI
  const abiCoder = AbiCoder.defaultAbiCoder()

  const ipfsResults = await Promise.all(
    registrationLogs.map(async (log) => {
      try {
        const decoded = abiCoder.decode(['string'], log.data)
        const metaEvidenceURI: string = decoded[0]

        const response = await fetch(`${KLEROS_CDN_BASE}${metaEvidenceURI}`)
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        const json = await response.json()

        const fileURI = typeof json.fileURI === 'string' && json.fileURI.startsWith('/ipfs/')
          ? json.fileURI
          : undefined

        return {
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          fileURI,
        }
      } catch (e) {
        console.error(`Failed to fetch MetaEvidence for tx ${log.transactionHash}:`, e)
        return {
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          fileURI: undefined,
        }
      }
    })
  )

  // Build policy history entries — only skip entries with no timestamp,
  // but keep entries with failed IPFS fetches (show them with missing URI)
  const entries: PolicyHistoryEntry[] = []

  for (let i = 0; i < ipfsResults.length; i++) {
    const result = ipfsResults[i]
    const timestamp = blockTimestamps.get(result.blockNumber)
    if (!timestamp) continue
    if (!result.fileURI) continue

    const startDate = new Date(timestamp * 1000).toISOString()

    // endDate = timestamp of the next valid entry, or null if last
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
