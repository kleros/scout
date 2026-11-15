import React, { useId, useMemo, useState } from 'react'
import styled, { css, useTheme } from 'styled-components'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { landscapeStyle } from 'styles/landscapeStyle'
import { formatEther, parseEther } from 'ethers'
import { PARTY, SUBGRAPH_RULING, itemToStatusCode, STATUS_CODE } from '../../utils/itemStatus'
import useRequiredFees from '../../hooks/useRequiredFees'
import useNativeCurrency from '../../hooks/useNativeCurrency'
import { useCurateInteractions } from '../../hooks/contracts/useCurateInteractions'
import { GraphItemDetails, appealDeadlineFor, getAppealInfo, partyLabel } from '../../utils/itemDetails'
import { errorToast } from '../../utils/wrapWithToast'
import { isUserRejection, parseWagmiError } from '../../utils/parseWagmiError'
import { formatTimestamp } from '../../utils/formatTimestamp'
import { formatValue } from '../../utils/formatValue'
import useNativeBalance from '../../hooks/useNativeBalance'
import { queryKeys } from '../../hooks/queries/consts'
import { EnsureChain } from 'components/EnsureChain'
import Deadline from 'pages/ItemDetails/components/Deadline'

/**
 * The network fee is paid on top of the contribution. On Gnosis it is a fraction of a cent, so 0.01
 * xDAI is ample: a balance between the contribution and the contribution plus this margin is warned
 * about (the wallet would refuse the transaction), without blocking the button. Same rule as the
 * submit forms (pages/Registries/SubmitItems/SubmitFooter.tsx).
 */
const FEE_MARGIN = parseEther('0.01')

/**
 * An amount as typed: one comma with no dot is read as the decimal point (phones in comma-decimal
 * regions offer no dot), "1,000" is left for the check below to refuse. Surrounding spaces dropped.
 */
const normalizeDecimalInput = (text: string): string => {
  const trimmed = text.trim()
  if (trimmed.includes('.')) return trimmed
  if (trimmed.split(',').length - 1 !== 1) return trimmed
  const [, fraction] = trimmed.split(',')
  if (/^\d{3}$/.test(fraction)) return trimmed
  return trimmed.replace(',', '.')
}

/** The typed amount in wei, read from the text (never through a float), or null if it is not an amount. */
const parseTypedAmount = (text: string): bigint | null => {
  const normalized = normalizeDecimalInput(text)
  if (!/^(\d+\.?\d*|\.\d+)$/.test(normalized)) return null
  try {
    return parseEther(normalized)
  } catch {
    return null
  }
}

/** Every digit of an amount, as it is sent: "1116", "2.123456789" (for the amount field). */
const exactAmount = (wei: bigint): string => {
  const text = formatEther(wei)
  return text.endsWith('.0') ? text.slice(0, -2) : text
}

/** Every digit of an amount with thousands separators: "1,116", "2.123456789" (for labels). */
const exactAmountLabel = (wei: bigint): string => {
  const [whole, fraction] = exactAmount(wei).split('.')
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return fraction ? `${grouped}.${fraction}` : grouped
}

const Card = styled.div`
  background: ${({ theme }) => theme.backgroundThree};
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 12px;
  padding: 24px;
  margin: 16px 0;
  color: ${({ theme }) => theme.primaryText};
  position: relative;
  z-index: 1;
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
  grid-template-columns: 1fr;
  gap: 24px;

  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(2, 1fr);
    `
  )}
`

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px;
  background: ${({ theme }) => theme.backgroundFour};
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 8px;
  position: relative;
  z-index: 1;
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
  background: ${({ funded, theme }) => (funded ? `${theme.success}1A` : `${theme.secondaryPurple}1A`)};
  color: ${({ funded, theme }) => (funded ? theme.success : theme.secondaryPurple)};
  border: 1px solid ${({ funded, theme }) => (funded ? theme.success : theme.secondaryPurple)};
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
  background: ${({ status, theme }) => (status === 'success' ? theme.success : theme.secondaryPurple)};
  transition: width 0.3s ease;
`

const InfoBox = styled.div`
  grid-column: 1 / -1;
  padding: 16px;
  background: ${({ theme }) => theme.backgroundFour};
  border: 1px solid ${({ theme }) => theme.stroke};
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
  -webkit-appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ theme }) => theme.secondaryPurple};
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: ${({ theme }) => theme.primaryBlue};
    }
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${({ theme }) => theme.secondaryPurple};
    cursor: pointer;
    border: none;
    transition: background 0.2s;

    &:hover {
      background: ${({ theme }) => theme.primaryBlue};
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
  background: ${({ theme }) => theme.backgroundThree};
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &:focus {
    background: ${({ theme }) => theme.backgroundFour};
  }

  /* Hide number input arrows */
  -moz-appearance: textfield;

  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
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
  font-family: "Manrope", sans-serif;

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
  background: ${({ theme }) => theme.backgroundFour};
  border: 1px solid ${({ theme }) => theme.stroke};
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

const RewardAmount = styled.strong`
  color: ${({ theme }) => theme.success};
