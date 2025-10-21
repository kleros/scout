import React, { useMemo, useState } from 'react'
import styled from 'styled-components'
import { formatEther, parseEther } from 'ethers'
import { PARTY, SUBGRAPH_RULING, itemToStatusCode, STATUS_CODE } from '../../utils/itemStatus'
import useRequiredFees from '../../hooks/useRequiredFees'
import useNativeCurrency from '../../hooks/useNativeCurrency'
import { useCurateInteractions } from '../../hooks/contracts/useCurateInteractions'
import { GraphItemDetails } from '../../utils/itemDetails'
import { errorToast } from '../../utils/wrapWithToast'

const Card = styled.div`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 12px;
  padding: 24px;
  margin: 16px 0;
  color: ${({ theme }) => theme.primaryText};
`

const CardHeader = styled.div`
  margin-bottom: 24px;
  text-align: center;
`

const CardTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const CardDescription = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
`

const Content = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: rgba(205, 157, 255, 0.05);
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 8px;
`

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Title = styled.h4`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const StatusBadge = styled.span<{ funded: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
  background: ${({ funded }) => (funded ? 'rgba(72, 187, 120, 0.1)' : 'rgba(205, 157, 255, 0.1)')};
  color: ${({ funded }) => (funded ? '#48BB78' : '#CD9DFF')};
  border: 1px solid ${({ funded }) => (funded ? '#48BB78' : '#CD9DFF')};
`

const Description = styled.p`
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
`

const ProgressBarContainer = styled.div`
  width: 100%;
  height: 6px;
  background: ${({ theme }) => theme.lightGrey};
  border-radius: 3px;
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ percent: number; status: 'active' | 'success' }>`
  height: 100%;
  width: ${(props) => props.percent}%;
  background: ${(props) => (props.status === 'success' ? '#48BB78' : '#CD9DFF')};
  transition: width 0.3s ease;
`

const InfoBox = styled.div`
  grid-column: 1 / -1;
  padding: 16px;
  background: rgba(237, 137, 54, 0.1);
  border: 1px solid rgba(237, 137, 54, 0.3);
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: ${({ theme }) => theme.secondaryText};
`

const ContributionSection = styled.div`
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid ${({ theme }) => theme.lightGrey};
`

const ContributionLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const SliderContainer = styled.div`
  margin: 12px 0;
`

const Slider = styled.input`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.lightGrey};
  outline: none;
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #cd9dff;
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: #b882ff;
    }
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #cd9dff;
    cursor: pointer;
    border: none;
    transition: background 0.2s;

    &:hover {
      background: #b882ff;
    }
  }
`

const InputGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 12px 0;
`

const Input = styled.input`
  flex: 1;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #cd9dff;
  }
`

const Unit = styled.span`
  font-weight: 600;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
`

const ContributeButton = styled.button<{ disabled?: boolean }>`
  width: 100%;
  padding: 12px 24px;
  margin-top: 12px;
  border: none;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  font-family: "Open Sans", sans-serif;

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active:not(:disabled) {
    background: ${({ theme }) => theme.buttonWhiteActive};
  }

  &:disabled {
    background: ${({ theme }) => theme.buttonDisabled};
    color: ${({ theme }) => theme.buttonDisabledText};
    border: 1px solid ${({ theme }) => theme.buttonDisabled};
    cursor: not-allowed;
  }
`

const ContributionInfo = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: rgba(205, 157, 255, 0.05);
  border-radius: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  line-height: 1.5;
`

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin: 4px 0;
`

interface CrowdfundingCardProps {
  item: GraphItemDetails | null
  timestamp: number | null
  challengePeriodDuration: number | null
  appealCost: bigint | null
  sharedStakeMultiplier: bigint
  winnerStakeMultiplier: bigint
  loserStakeMultiplier: bigint
  MULTIPLIER_DIVISOR: bigint
  registryAddress: string
}

