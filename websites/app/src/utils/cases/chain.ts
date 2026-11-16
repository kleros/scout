import {
  createPublicClient,
  fallback,
  http,
  parseAbi,
  type Address,
  type Hex,
} from 'viem'
import { gnosis } from 'viem/chains'

/**
 * Reads about Scout's disputes on Gnosis: challenge periods, appeal costs and
 * court periods. Court reads go to each request's own arbitrator, as the
 * registries record it.
 */

// `appealCost` is part of every arbitrator's interface; `disputes` and
// `getSubcourt` are Kleros Liquid's (the registries' arbitrator), so another
// arbitrator just leaves the court period unknown.
const ARBITRATOR_ABI = parseAbi([
  'function appealCost(uint256 _disputeID, bytes _extraData) view returns (uint256)',
  'function disputes(uint256) view returns (uint96 subcourtID, address arbitrated, uint256 numberOfChoices, uint8 period, uint256 lastPeriodChange, uint256 drawsInRound, uint256 commitsInRound, bool ruled)',
  'function getSubcourt(uint96 _subcourtID) view returns (uint256[] children, uint256[4] timesPerPeriod)',
])

const LGTCR_ABI = parseAbi([
  'function challengePeriodDuration() view returns (uint256)',
  'function winnerStakeMultiplier() view returns (uint256)',
  'function loserStakeMultiplier() view returns (uint256)',
  'function sharedStakeMultiplier() view returns (uint256)',
  'function MULTIPLIER_DIVISOR() view returns (uint256)',
])

/** Court periods, as KlerosLiquid numbers them. */
export const PERIODS = [
  'evidence',
  'commit',
  'vote',
  'appeal',
  'execution',
] as const

/** A Gnosis client over `rpcUrls`, tried in order. */
export const gnosisClient = (rpcUrls: string[]) =>
  createPublicClient({
    chain: gnosis,
    transport: fallback(
      rpcUrls.map((url) => http(url, { timeout: 10_000, retryCount: 1 })),
    ),
  })

export const createCaseChain = (rpcUrls: string[]) => {
  const client = gnosisClient(rpcUrls)
  const multipliers = new Map<
    string,
    Promise<{ winner: bigint; loser: bigint; shared: bigint; divisor: bigint }>
  >()
  const challengePeriods = new Map<string, Promise<number>>()
  const courtTimes = new Map<string, Promise<readonly bigint[]>>()

  return {
    /** What each side must pay to fund the current appeal round. */
    appealFunding: async (
      registry: string,
      arbitrator: string,
      disputeId: string,
      extraData: string,
    ) => {
      const key = registry.toLowerCase()
      if (!multipliers.has(key)) {
        const read = (
          functionName:
            | 'winnerStakeMultiplier'
            | 'loserStakeMultiplier'
            | 'sharedStakeMultiplier'
            | 'MULTIPLIER_DIVISOR',
        ) =>
          client.readContract({
            address: registry as Address,
            abi: LGTCR_ABI,
            functionName,
          })
        const loaded = Promise.all([
          read('winnerStakeMultiplier'),
          read('loserStakeMultiplier'),
          read('sharedStakeMultiplier'),
          read('MULTIPLIER_DIVISOR'),
        ]).then(([winner, loser, shared, divisor]) => ({
          winner,
          loser,
          shared,
          divisor,
        }))
        loaded.catch(() => multipliers.delete(key))
        multipliers.set(key, loaded)
      }
      const [m, cost] = await Promise.all([
        multipliers.get(key)!,
        client.readContract({
          address: arbitrator as Address,
          abi: ARBITRATOR_ABI,
          functionName: 'appealCost',
          args: [BigInt(disputeId), extraData as Hex],
        }),
      ])
      const total = (multiplier: bigint) =>
        cost + (cost * multiplier) / m.divisor
      return {
        winner: total(m.winner),
        loser: total(m.loser),
        shared: total(m.shared),
      }
    },

    challengePeriod: (registry: string): Promise<number> => {
      const key = registry.toLowerCase()
      if (!challengePeriods.has(key)) {
        const loaded = client
          .readContract({
            address: registry as Address,
            abi: LGTCR_ABI,
            functionName: 'challengePeriodDuration',
          })
          .then(Number)
        loaded.catch(() => challengePeriods.delete(key))
        challengePeriods.set(key, loaded)
      }
      return challengePeriods.get(key)!
    },

    /**
     * The dispute's court period at `arbitrator`, and when its set time runs
     * out (keepers pass it ~10 minutes later).
     */
    disputePeriod: async (arbitrator: string, disputeId: string) => {
      const dispute = await client.readContract({
        address: arbitrator as Address,
        abi: ARBITRATOR_ABI,
        functionName: 'disputes',
        args: [BigInt(disputeId)],
      })
      const [subcourt, , , period, lastPeriodChange] = dispute
      const court = `${arbitrator.toLowerCase()}:${subcourt}`
      if (!courtTimes.has(court)) {
        const loaded = client
          .readContract({
            address: arbitrator as Address,
            abi: ARBITRATOR_ABI,
            functionName: 'getSubcourt',
            args: [subcourt],
          })
          .then(([, times]) => times)
        loaded.catch(() => courtTimes.delete(court))
        courtTimes.set(court, loaded)
      }
      const times = await courtTimes.get(court)!
      return {
        period: PERIODS[period] ?? 'execution',
        deadline:
          Number(lastPeriodChange) + Number(times[Math.min(period, 3)] ?? 0n),
      }
    },
  }
}

export type CaseChain = ReturnType<typeof createCaseChain>