`

/* What a side has raised and until when it can be funded, always visible. */
const SideFacts = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};

  strong {
    color: ${({ theme }) => theme.primaryText};
    font-weight: 600;
  }
`

const FieldHint = styled.p<{ $error?: boolean }>`
  margin: -4px 0 8px;
  font-size: 12px;
  line-height: 1.5;
  color: ${({ theme, $error }) => ($error ? theme.error : theme.secondaryText)};
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
  const theme = useTheme()
  const fieldId = useId()
  const [selectedSide, setSelectedSide] = useState<PARTY>(PARTY.NONE)
  const [contributionShare, setContributionShare] = useState(1)
  // What was typed in the amount field, shown as typed. Undefined while the slider sets the amount.
  const [amountText, setAmountText] = useState<string>()
  const { balance: nativeBalance } = useNativeBalance()
  const nativeCurrency = useNativeCurrency()
  const { fundAppeal, isLoading } = useCurateInteractions()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

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

  const appeal = useMemo(() => getAppealInfo(item), [item])

  if (!item || !challengePeriodDuration || !requesterFees || !challengerFees || !appealCost || !appeal) {
    return null
  }

  if (statusCode !== STATUS_CODE.CROWDFUNDING && statusCode !== STATUS_CODE.CROWDFUNDING_WINNER) {
    return null
  }

  const round = item.requests[0]?.rounds?.[0]
  if (!round) return null

  const { hasPaidRequester, hasPaidChallenger } = round
  const amountPaidRequester = BigInt(round.amountPaidRequester)
  const amountPaidChallenger = BigInt(round.amountPaidChallenger)

  const requesterPercentage = requesterFees.requiredForSide > 0n
    ? Number((amountPaidRequester * 10000n) / requesterFees.requiredForSide) / 100
    : 0

  const challengerPercentage = challengerFees.requiredForSide > 0n
    ? Number((amountPaidChallenger * 10000n) / challengerFees.requiredForSide) / 100
    : 0

  const sideName = (party: PARTY) => partyLabel(appeal, party).toLowerCase()

  const selectedFees = selectedSide === PARTY.REQUESTER ? requesterFees :
                       selectedSide === PARTY.CHALLENGER ? challengerFees : null

  // A typed amount is read as wei from the text and sent as typed, capped at what is still needed
  // (the contract would return any excess). The slider sets a share of what is still needed.
  const typedWei = amountText !== undefined ? parseTypedAmount(amountText) : null
  const typedIsInvalid = amountText !== undefined && amountText.trim() !== '' && typedWei === null
  const typedIsCapped =
    typedWei !== null && !!selectedFees && typedWei > selectedFees.amountStillRequired
  const typedIsZero = typedWei === 0n

  const contributionAmount = !selectedFees || selectedFees.amountStillRequired <= 0n
    ? 0n
    : amountText !== undefined
      ? typedWei === null
        ? 0n
        : typedIsCapped
          ? selectedFees.amountStillRequired
          : typedWei
      : (selectedFees.amountStillRequired * BigInt(Math.ceil(contributionShare * Number(MULTIPLIER_DIVISOR)))) / MULTIPLIER_DIVISOR

  const potentialRewardForContribution = selectedFees && selectedFees.potentialReward > 0n && selectedFees.amountStillRequired > 0n
    ? (selectedFees.potentialReward * contributionAmount) / selectedFees.amountStillRequired
    : 0n

  const selectSide = (side: PARTY) => {
    setSelectedSide(side)
    setContributionShare(1)
    setAmountText(undefined)
    // The page is not polled every few seconds: read the item again as a funding panel opens, so
    // the amounts raised and still needed are current.
    if (side !== PARTY.NONE && item?.id) {
      queryClient.invalidateQueries({ queryKey: queryKeys.itemDetails(item.id.toLowerCase()) })
    }
  }

  const handleAmountChange = (text: string, stillRequired: bigint) => {
    setAmountText(text)
    const wei = parseTypedAmount(text)
    if (wei === null || stillRequired <= 0n) return
    // The share only moves the slider; the amount sent is the typed one.
    setContributionShare(
      wei >= stillRequired ? 1 : Number((wei * MULTIPLIER_DIVISOR) / stillRequired) / Number(MULTIPLIER_DIVISOR),
    )
  }

  const handleFundAppeal = async () => {
    if (!item || selectedSide === PARTY.NONE || contributionAmount === 0n) return

    try {
      const result = await fundAppeal(
        registryAddress as `0x${string}`,
        item.itemID,
        selectedSide,
        contributionAmount,
      )
      if (result?.status) {
        selectSide(PARTY.NONE)
        if (result.result) {
          navigate(`/tx/${result.result.transactionHash}`)
        }
      }
    } catch (error) {
      console.error('Error funding appeal:', error)
      if (!isUserRejection(error)) errorToast(parseWagmiError(error) || 'Failed to fund appeal')
    }
  }

  const renderSideFacts = (side: PARTY) => {
    const fees = side === PARTY.REQUESTER ? requesterFees : challengerFees
    const isFunded = side === PARTY.REQUESTER ? hasPaidRequester : hasPaidChallenger
    const paid = side === PARTY.REQUESTER ? amountPaidRequester : amountPaidChallenger
    return (
      <SideFacts>
        <span>
          <strong>{formatValue(paid)}</strong> of{' '}
          {formatValue(fees.requiredForSide)} {nativeCurrency} raised
        </span>
        {!isFunded && (
          <span>
            Funding closes in <Deadline at={appealDeadlineFor(appeal, side)} />
          </span>
        )}
      </SideFacts>
    )
  }

  const renderContributionUI = (side: PARTY) => {
    const fees = side === PARTY.REQUESTER ? requesterFees : challengerFees
    const isFunded = side === PARTY.REQUESTER ? hasPaidRequester : hasPaidChallenger
    const isSelected = selectedSide === side
    const amountId = `${fieldId}-amount-${side}`
    const hintId = `${fieldId}-hint-${side}`

    if (isFunded) return null

    return (
      <ContributionSection>
        {!isSelected ? (
          <ContributeButton type="button" onClick={() => selectSide(side)}>
            Contribute to {partyLabel(appeal, side)}
          </ContributeButton>
        ) : (
          <>
            <ContributionLabel htmlFor={amountId}>Contribution amount</ContributionLabel>
            <SliderContainer>
              <Slider
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={contributionShare}
                aria-label={`Share of the ${formatValue(fees.amountStillRequired)} ${nativeCurrency} still needed`}
                aria-valuetext={`${Math.round(contributionShare * 1000) / 10}% of what is still needed`}
                onChange={(e) => {
                  setAmountText(undefined)
                  setContributionShare(parseFloat(e.target.value))
                }}
              />
            </SliderContainer>
            <InputGroup>
              <Input
                id={amountId}
                type="text"
                inputMode="decimal"
                autoComplete="off"
                aria-describedby={typedIsCapped || typedIsInvalid || typedIsZero ? hintId : undefined}
                aria-invalid={typedIsInvalid || undefined}
                value={amountText ?? (fees.amountStillRequired > 0n ? exactAmount(contributionAmount) : '0')}
                onChange={(e) => handleAmountChange(e.target.value, fees.amountStillRequired)}
              />
              <Unit>{nativeCurrency}</Unit>
            </InputGroup>
            {typedIsInvalid ? (
              <FieldHint id={hintId} $error role="alert">
                {/^\s*\d*[.,]?\d*\s*$/.test(amountText ?? '')
                  ? 'Enter an amount with at most 18 decimals.'
                  : `Enter an amount in ${nativeCurrency}, like 12.5.`}
              </FieldHint>
            ) : typedIsCapped ? (
              <FieldHint id={hintId}>
                Capped at {exactAmountLabel(fees.amountStillRequired)} {nativeCurrency}, the amount still needed.
              </FieldHint>
            ) : typedIsZero ? (
              <FieldHint id={hintId}>Enter an amount above 0.</FieldHint>
            ) : null}
            <ContributionInfo>
              <InfoRow>
                <span>Required for the {sideName(side)}:</span>
                <strong>{formatValue(fees.requiredForSide)} {nativeCurrency}</strong>
              </InfoRow>
              <InfoRow>
                <span>Already funded:</span>
                <strong>{formatValue(side === PARTY.REQUESTER ? amountPaidRequester : amountPaidChallenger)} {nativeCurrency}</strong>
              </InfoRow>
              <InfoRow>
                <span>Still needed:</span>
                <strong>{formatValue(fees.amountStillRequired)} {nativeCurrency}</strong>
              </InfoRow>
              <InfoRow style={{ marginTop: '8px', paddingTop: '8px', borderTop: `1px solid ${theme.hoverBackground}` }}>
                <span>Your reward if the {sideName(side)} wins:</span>
                <RewardAmount>{formatValue(potentialRewardForContribution)} {nativeCurrency}</RewardAmount>
              </InfoRow>
            </ContributionInfo>
            <EnsureChain>
              <ContributeButton
                type="button"
                onClick={handleFundAppeal}
                disabled={
                  isLoading ||
                  contributionAmount === 0n ||
                  (nativeBalance !== undefined && nativeBalance < contributionAmount)
                }
              >
                {isLoading ? 'Processing...' : `Fund ${exactAmountLabel(contributionAmount)} ${nativeCurrency}`}
              </ContributeButton>
            </EnsureChain>
            {nativeBalance !== undefined && contributionAmount > 0n && nativeBalance < contributionAmount && (
              <div style={{ color: theme.error, fontSize: 13, fontWeight: 500, marginTop: 8 }}>
                Insufficient balance. You have {formatValue(nativeBalance)} {nativeCurrency} but want to contribute {exactAmountLabel(contributionAmount)} {nativeCurrency}.
              </div>
            )}
            {nativeBalance !== undefined &&
              contributionAmount > 0n &&
              nativeBalance >= contributionAmount &&
              nativeBalance < contributionAmount + FEE_MARGIN && (
                <div role="status" style={{ color: theme.error, fontSize: 13, fontWeight: 500, marginTop: 8 }}>
                  Your {formatValue(nativeBalance)} {nativeCurrency} covers this contribution but may not cover the
                  network fee. Add a little {nativeCurrency} (0.01 is plenty), or contribute a little less.
                </div>
              )}
            {selectedSide !== PARTY.NONE && (
              <ContributeButton
                type="button"
                onClick={() => selectSide(PARTY.NONE)}
                style={{ marginTop: '8px', background: 'transparent', border: `1px solid ${theme.borderSubtle}`, color: 'inherit' }}
              >
                Cancel
              </ContributeButton>
            )}
          </>
        )}
      </ContributionSection>
    )
  }

  const renderSide = (side: PARTY) => {
    const fees = side === PARTY.REQUESTER ? requesterFees : challengerFees
    const isFunded = side === PARTY.REQUESTER ? hasPaidRequester : hasPaidChallenger
    const percentage = side === PARTY.REQUESTER ? requesterPercentage : challengerPercentage
    const other = side === PARTY.REQUESTER ? PARTY.CHALLENGER : PARTY.REQUESTER
    return (
      <Section>
        <SectionHeader>
          <Title>{partyLabel(appeal, side)}</Title>
          <StatusBadge funded={isFunded}>
            {isFunded ? '✓ Funded' : 'Funding'}
          </StatusBadge>
        </SectionHeader>
        <ProgressBarContainer>
          <ProgressBarFill
            percent={isFunded ? 100 : percentage}
            status={isFunded ? 'success' : 'active'}
          />
        </ProgressBarContainer>
        {renderSideFacts(side)}
        <Description>
          {isFunded
            ? `Fully funded. If the ${sideName(other)} is not fully funded too, the ${sideName(side)} wins.`
            : `Contribute to earn up to ${formatValue(fees.potentialReward)} ${nativeCurrency} if the ${sideName(side)} wins the dispute.`}
        </Description>
        {renderContributionUI(side)}
      </Section>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appeal Crowdfunding</CardTitle>
        <CardDescription>
          Anyone can fund either side&apos;s appeal fees. If both sides are fully funded, the appeal goes ahead:
          backers of the side that wins the dispute get their contribution back plus a share of the other
          side&apos;s fees, and backers of the other side lose theirs. If the appeal does not go ahead, every
          contribution is reimbursed.
        </CardDescription>
      </CardHeader>

      <Content>
        {renderSide(PARTY.REQUESTER)}
        {renderSide(PARTY.CHALLENGER)}

        <InfoBox>
          {appeal.decisive ? (
            <>
              The {sideName(appeal.loser)}, against the current ruling, must be fully funded by{' '}
              {formatTimestamp(appeal.half, true)}, and the {sideName(appeal.winner)} by{' '}
              {formatTimestamp(appeal.end, true)}.
            </>
          ) : (
            <>
              Jurors gave no decisive ruling, so both sides can be funded until{' '}
              {formatTimestamp(appeal.end, true)}.
            </>
          )}{' '}
          If only one side is fully funded, that side wins; if neither is, the current ruling stands. If the
          jurors end with no decisive ruling, backers get their contributions back, less their share of the
          court&apos;s appeal fee.
        </InfoBox>
      </Content>
    </Card>
  )
}

export default CrowdfundingCard
