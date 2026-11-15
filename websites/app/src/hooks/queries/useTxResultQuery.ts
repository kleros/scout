import { useQuery } from '@tanstack/react-query'
import { usePublicClient } from 'wagmi'
import type { Address, PublicClient, TransactionReceipt } from 'viem'
import { decodeFunctionData, decodeEventLog } from 'viem'
import { gnosis } from '@reown/appkit/networks'
import { klerosCurateAbi } from 'hooks/contracts/generated'
import { decodeTxOperation, type DecodedOperation } from 'utils/decodeTxOperation'

export type TxStatus = 'success' | 'reverted'

export interface TxResult {
  hash: `0x${string}`
  from: Address
  /** `to` is `null` for contract-creation txs — we don't expect those here but keep the type honest. */
  to: Address | null
  status: TxStatus
  gasUsed: bigint
  effectiveGasPrice: bigint
  /** Native coin value (xDAI on Gnosis) sent with the tx. */
  value: bigint
  /**
   * What the registry kept of `value`, from its `Contribution` events: the deposit for a submission,
   * removal or challenge, the amount contributed for an appeal. LightGeneralizedTCR sends any excess
   * back in the same transaction. Only set when the tx called the registry directly.
   */
  accepted?: bigint
  blockNumber: bigint
  /** Unix ms timestamp the containing block was mined. */
  confirmedAt: number
  input: `0x${string}`
  operation: DecodedOperation
  /** Challenge period in seconds, only fetched when the operation has one (addItem / removeItem). */
  challengePeriodSeconds?: number
  /** The item this tx relates to. Derived from function args (most ops) or event logs (addItem). */
  itemID?: `0x${string}`
}

/**
 * Pulls the itemID out of a tx that targeted a LightGTCR registry.
 *
 * All state-changing functions except `addItem` take `bytes32 _itemID` as their first argument,
 * so we read it straight from the decoded call data. `addItem` generates a brand-new itemID
 * inside the contract (`keccak256(_item)`), so we read it from the `NewItem` / `RequestSubmitted`
 * event logs instead of re-implementing the hash here.
 */
const extractItemID = (
  receipt: TransactionReceipt,
  input: `0x${string}`,
): `0x${string}` | undefined => {
  try {
    const { functionName, args } = decodeFunctionData({ abi: klerosCurateAbi, data: input })
    if (
      functionName === 'removeItem' ||
      functionName === 'challengeRequest' ||
      functionName === 'submitEvidence' ||
      functionName === 'fundAppeal' ||
      functionName === 'executeRequest'
    ) {
      const first = (args as readonly unknown[] | undefined)?.[0]
      if (typeof first === 'string' && first.startsWith('0x')) return first as `0x${string}`
    }
  } catch {
    // fall through to log decoding
  }

  for (const log of receipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: klerosCurateAbi,
        topics: log.topics,
        data: log.data,
      })
      const itemID = (decoded.args as { _itemID?: unknown } | undefined)?._itemID
      if (typeof itemID === 'string' && itemID.startsWith('0x')) return itemID as `0x${string}`
    } catch {
      // logs from other contracts (e.g. arbitrator) aren't in klerosCurateAbi — skip
    }
  }

  return undefined
}

/** Sum of the `Contribution` amounts the registry at `registry` emitted in this receipt. */
const sumContributions = (
  receipt: TransactionReceipt,
  registry: string,
): bigint | undefined => {
  let total: bigint | undefined
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== registry.toLowerCase()) continue
    try {
      const decoded = decodeEventLog({ abi: klerosCurateAbi, topics: log.topics, data: log.data })
      if (decoded.eventName !== 'Contribution') continue
      const amount = (decoded.args as { _contribution?: unknown })._contribution
      if (typeof amount === 'bigint') total = (total ?? 0n) + amount
    } catch {
      // Another event of the registry, or one we cannot decode: not a contribution.
    }
  }
  return total
}

const fetchTxResult = async (
  publicClient: PublicClient,
  hash: `0x${string}`,
): Promise<TxResult> => {
  const [receipt, tx] = await Promise.all([
    publicClient.getTransactionReceipt({ hash }),
    publicClient.getTransaction({ hash }),
  ])
  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber })

  const operation = decodeTxOperation(tx.input, receipt.to, receipt.logs)
  const itemID = operation.isKnownRegistry ? extractItemID(receipt, tx.input) : undefined
  const accepted =
    operation.isDirectRegistryCall && receipt.to ? sumContributions(receipt, receipt.to) : undefined

  let challengePeriodSeconds: number | undefined
  if (operation.showPeriod && receipt.to) {
    try {
      const period = await publicClient.readContract({
        address: receipt.to,
        abi: klerosCurateAbi,
        functionName: 'challengePeriodDuration',
      })
      challengePeriodSeconds = Number(period)
    } catch (err) {
      // Non-fatal: the UI just hides the period row if unavailable.
      console.warn('Failed to read challengePeriodDuration', err)
    }
  }

  return {
    hash,
    from: receipt.from,
    to: receipt.to,
    status: receipt.status,
    gasUsed: receipt.gasUsed,
    effectiveGasPrice: receipt.effectiveGasPrice,
    value: tx.value,
    accepted,
    blockNumber: receipt.blockNumber,
    confirmedAt: Number(block.timestamp) * 1000,
    input: tx.input,
    operation,
    challengePeriodSeconds,
    itemID,
  }
}

const isValidTxHash = (hash: string | undefined): hash is `0x${string}` =>
  !!hash && /^0x[0-9a-fA-F]{64}$/.test(hash)

const NOT_FOUND_ERRORS = [
  'TransactionReceiptNotFoundError',
  'TransactionNotFoundError',
  'BlockNotFoundError',
]

/**
 * True when Gnosis answered but has no such transaction (or no receipt yet: still pending).
 * Anything else (no answer, timeout, rate limit) is a failure to load, not a wrong hash.
 */
export const isTxNotFoundError = (error: unknown): boolean => {
  let current: unknown = error
  for (let depth = 0; current && depth < 10; depth++) {
    const name = (current as { name?: unknown }).name
    if (typeof name === 'string' && NOT_FOUND_ERRORS.includes(name)) return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/** Thrown when Gnosis Chain gives no answer within one lookup's time budget. */
class TxLookupTimeoutError extends Error {
  constructor() {
    super('Gnosis Chain did not answer in time.')
    this.name = 'TxLookupTimeoutError'
  }
}

// A healthy RPC answers in about a second. Without a budget, an unreachable RPC kept the page
// loading for minutes (the HTTP transport, then the WebSocket fallback, each retry on their own).
const LOOKUP_TIMEOUT_MS = 20_000

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new TxLookupTimeoutError()), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })

export const useTxResultQuery = (hash: string | undefined) => {
  const publicClient = usePublicClient({ chainId: gnosis.id })
  const valid = isValidTxHash(hash)

  return useQuery<TxResult>({
    queryKey: ['tx-result', hash?.toLowerCase()],
    queryFn: () =>
      withTimeout(fetchTxResult(publicClient as PublicClient, hash as `0x${string}`), LOOKUP_TIMEOUT_MS),
    enabled: valid && !!publicClient,
    // Confirmed tx details don't change — cache aggressively.
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    // "Not found" is retried for freshly-submitted txs, whose receipt may lag a few seconds on the
    // RPC. A failure to answer is not: the transports already retried it, so it is reported (with
    // Try again) instead of keeping the page loading.
    retry: (failureCount, error) => isTxNotFoundError(error) && failureCount < 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
  })
}

export const isTxHashValid = isValidTxHash
