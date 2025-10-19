import { useQuery } from '@tanstack/react-query'
import { Contract, JsonRpcProvider } from 'ethers'
import { useEffect, useState } from 'react'

interface RegistryParameters {
  sharedStakeMultiplier: bigint
  winnerStakeMultiplier: bigint
  loserStakeMultiplier: bigint
  MULTIPLIER_DIVISOR: bigint
  arbitrationCost: bigint
  challengePeriodDuration: bigint
  submissionBaseDeposit: bigint
  removalBaseDeposit: bigint
  submissionChallengeBaseDeposit: bigint
  removalChallengeBaseDeposit: bigint
}

const LGTCRViewABI = [
  {
    constant: true,
    inputs: [{ internalType: 'address', name: '_address', type: 'address' }],
    name: 'fetchArbitrable',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'governor', type: 'address' },
          { internalType: 'address', name: 'arbitrator', type: 'address' },
          { internalType: 'bytes', name: 'arbitratorExtraData', type: 'bytes' },
          {
            internalType: 'uint256',
            name: 'submissionBaseDeposit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'removalBaseDeposit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'submissionChallengeBaseDeposit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'removalChallengeBaseDeposit',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'challengePeriodDuration',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'metaEvidenceUpdates',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'winnerStakeMultiplier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'loserStakeMultiplier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'sharedStakeMultiplier',
            type: 'uint256',
          },
          {
            internalType: 'uint256',
            name: 'MULTIPLIER_DIVISOR',
            type: 'uint256',
          },
          { internalType: 'uint256', name: 'arbitrationCost', type: 'uint256' },
        ],
        internalType: 'struct LightGeneralizedTCRView.ArbitrableData',
        name: 'result',
        type: 'tuple',
      },
    ],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
]

const LGTCRViewAddress = '0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53'

const CACHE_KEY_PREFIX = 'registryParams'
const CACHE_EXPIRY = 24 * 60 * 60 * 1000 // 24 hours

interface CachedData {
  data: RegistryParameters
  timestamp: number
}

/**
 * Get cached registry parameters from localStorage
 */
const getCachedParams = (registryAddress: string): RegistryParameters | null => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}-${registryAddress}`
    const cached = localStorage.getItem(cacheKey)
    if (!cached) return null

    const parsed: CachedData = JSON.parse(cached)
    const now = Date.now()

    // Check if cache is expired
    if (now - parsed.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey)
      return null
    }

    // Convert string values back to BigInt
    return {
      sharedStakeMultiplier: BigInt(parsed.data.sharedStakeMultiplier),
      winnerStakeMultiplier: BigInt(parsed.data.winnerStakeMultiplier),
      loserStakeMultiplier: BigInt(parsed.data.loserStakeMultiplier),
      MULTIPLIER_DIVISOR: BigInt(parsed.data.MULTIPLIER_DIVISOR),
      arbitrationCost: BigInt(parsed.data.arbitrationCost),
      challengePeriodDuration: BigInt(parsed.data.challengePeriodDuration),
      submissionBaseDeposit: BigInt(parsed.data.submissionBaseDeposit),
      removalBaseDeposit: BigInt(parsed.data.removalBaseDeposit),
      submissionChallengeBaseDeposit: BigInt(parsed.data.submissionChallengeBaseDeposit),
      removalChallengeBaseDeposit: BigInt(parsed.data.removalChallengeBaseDeposit),
    }
  } catch (error) {
    console.error('Error reading cached registry params:', error)
    return null
  }
}

/**
 * Cache registry parameters in localStorage
 */
const setCachedParams = (registryAddress: string, data: RegistryParameters) => {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}-${registryAddress}`
    const cached: CachedData = {
      data: {
        // Convert BigInt to string for JSON serialization
        sharedStakeMultiplier: data.sharedStakeMultiplier.toString() as any,
        winnerStakeMultiplier: data.winnerStakeMultiplier.toString() as any,
        loserStakeMultiplier: data.loserStakeMultiplier.toString() as any,
        MULTIPLIER_DIVISOR: data.MULTIPLIER_DIVISOR.toString() as any,
        arbitrationCost: data.arbitrationCost.toString() as any,
        challengePeriodDuration: data.challengePeriodDuration.toString() as any,
        submissionBaseDeposit: data.submissionBaseDeposit.toString() as any,
        removalBaseDeposit: data.removalBaseDeposit.toString() as any,
        submissionChallengeBaseDeposit: data.submissionChallengeBaseDeposit.toString() as any,
        removalChallengeBaseDeposit: data.removalChallengeBaseDeposit.toString() as any,
      },
      timestamp: Date.now(),
    }
    localStorage.setItem(cacheKey, JSON.stringify(cached))
  } catch (error) {
    console.error('Error caching registry params:', error)
  }
}

/**
 * Fetches registry parameters needed for appeal fee calculations
 * Uses localStorage caching to improve performance
 */
export function useRegistryParameters(registryAddress: string) {
  const [cachedData, setCachedDataState] = useState<RegistryParameters | null>(() =>
    getCachedParams(registryAddress)
  )

  const query = useQuery({
    queryKey: ['registryParameters', registryAddress],
    queryFn: async (): Promise<RegistryParameters> => {
      const provider = new JsonRpcProvider('https://rpc.gnosischain.com', 100)
      const lgtcrViewContract = new Contract(LGTCRViewAddress, LGTCRViewABI, provider)

      try {
        const viewInfo = await lgtcrViewContract.fetchArbitrable(registryAddress)

        const params: RegistryParameters = {
          sharedStakeMultiplier: viewInfo.sharedStakeMultiplier,
          winnerStakeMultiplier: viewInfo.winnerStakeMultiplier,
          loserStakeMultiplier: viewInfo.loserStakeMultiplier,
          MULTIPLIER_DIVISOR: viewInfo.MULTIPLIER_DIVISOR,
          arbitrationCost: viewInfo.arbitrationCost,
          challengePeriodDuration: viewInfo.challengePeriodDuration,
          submissionBaseDeposit: viewInfo.submissionBaseDeposit,
          removalBaseDeposit: viewInfo.removalBaseDeposit,
          submissionChallengeBaseDeposit: viewInfo.submissionChallengeBaseDeposit,
          removalChallengeBaseDeposit: viewInfo.removalChallengeBaseDeposit,
        }

        // Cache the result
        setCachedParams(registryAddress, params)

        return params
      } catch (error) {
        console.error('Failed to fetch registry parameters:', error)
        throw error
      }
    },
    enabled: !!registryAddress,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours - these parameters rarely change
    cacheTime: 24 * 60 * 60 * 1000, // Keep in memory for 24 hours
    retry: 2, // Retry twice on failure
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch on mount if we have cached data
    // Use cached data immediately if available
    placeholderData: cachedData || undefined,
  })

  // Update local cache state when query data changes
  useEffect(() => {
    if (query.data && query.data !== cachedData) {
      setCachedDataState(query.data)
    }
  }, [query.data, cachedData])

  return query
}

export default useRegistryParameters
