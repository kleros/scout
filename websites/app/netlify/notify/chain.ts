import {
  decodeEventLog,
  parseAbiItem,
  type Address,
  type Hex,
  type Log,
} from 'viem'
import {
  createCaseChain,
  gnosisClient,
  KLEROS_LIQUID,
  PERIODS,
} from '../../src/utils/cases/chain'

export { KLEROS_LIQUID, PERIODS } from '../../src/utils/cases/chain'

const NEW_PERIOD = parseAbiItem(
  'event NewPeriod(uint256 indexed _disputeID, uint8 _period)',
)
const REWARD_WITHDRAWN = parseAbiItem(
  'event RewardWithdrawn(address indexed _beneficiary, bytes32 indexed _itemID, uint256 _request, uint256 _round, uint256 _reward)',
)

export interface PeriodChange {
  key: string
  disputeId: string
  period: (typeof PERIODS)[number]
  blockNumber: number
}

export interface RewardPaid {
  key: string
  beneficiary: string
  registry: string
  itemID: string
  amount: bigint
}

// The public Tenderly endpoint silently returns [] for very large results and
// publicnode caps ranges at 10k blocks, so logs are read in small chunks.
const LOG_CHUNK = 2_000

/** The service's view of Gnosis: the app's dispute reads plus the watcher's blocks and logs. */
export const createChain = (rpcUrls: string[]) => {
  const client = gnosisClient(rpcUrls)

  const chunkedLogs = async <T>(
    fromBlock: number,
    toBlock: number,
    read: (from: bigint, to: bigint) => Promise<T[]>,
  ) => {
    const logs: T[] = []
    for (let start = fromBlock; start <= toBlock; start += LOG_CHUNK) {
      const end = Math.min(toBlock, start + LOG_CHUNK - 1)
      logs.push(...(await read(BigInt(start), BigInt(end))))
    }
    return logs
  }

  return {
    ...createCaseChain(rpcUrls),

    finalizedBlock: async () => {
      const block = await client.getBlock({ blockTag: 'finalized' })
      return {
        number: Number(block.number),
        timestamp: Number(block.timestamp),
      }
    },

    blockAt: async (number: number) => {
      const block = await client.getBlock({ blockNumber: BigInt(number) })
      return { number, timestamp: Number(block.timestamp) }
    },

    periodChanges: async (
      fromBlock: number,
      toBlock: number,
    ): Promise<PeriodChange[]> => {
      const logs = await chunkedLogs(fromBlock, toBlock, (from, to) =>
        client.getLogs({
          address: KLEROS_LIQUID,
          event: NEW_PERIOD,
          fromBlock: from,
          toBlock: to,
        }),
      )
      return logs.map((log) => ({
        key: `${log.transactionHash}:${log.logIndex}`,
        disputeId: String(log.args._disputeID),
        period: PERIODS[Number(log.args._period)] ?? 'evidence',
        blockNumber: Number(log.blockNumber),
      }))
    },

    rewardsPaid: async (
      registries: string[],
      fromBlock: number,
      toBlock: number,
    ): Promise<RewardPaid[]> => {
      const logs = await chunkedLogs(fromBlock, toBlock, (from, to) =>
        client.getLogs({
          address: registries as Address[],
          event: REWARD_WITHDRAWN,
          fromBlock: from,
          toBlock: to,
        }),
      )
      return logs
        .map((log: Log) => {
          const { args } = decodeEventLog({
            abi: [REWARD_WITHDRAWN],
            data: log.data,
            topics: log.topics,
          })
          return {
            key: `${log.transactionHash}:${log.logIndex}`,
            beneficiary: (args._beneficiary as string).toLowerCase(),
            registry: (log.address as string).toLowerCase(),
            itemID: (args._itemID as Hex).toLowerCase(),
            amount: args._reward as bigint,
          }
        })
        .filter((reward) => reward.amount > 0n)
    },
  }
}

export type Chain = ReturnType<typeof createChain>