const CrowdfundingCard: React.FC<CrowdfundingCardProps> = ({
  item,
  timestamp,
  challengePeriodDuration,
  appealCost,
  sharedStakeMultiplier,
  winnerStakeMultiplier,
  loserStakeMultiplier,
  MULTIPLIER_DIVISOR,
  registryAddress,
}) => {
  const [selectedSide, setSelectedSide] = useState<PARTY>(PARTY.NONE)
  const [contributionShare, setContributionShare] = useState(1)
  const nativeCurrency = useNativeCurrency()
  const { fundAppeal, isLoading } = useCurateInteractions()

  const requesterFees = useRequiredFees({
    side: PARTY.REQUESTER,
    sharedStakeMultiplier,
    winnerStakeMultiplier,
    loserStakeMultiplier,
    currentRuling: item?.requests?.[0]?.rounds?.[0]?.ruling || SUBGRAPH_RULING.NONE,
    item: item as any,
    MULTIPLIER_DIVISOR,
    appealCost,
  })

  const challengerFees = useRequiredFees({
    side: PARTY.CHALLENGER,
    sharedStakeMultiplier,
    winnerStakeMultiplier,
    loserStakeMultiplier,
    currentRuling: item?.requests?.[0]?.rounds?.[0]?.ruling || SUBGRAPH_RULING.NONE,
    item: item as any,
    MULTIPLIER_DIVISOR,
    appealCost,
  })

  const statusCode = useMemo(() => {
    if (!item || timestamp === null || !challengePeriodDuration) return null
    return itemToStatusCode(item as any, timestamp, challengePeriodDuration)
  }, [item, timestamp, challengePeriodDuration])

  if (!item || !challengePeriodDuration || !requesterFees || !challengerFees || !appealCost) {
    return null
  }

  if (statusCode !== STATUS_CODE.CROWDFUNDING && statusCode !== STATUS_CODE.CROWDFUNDING_WINNER) {
    return null
  }

  const round = item.requests[0]?.rounds?.[0]
  if (!round) return null

  const { hasPaidRequester, hasPaidChallenger, ruling } = round
  const amountPaidRequester = BigInt(round.amountPaidRequester)
  const amountPaidChallenger = BigInt(round.amountPaidChallenger)

  const requesterPercentage = requesterFees.requiredForSide > 0n
    ? Number((amountPaidRequester * 10000n) / requesterFees.requiredForSide) / 100
    : 0

  const challengerPercentage = challengerFees.requiredForSide > 0n
    ? Number((amountPaidChallenger * 10000n) / challengerFees.requiredForSide) / 100
    : 0

  const selectedFees = selectedSide === PARTY.REQUESTER ? requesterFees :
                       selectedSide === PARTY.CHALLENGER ? challengerFees : null

  const contributionAmount = selectedFees && selectedFees.amountStillRequired > 0n
    ? (selectedFees.amountStillRequired * BigInt(Math.ceil(contributionShare * Number(MULTIPLIER_DIVISOR)))) / MULTIPLIER_DIVISOR
    : 0n

  const potentialRewardForContribution = selectedFees && selectedFees.potentialReward > 0n
    ? (selectedFees.potentialReward * BigInt(Math.ceil(contributionShare * Number(MULTIPLIER_DIVISOR)))) / MULTIPLIER_DIVISOR
    : 0n

  const handleFundAppeal = async () => {
    if (!item || selectedSide === PARTY.NONE || contributionAmount === 0n) return

    try {
      await fundAppeal(registryAddress as `0x${string}`, item.itemID, selectedSide, contributionAmount)
      setSelectedSide(PARTY.NONE)
      setContributionShare(1)
    } catch (error) {
      console.error('Error funding appeal:', error)
      errorToast(error instanceof Error ? error.message : 'Failed to fund appeal')
    }
  }

  const renderContributionUI = (side: PARTY) => {
    const fees = side === PARTY.REQUESTER ? requesterFees : challengerFees
    const isFunded = side === PARTY.REQUESTER ? hasPaidRequester : hasPaidChallenger
    const isSelected = selectedSide === side

    if (isFunded) return null

    return (
      <ContributionSection>
        {!isSelected ? (
          <ContributeButton onClick={() => setSelectedSide(side)}>
            Contribute to {side === PARTY.REQUESTER ? 'Submitter' : 'Challenger'}
          </ContributeButton>
        ) : (
          <>
            <ContributionLabel>Contribution Amount</ContributionLabel>
            <SliderContainer>
              <Slider
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={contributionShare}
                onChange={(e) => setContributionShare(parseFloat(e.target.value))}
              />
            </SliderContainer>
            <InputGroup>
              <Input
                type="number"
                min="0"
                max={Number(formatEther(fees.amountStillRequired))}
                step="0.01"
                value={
                  fees.amountStillRequired > 0n
                    ? (contributionShare * Number(formatEther(fees.amountStillRequired))).toFixed(4)
                    : '0'
                }
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0
                  if (fees.amountStillRequired > 0n) {
                    const weiAmount = parseEther(value.toString())
                    const share = Number((weiAmount * MULTIPLIER_DIVISOR) / fees.amountStillRequired) / Number(MULTIPLIER_DIVISOR)
                    setContributionShare(Math.min(Math.max(share, 0), 1))
                  }
                }}
              />
              <Unit>{nativeCurrency}</Unit>
            </InputGroup>
            <ContributionInfo>
              <InfoRow>
                <span>Total Required:</span>
                <strong>{Number(formatEther(fees.requiredForSide)).toFixed(4)} {nativeCurrency}</strong>
              </InfoRow>
              <InfoRow>
                <span>Already Paid:</span>
                <strong>{Number(formatEther(side === PARTY.REQUESTER ? amountPaidRequester : amountPaidChallenger)).toFixed(4)} {nativeCurrency}</strong>
              </InfoRow>
              <InfoRow>
                <span>Still Needed:</span>
                <strong>{Number(formatEther(fees.amountStillRequired)).toFixed(4)} {nativeCurrency}</strong>
              </InfoRow>
              <InfoRow style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <span>Potential Reward:</span>
                <strong style={{ color: '#48BB78' }}>{Number(formatEther(potentialRewardForContribution)).toFixed(4)} {nativeCurrency}</strong>
              </InfoRow>
            </ContributionInfo>
            <ContributeButton
              onClick={handleFundAppeal}
              disabled={isLoading || contributionAmount === 0n}
            >
              {isLoading ? 'Processing...' : `Fund ${Number(formatEther(contributionAmount)).toFixed(4)} ${nativeCurrency}`}
            </ContributeButton>
            {selectedSide !== PARTY.NONE && (
              <ContributeButton
                onClick={() => setSelectedSide(PARTY.NONE)}
                style={{ marginTop: '8px', background: 'transparent', border: `1px solid rgba(255,255,255,0.2)`, color: 'inherit' }}
              >
                Cancel
              </ContributeButton>
            )}
          </>
        )}
      </ContributionSection>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appeal Crowdfunding</CardTitle>
        <CardDescription>
          Contribute appeal fees and earn rewards if the side you back wins the round
        </CardDescription>
      </CardHeader>

      <Content>
        <Section>
          <SectionHeader>
            <Title>Submitter</Title>
            <StatusBadge funded={hasPaidRequester}>
              {hasPaidRequester ? '✓ Funded' : 'Funding'}
            </StatusBadge>
          </SectionHeader>
          <ProgressBarContainer>
            <ProgressBarFill
              percent={hasPaidRequester ? 100 : requesterPercentage}
              status={hasPaidRequester ? 'success' : 'active'}
            />
          </ProgressBarContainer>
          <Description>
            {hasPaidRequester
              ? 'Fully funded. Challenger must also fund to avoid losing.'
              : `Contribute to earn up to ${Number(formatEther(requesterFees.potentialReward)).toFixed(4)} ${nativeCurrency} if this side wins.`}
          </Description>
          {renderContributionUI(PARTY.REQUESTER)}
        </Section>

        <Section>
          <SectionHeader>
            <Title>Challenger</Title>
            <StatusBadge funded={hasPaidChallenger}>
              {hasPaidChallenger ? '✓ Funded' : 'Funding'}
            </StatusBadge>
          </SectionHeader>
          <ProgressBarContainer>
            <ProgressBarFill
              percent={hasPaidChallenger ? 100 : challengerPercentage}
              status={hasPaidChallenger ? 'success' : 'active'}
            />
          </ProgressBarContainer>
          <Description>
            {hasPaidChallenger
              ? 'Fully funded. Submitter must also fund to avoid losing.'
              : `Contribute to earn up to ${Number(formatEther(challengerFees.potentialReward)).toFixed(4)} ${nativeCurrency} if this side wins.`}
          </Description>
          {renderContributionUI(PARTY.CHALLENGER)}
        </Section>

        <InfoBox>
          {(() => {
            const isNoRuling = ruling === SUBGRAPH_RULING.NONE || ruling === 'Refuse' ||
                              ruling === SUBGRAPH_RULING.NONE_NUM || ruling === 'None'
            const isAccept = ruling === SUBGRAPH_RULING.ACCEPT || ruling === SUBGRAPH_RULING.ACCEPT_NUM

            if (isNoRuling) {
              return 'The arbitrator did not give a decisive ruling. If a party fully funds their side, the other must also fund to avoid losing.'
            }

            return `If the ${
              isAccept ? 'challenger' : 'submitter'
            } fully funds their appeal, the ${
              isAccept ? 'submitter' : 'challenger'
            } must also fund to avoid losing the case.`
          })()}
        </InfoBox>
      </Content>
    </Card>
  )
}

export default CrowdfundingCard
