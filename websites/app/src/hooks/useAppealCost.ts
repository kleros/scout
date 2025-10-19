import { useQuery } from '@tanstack/react-query'
import { Contract, JsonRpcProvider } from 'ethers'
import { useState, useEffect } from 'react'

const ArbitratorABI = [
  {
    constant: true,
    inputs: [
      { name: '_disputeID', type: 'uint256' },
      { name: '_extraData', type: 'bytes' },
    ],
    name: 'appealCost',
    outputs: [{ name: 'cost', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
]

const CACHE_KEY_PREFIX = 'appealCost'

interface CachedData {
  cost: string
  roundCount: number
}

/**
 * Get cached appeal cost from localStorage
 * Cache key includes round count to ensure different rounds get different cached values
 */
const getCachedAppealCost = (
  arbitrator: string,
  disputeID: string,
  arbitratorExtraData: string,
  roundCount: number
): bigint | null => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}-${arbitrator}-${disputeID}-${arbitratorExtraData}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    const parsed: CachedData = JSON.parse(cached)

    // Only use cache if round count matches (appeal costs change per round)
    if (parsed.roundCount !== roundCount) {
      localStorage.removeItem(cacheKey)
      return null
    }

    return BigInt(parsed.cost)
  } catch (error) {
    console.error('Error reading cached appeal cost:', error)
    return null
  }
}

/**
 * Cache appeal cost in localStorage with round count
 */
const setCachedAppealCost = (
  arbitrator: string,
  disputeID: string,
  arbitratorExtraData: string,
  roundCount: number,
  cost: bigint
) => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}-${arbitrator}-${disputeID}-${arbitratorExtraData}`
    const cached: CachedData = {
      cost: cost.toString(),
      roundCount: roundCount,
    }
    localStorage.setItem(cacheKey, JSON.stringify(cached))
  } catch (error) {
    console.error('Error caching appeal cost:', error)
  }
}

/**
 * Fetches the cost to appeal a dispute
 * Uses round-based caching - appeal costs increase with each round
 */
export function useAppealCost(
  arbitrator: string | undefined,
  disputeID: string | undefined,
  arbitratorExtraData: string | undefined,
  disputed: boolean | undefined,
  resolved: boolean | undefined,
  roundCount: number | undefined
) {
  const [cachedData, setCachedDataState] = useState<bigint | null>(() =>
    arbitrator && disputeID && arbitratorExtraData && roundCount !== undefined
      ? getCachedAppealCost(arbitrator, disputeID, arbitratorExtraData, roundCount)
      : null
  )

  const query = useQuery({
    queryKey: ['appealCost', arbitrator, disputeID, arbitratorExtraData, roundCount],
    queryFn: async (): Promise<bigint> => {
      if (!arbitrator || !disputeID || !arbitratorExtraData) {
        throw new Error('Missing required parameters')
      }

      const provider = new JsonRpcProvider('https://rpc.gnosischain.com', 100)
      const arbitratorContract = new Contract(arbitrator, ArbitratorABI, provider)

      try {
        const disputeIdBigInt = BigInt(disputeID)

        // Add timeout to prevent indefinite hanging (30 seconds)
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Appeal cost fetch timed out after 30 seconds')), 30000)
        })

        const cost = await Promise.race([
          arbitratorContract.appealCost(disputeIdBigInt, arbitratorExtraData),
          timeoutPromise
        ]) as bigint

        // Cache the result in localStorage with round count
        if (roundCount !== undefined) {
          setCachedAppealCost(arbitrator, disputeID, arbitratorExtraData, roundCount, cost)
        }

        return cost
      } catch (error) {
        console.error('Failed to fetch appeal cost:', error)
        throw error
      }
    },
    enabled: !!arbitrator && !!disputeID && !!arbitratorExtraData && disputed === true && resolved === false && (roundCount ?? 0) > 0,
    staleTime: 60000, // 1 minute
    gcTime: 60000, // Keep in memory for 1 minute
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    placeholderData: cachedData || undefined, // Use cached data immediately for instant UI
  })

  // Update local cache state when query data changes
  useEffect(() => {
    if (query.data && query.data !== cachedData) {
      setCachedDataState(query.data)
    }
  }, [query.data, cachedData])

  return query
}

export default useAppealCost
