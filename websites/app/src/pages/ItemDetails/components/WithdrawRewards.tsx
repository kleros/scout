import React, { useState } from 'react'
import styled from 'styled-components'
import { useQuery } from '@tanstack/react-query'
import { useAccount, usePublicClient } from 'wagmi'
import { Address, formatEther } from 'viem'
import { gnosis } from 'viem/chains'
import { StyledButton } from 'components/Button'
import { EnsureChain } from 'components/EnsureChain'
import { useCurateInteractions } from 'hooks/contracts/useCurateInteractions'
import { errorToast } from 'utils/wrapWithToast'
import { isUserRejection, parseWagmiError } from 'utils/parseWagmiError'
import { GraphItemDetails } from 'utils/itemDetails'

/** Kleros' LightGeneralizedTCRView on Gnosis (the contract Scout reads registry parameters from). */
const LIGHT_GTCR_VIEW_ADDRESS = '0xB32e38B08FcC7b7610490f764b0F9bFd754dCE53' as const

const availableRewardsAbi = [
  {
    type: 'function',
    name: 'availableRewards',
    stateMutability: 'view',
    inputs: [
      { name: '_address', type: 'address' },
      { name: '_itemID', type: 'bytes32' },
      { name: '_contributor', type: 'address' },
    ],
    outputs: [{ name: 'rewards', type: 'uint256' }],
  },
] as const

/** Every digit of an amount with thousands separators: "1,116", "111.6". */
const exactXdai = (wei: bigint): string => {
  const [whole, fraction] = formatEther(wei).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction && fraction !== '0' ? `${grouped}.${fraction}` : grouped
}

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  text-align: center;
`

const Heading = styled.h2`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const Text = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
`

const WithdrawButton = styled(StyledButton).attrs({ variant: 'primary', size: 'medium' })`
  line-height: 1.2;
`

interface WithdrawRewardsProps {
  item: GraphItemDetails
  registryAddress: string
}

/**
 * Appeal fees a connected wallet can take back: rewards for backing the side that won, and
 * contributions returned when an appeal did not go ahead (LightGeneralizedTCR.withdrawFeesAndRewards).
 * Shown only while there is something to withdraw. The amount is read from the chain, so it is
 * the wallet's own figure, and it is read again after the withdrawal.
 */
const WithdrawRewards: React.FC<WithdrawRewardsProps> = ({ item, registryAddress }) => {
  const { address: account } = useAccount()
  const publicClient = usePublicClient({ chainId: gnosis.id })
  const { withdrawRewards, isLoading } = useCurateInteractions()
  // After a confirmed withdrawal, until the amount is read again: the old figure is no longer owed.
  const [rereading, setRereading] = useState(false)
  const busy = isLoading || rereading

  const requests = item.requests ?? []
  const latestResolved = !!requests[0]?.resolved
  // The withdrawal walks the requests from the first one. The registry refuses to pay out of a
  // request still under dispute, so while the latest request is open only the ones before it are
  // walked (0 walks them all); the view counts only resolved requests as well.
  const requestCount = latestResolved ? 0 : Math.max(0, requests.length - 1)
  // Only rounds of a dispute hold contributions.
  const everDisputed = requests.some((request) => request.disputed)

  const { data: rewards, refetch } = useQuery({
    queryKey: ['availableRewards', registryAddress, item.itemID, account, requests.length, latestResolved],
    queryFn: async () => {
      if (!publicClient || !account) return 0n
      return publicClient.readContract({
        address: LIGHT_GTCR_VIEW_ADDRESS,
        abi: availableRewardsAbi,
        functionName: 'availableRewards',
        args: [registryAddress as Address, item.itemID as `0x${string}`, account],
      })
    },
    enabled: !!account && !!publicClient && everDisputed && (latestResolved || requestCount > 0),
  })

  if (!account || !rewards || rewards <= 0n) return null

  const amount = `${exactXdai(rewards)} xDAI`

  const handleWithdraw = async () => {
    if (busy) return
    try {
      const result = await withdrawRewards(registryAddress as Address, item.itemID, requestCount)
      if (result?.status) {
        setRereading(true)
        try {
          await refetch()
        } finally {
          setRereading(false)
        }
      }
    } catch (error) {
      console.error('Error withdrawing rewards:', error)
      // Declining in the wallet is a choice; anything else says what went wrong.
      if (!isUserRejection(error)) errorToast(parseWagmiError(error) || 'The withdrawal failed. Try again.')
    }
  }

  return (
    <Panel aria-labelledby="withdraw-rewards-heading">
      <Heading id="withdraw-rewards-heading">Your appeal rewards</Heading>
      <Text>
        You funded appeals on this item. {amount} is yours to withdraw: your share of the rewards if you backed
        the side that won, and your contributions back if an appeal did not go ahead.
      </Text>
      <EnsureChain>
        <WithdrawButton type="button" onClick={handleWithdraw} disabled={busy}>
          {busy ? 'Withdrawing...' : `Withdraw rewards · ${amount}`}
        </WithdrawButton>
      </EnsureChain>
    </Panel>
  )
}

export default WithdrawRewards
