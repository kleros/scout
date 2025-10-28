import { useMemo } from 'react'
import { PARTY, SUBGRAPH_RULING } from '../utils/itemStatus'

interface Round {
  hasPaidRequester: boolean
  hasPaidChallenger: boolean
  amountPaidRequester: string
  amountPaidChallenger: string
  ruling: string
}

interface Item {
  requests: Array<{
    rounds: Round[]
  }>
}

interface UseRequiredFeesParams {
  side: PARTY
  sharedStakeMultiplier: bigint
  winnerStakeMultiplier: bigint
  loserStakeMultiplier: bigint
  currentRuling: string
  item: Item | null
  MULTIPLIER_DIVISOR: bigint
  appealCost: bigint | null
}

interface RequiredFeesResult {
  requiredForSide: bigint
  amountStillRequired: bigint
  potentialReward: bigint
}

/**
 * Calculate the required fees and potential rewards for appeal crowdfunding
 */
export function useRequiredFees({
  side,
  sharedStakeMultiplier,
  winnerStakeMultiplier,
  loserStakeMultiplier,
  currentRuling,
  item,
  MULTIPLIER_DIVISOR,
  appealCost,
}: UseRequiredFeesParams): RequiredFeesResult | null {
  return useMemo(() => {
    if (
      !item ||
      !appealCost ||
      !sharedStakeMultiplier ||
      !winnerStakeMultiplier ||
      !loserStakeMultiplier ||
      !MULTIPLIER_DIVISOR ||
      side === PARTY.NONE
    ) {
      return null
    }

    const latestRequest = item.requests[0]
    if (!latestRequest || !latestRequest.rounds || latestRequest.rounds.length === 0) {
      return null
    }

    const latestRound = latestRequest.rounds[0]
    const { hasPaidRequester, hasPaidChallenger, amountPaidRequester, amountPaidChallenger } =
      latestRound

    // Determine multiplier based on side and ruling
    let multiplier: bigint
    const isRequester = side === PARTY.REQUESTER
    const ruling = currentRuling || latestRound.ruling

    // Check if no ruling (supports both string formats)
    const isNoRuling = ruling === SUBGRAPH_RULING.NONE || ruling === 'Refuse' ||
                       ruling === SUBGRAPH_RULING.NONE_NUM || ruling === 'None'

    if (isNoRuling) {
      // No ruling - both sides use shared multiplier
      multiplier = sharedStakeMultiplier
    } else if (
      (ruling === SUBGRAPH_RULING.ACCEPT && isRequester) ||
      (ruling === SUBGRAPH_RULING.ACCEPT_NUM && isRequester) ||
      (ruling === SUBGRAPH_RULING.REJECT && !isRequester) ||
      (ruling === SUBGRAPH_RULING.REJECT_NUM && !isRequester)
    ) {
      // This side is winning
      multiplier = winnerStakeMultiplier
    } else {
      // This side is losing
      multiplier = loserStakeMultiplier
    }

    // Calculate required amount for this side
    const requiredForSide = appealCost + (appealCost * multiplier) / MULTIPLIER_DIVISOR

    // Get amount already paid by this side
    const amountPaid = BigInt(isRequester ? amountPaidRequester : amountPaidChallenger)

    // Calculate amount still required
    const amountStillRequired = requiredForSide > amountPaid ? requiredForSide - amountPaid : 0n

    // Calculate potential reward
    // The opponent's fee stake is redistributed to the winning side's contributors
    // Determine if this side is winner
    const sideIsWinner = !isNoRuling && (
      (ruling === SUBGRAPH_RULING.ACCEPT && isRequester) ||
      (ruling === SUBGRAPH_RULING.ACCEPT_NUM && isRequester) ||
      (ruling === SUBGRAPH_RULING.REJECT && !isRequester) ||
      (ruling === SUBGRAPH_RULING.REJECT_NUM && !isRequester)
    )

    const opponentIsWinner = !isNoRuling && !sideIsWinner
    const opponentMultiplier = isNoRuling
      ? sharedStakeMultiplier
      : opponentIsWinner
      ? winnerStakeMultiplier
      : loserStakeMultiplier

    // Total reward available is the opponent's fee stake
    const totalReward = (appealCost * opponentMultiplier) / MULTIPLIER_DIVISOR

    // Calculate the share available for contribution
    // potentialReward = (amountStillRequired / requiredForSide) * totalReward
    const potentialReward = (amountStillRequired * MULTIPLIER_DIVISOR) / requiredForSide * totalReward / MULTIPLIER_DIVISOR

    return {
      requiredForSide,
      amountStillRequired,
      potentialReward,
    }
  }, [
    side,
    sharedStakeMultiplier,
    winnerStakeMultiplier,
    loserStakeMultiplier,
    currentRuling,
    item,
    MULTIPLIER_DIVISOR,
    appealCost,
  ])
}

export default useRequiredFees
