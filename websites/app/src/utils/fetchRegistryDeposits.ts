import { AbiCoder, Contract, JsonRpcProvider } from 'ethers'
import { SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT } from 'consts'

export interface DepositParams {
  submissionBaseDeposit: bigint
  submissionChallengeBaseDeposit: bigint
  removalBaseDeposit: bigint
  removalChallengeBaseDeposit: bigint
  arbitrator: string
  arbitratorExtraData: string
  arbitrationCost: bigint
  governor: string
  challengePeriodDuration: bigint
  subcourtID: number
  numberOfJurors: number
  courtName: string
  /** [evidence, commit, vote, appeal] durations in seconds */
  timesPerPeriod: number[]
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

interface CourtSubgraphResponse {
  data?: {
    court?: {
      id: string
      metadata: { name: string } | null
      timesPerPeriod: string[]
    }
  }
}

const fetchCourtData = async (
  subcourtID: number
): Promise<{ courtName: string; timesPerPeriod: number[] }> => {
  try {
    const response = await fetch(SUBGRAPH_KLEROS_DISPLAY_GNOSIS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query Court($id: ID!) { court(id: $id) { id metadata { name } timesPerPeriod } }`,
        variables: { id: String(subcourtID) },
      }),
    })
    const result: CourtSubgraphResponse = await response.json()
    const court = result.data?.court
    return {
      courtName: court?.metadata?.name || `Court #${subcourtID}`,
      timesPerPeriod: court?.timesPerPeriod?.map((t) => Number(t)) || [0, 0, 0, 0],
    }
  } catch {
    return { courtName: `Court #${subcourtID}`, timesPerPeriod: [0, 0, 0, 0] }
  }
}

export const fetchRegistryDeposits = async (
  registry: string
): Promise<DepositParams | undefined> => {
  // registry still unknown
  if (!registry) return undefined

  try {
    const provider = new JsonRpcProvider('https://rpc.gnosischain.com', 100)

    const lgtcrViewContract = new Contract(
      LGTCRViewAddress,
      LGTCRViewABI,
      provider
    )
    const viewInfo = await lgtcrViewContract.fetchArbitrable(registry)

    // Decode arbitratorExtraData to get subcourt ID and juror count
    let subcourtID = 0
    let numberOfJurors = 3
    try {
      const decoded = AbiCoder.defaultAbiCoder().decode(
        ['uint256', 'uint256'],
        viewInfo.arbitratorExtraData
      )
      subcourtID = Number(decoded[0])
      numberOfJurors = Number(decoded[1])
    } catch {
      // Fallback defaults if decoding fails
    }

    // Fetch court name and timesPerPeriod from Kleros Display subgraph
    const { courtName, timesPerPeriod } = await fetchCourtData(subcourtID)

    const depositParams: DepositParams = {
      submissionBaseDeposit: viewInfo.submissionBaseDeposit,
      submissionChallengeBaseDeposit: viewInfo.submissionChallengeBaseDeposit,
      removalBaseDeposit: viewInfo.removalBaseDeposit,
      removalChallengeBaseDeposit: viewInfo.removalChallengeBaseDeposit,
      arbitrator: viewInfo.arbitrator,
      arbitratorExtraData: viewInfo.arbitratorExtraData,
      arbitrationCost: viewInfo.arbitrationCost,
      governor: viewInfo.governor,
      challengePeriodDuration: viewInfo.challengePeriodDuration,
      subcourtID,
      numberOfJurors,
      courtName,
      timesPerPeriod,
    }
    return depositParams
  } catch (e) {
    console.error('fetchRegistryDeposits error!', e)
    return undefined
  }
}
