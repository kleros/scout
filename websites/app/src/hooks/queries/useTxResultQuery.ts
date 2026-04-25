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
  /** Native coin value (xDAI on Gnosis) paid with the tx — this is the deposit for payable calls. */
  value: bigint
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

const fetchTxResult = async (
  publicClient: PublicClient,
  hash: `0x${string}`,
): Promise<TxResult> => {
  const [receipt, tx] = await Promise.all([
    publicClient.getTransactionReceipt({ hash }),
    publicClient.getTransaction({ hash }),
  ])
  const block = await publicClient.getBlock({ blockNumber: receipt.blockNumber })

  const operation = decodeTxOperation(tx.input, receipt.to)
  const itemID = operation.isKnownRegistry ? extractItemID(receipt, tx.input) : undefined

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

export const useTxResultQuery = (hash: string | undefined) => {
  const publicClient = usePublicClient({ chainId: gnosis.id })
  const valid = isValidTxHash(hash)

  return useQuery<TxResult>({
    queryKey: ['tx-result', hash?.toLowerCase()],
    queryFn: () => fetchTxResult(publicClient as PublicClient, hash as `0x${string}`),
    enabled: valid && !!publicClient,
    // Confirmed tx details don't change — cache aggressively.
    staleTime: Infinity,
    gcTime: 5 * 60 * 1000,
    // Retry for freshly-submitted txs where the receipt may lag a few seconds on the RPC.
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15000),
  })
}

export const isTxHashValid = isValidTxHash
