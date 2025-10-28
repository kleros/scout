import React, { useState, useMemo } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { formatEther, parseEther } from 'ethers'
import { STATUS_CODE, PARTY, SUBGRAPH_RULING } from '../../utils/itemStatus'
import useRequiredFees from '../../hooks/useRequiredFees'
import useNativeCurrency from '../../hooks/useNativeCurrency'
import { useCurateInteractions } from '../../hooks/contracts/useCurateInteractions'
import { GraphItemDetails } from '../../utils/itemDetails'
import { errorToast } from '../../utils/wrapWithToast'

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
`

const Modal = styled.div`
  position: relative;
  background: ${({ theme }) => theme.modalBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  backdrop-filter: blur(50px);
  color: ${({ theme }) => theme.primaryText};
  border-radius: 20px;
  padding: 32px;
  width: 90vw;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);

  ${landscapeStyle(
    () => css`
      width: 70%;
    `
  )}
`

const Title = styled.h2`
  margin: 0 0 24px;
  font-size: 24px;
  font-weight: 700;
`

const Description = styled.p`
  margin: 16px 0;
  line-height: 1.6;
  font-size: 14px;
`

const SliderContainer = styled.div`
  margin: 24px 0;
`

const SliderLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
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
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.secondaryPurple};
    cursor: pointer;
    transition: background 0.2s;

    &:hover {
      background: ${({ theme }) => theme.lavenderPurple};
    }
  }

  &::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: ${({ theme }) => theme.secondaryPurple};
    cursor: pointer;
    border: none;
    transition: background 0.2s;

    &:hover {
      background: ${({ theme }) => theme.lavenderPurple};
    }
  }
`

const InputGroup = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  margin: 16px 0;
`

const Input = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: ${({ theme }) => theme.primaryText};
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.stroke};
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
`

const InfoSection = styled.div`
  margin: 24px 0;
  padding: 16px;
  background: ${({ theme }) => theme.backgroundFour};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.stroke};
`

const InfoRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${({ theme }) => theme.lightGrey};

  &:last-child {
    border-bottom: none;
  }
`

const InfoLabel = styled.span`
  font-weight: 600;
`

const InfoValue = styled.span`
  text-align: right;
`

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`

const Button = styled.button<{ primary?: boolean }>`
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 9999px;
  font-size: 16px;
  font-weight: 600;
  font-family: "Open Sans", sans-serif;
  cursor: pointer;
  transition: all 0.2s;

  ${({ primary, theme }) =>
    primary
      ? `
    background: ${theme.buttonWhite};
    color: ${theme.black};
    &:hover {
      background: ${theme.buttonWhiteHover};
    }
    &:active {
      background: ${theme.buttonWhiteActive};
    }
    &:disabled {
      background: ${theme.buttonDisabled};
      color: ${theme.buttonDisabledText};
      border: 1px solid ${theme.buttonDisabled};
      cursor: not-allowed;
    }
  `
      : `
    background: transparent;
    color: ${theme.primaryText};
    border: 1px solid ${theme.lightGrey};
    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }
  `}
`

const SideSelectionButton = styled(Button)`
  margin: 8px 0;
`

const Link = styled.a`
  color: ${({ theme }) => theme.secondaryPurple};
  text-decoration: underline;

  &:hover {
    color: ${({ theme }) => theme.lavenderPurple};
  }
`

const Skeleton = styled.div`
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.2) 50%, rgba(255, 255, 255, 0.1) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
  height: 20px;
  margin: 8px 0;

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`

interface CrowdfundModalProps {
  isOpen: boolean
  onClose: () => void
  statusCode: STATUS_CODE | null
  item: GraphItemDetails | null
  fileURI?: string
  appealCost: bigint | null | undefined
  appealCostError: boolean
  appealCostLoading: boolean
  registryParametersError: boolean
  registryParametersLoading: boolean
  sharedStakeMultiplier: bigint | undefined
  winnerStakeMultiplier: bigint | undefined
  loserStakeMultiplier: bigint | undefined
  MULTIPLIER_DIVISOR: bigint | undefined
  registryAddress: string
}

const CrowdfundModal: React.FC<CrowdfundModalProps> = ({
  isOpen,
  onClose,
  statusCode,
  item,
  fileURI,
  appealCost,
  appealCostError,
  appealCostLoading,
  registryParametersError,
  registryParametersLoading,
  sharedStakeMultiplier,
  winnerStakeMultiplier,
  loserStakeMultiplier,
  MULTIPLIER_DIVISOR,
  registryAddress,
}) => {
  const [contributionShare, setContributionShare] = useState(1)
  const [userSelectedSide, setUserSelectedSide] = useState<PARTY>(PARTY.NONE)
  const nativeCurrency = useNativeCurrency()
  const { fundAppeal, isLoading } = useCurateInteractions()

  const round = item?.requests?.[0]?.rounds?.[0]
  const { hasPaidRequester, hasPaidChallenger, ruling } = round || {}

  // Auto-select side based on status and funding state (matching gtcr logic)
  const autoSelectedSide = useMemo(() => {
    if (!round) return PARTY.NONE

    const isNoRuling = ruling === SUBGRAPH_RULING.NONE || ruling === 'Refuse' ||
                       ruling === SUBGRAPH_RULING.NONE_NUM || ruling === 'None'

    // If no ruling or both sides funded/unfunded, don't auto-select
    if (
      isNoRuling ||
      (hasPaidRequester && hasPaidChallenger) ||
      (!hasPaidRequester && !hasPaidChallenger)
    ) {
      return PARTY.NONE
    }

    // If in winner-only period, auto-select the winning side
    if (statusCode === STATUS_CODE.CROWDFUNDING_WINNER) {
      const isAccept = ruling === SUBGRAPH_RULING.ACCEPT || ruling === SUBGRAPH_RULING.ACCEPT_NUM
      return isAccept ? PARTY.REQUESTER : PARTY.CHALLENGER
    }

    // If one side is fully funded, auto-select the unfunded side
    return !hasPaidRequester ? PARTY.REQUESTER : PARTY.CHALLENGER
  }, [round, hasPaidRequester, hasPaidChallenger, ruling, statusCode])

  // Use user selection if available, otherwise use auto-selection
  const side = userSelectedSide !== PARTY.NONE ? userSelectedSide : autoSelectedSide

  const requiredFees = useRequiredFees({
    side,
    sharedStakeMultiplier,
    winnerStakeMultiplier,
    loserStakeMultiplier,
    currentRuling: ruling || SUBGRAPH_RULING.NONE,
    item: item as any,
    MULTIPLIER_DIVISOR,
    appealCost,
  })

  if (!isOpen) return null

  // Error state
  if (appealCostError || registryParametersError) {
    return (
      <ModalOverlay onClick={onClose}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <Title>Unable to Load Appeal Data</Title>
          <Description>
            We couldn't fetch the appeal information. The dispute might not be in an appealable state,
            or there may be network issues.
          </Description>
          <ButtonGroup>
            <Button primary onClick={onClose}>Close</Button>
          </ButtonGroup>
        </Modal>
      </ModalOverlay>
    )
  }

  // Loading state with skeletons
  const isDataLoading = appealCostLoading || registryParametersLoading || !appealCost || !sharedStakeMultiplier || !winnerStakeMultiplier || !loserStakeMultiplier

  if (isDataLoading) {
    return (
      <ModalOverlay onClick={onClose}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <Title>Fund Appeal</Title>
          <Description>Loading appeal data...</Description>
          <Skeleton style={{ height: 60, margin: '16px 0' }} />
          <Skeleton style={{ height: 40, margin: '16px 0' }} />
          <Skeleton style={{ height: 100, margin: '16px 0' }} />
          <ButtonGroup>
            <Button onClick={onClose}>Cancel</Button>
          </ButtonGroup>
        </Modal>
      </ModalOverlay>
    )
  }

  // Side selection screen - only show if no auto-selection
  if (side === PARTY.NONE) {
    return (
      <ModalOverlay onClick={onClose}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <Title>Fund Appeal</Title>
          <Description>Which side do you want to fund?</Description>
          {fileURI && (
            <Description>
              Read the{' '}
              <Link href={fileURI} target="_blank" rel="noopener noreferrer">
                Listing Criteria
              </Link>{' '}
              to make an informed decision.
            </Description>
          )}
          <ButtonGroup style={{ flexDirection: 'column' }}>
            <SideSelectionButton primary onClick={() => setUserSelectedSide(PARTY.REQUESTER)}>
              Fund Submitter
            </SideSelectionButton>
            <SideSelectionButton primary onClick={() => setUserSelectedSide(PARTY.CHALLENGER)}>
              Fund Challenger
            </SideSelectionButton>
          </ButtonGroup>
          <ButtonGroup>
            <Button onClick={onClose}>Cancel</Button>
          </ButtonGroup>
        </Modal>
      </ModalOverlay>
    )
  }

  // Main contribution form
  if (!requiredFees) {
    return (
      <ModalOverlay onClick={onClose}>
        <Modal onClick={(e) => e.stopPropagation()}>
          <Title>Error</Title>
          <Description>Unable to calculate required fees. Please try again.</Description>
          <ButtonGroup>
            <Button onClick={() => setUserSelectedSide(PARTY.NONE)}>Go Back</Button>
            <Button primary onClick={onClose}>Close</Button>
          </ButtonGroup>
        </Modal>
      </ModalOverlay>
    )
  }

  const amountPaid = BigInt(
    side === PARTY.REQUESTER ? round?.amountPaidRequester || '0' : round?.amountPaidChallenger || '0'
  )

  // Calculate contribution amount based on share
  // Use MULTIPLIER_DIVISOR for precision to match gtcr
  const contributionAmount = requiredFees.amountStillRequired > 0n
    ? (requiredFees.amountStillRequired * BigInt(Math.ceil(contributionShare * Number(MULTIPLIER_DIVISOR)))) / MULTIPLIER_DIVISOR
    : 0n

  const potentialRewardForContribution =
    requiredFees.potentialReward > 0n
      ? (requiredFees.potentialReward * BigInt(Math.ceil(contributionShare * Number(MULTIPLIER_DIVISOR)))) / MULTIPLIER_DIVISOR
      : 0n

  const handleFundAppeal = async () => {
    if (!item || side === PARTY.NONE || contributionAmount === 0n) return

    try {
      await fundAppeal(registryAddress as `0x${string}`, item.itemID, side, contributionAmount)
      setUserSelectedSide(PARTY.NONE)
      setContributionShare(1)
      onClose()
    } catch (error) {
      console.error('Error funding appeal:', error)
      errorToast(error instanceof Error ? error.message : 'Failed to fund appeal')
    }
  }

  return (
    <ModalOverlay onClick={onClose}>
      <Modal onClick={(e) => e.stopPropagation()}>
        <Title>Contribute to {side === PARTY.REQUESTER ? 'Submitter' : 'Challenger'}</Title>

        <Description>
          Contribute {nativeCurrency} for a chance to win up to{' '}
          <strong>
            {Number(formatEther(potentialRewardForContribution)).toFixed(4)} {nativeCurrency}
          </strong>{' '}
          if this side wins the appeal.
        </Description>

        <SliderContainer>
          <SliderLabel>Contribution Amount</SliderLabel>
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
            max={Number(formatEther(requiredFees.amountStillRequired))}
            step="0.01"
            value={
              requiredFees.amountStillRequired > 0n
                ? (contributionShare * Number(formatEther(requiredFees.amountStillRequired))).toFixed(4)
                : '0'
            }
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0
              if (requiredFees.amountStillRequired > 0n) {
                const weiAmount = parseEther(value.toString())
                const share = Number((weiAmount * MULTIPLIER_DIVISOR) / requiredFees.amountStillRequired) / Number(MULTIPLIER_DIVISOR)
                setContributionShare(Math.min(Math.max(share, 0), 1))
              }
            }}
          />
          <Unit>{nativeCurrency}</Unit>
        </InputGroup>

        <InfoSection>
          <InfoRow>
            <InfoLabel>Total Required:</InfoLabel>
            <InfoValue>
              {Number(formatEther(requiredFees.requiredForSide)).toFixed(4)} {nativeCurrency}
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Already Paid:</InfoLabel>
            <InfoValue>
              {Number(formatEther(amountPaid)).toFixed(4)} {nativeCurrency}
            </InfoValue>
          </InfoRow>
          <InfoRow>
            <InfoLabel>Still Needed:</InfoLabel>
            <InfoValue>
              {Number(formatEther(requiredFees.amountStillRequired)).toFixed(4)} {nativeCurrency}
            </InfoValue>
          </InfoRow>
        </InfoSection>

        <ButtonGroup>
          <Button onClick={() => setUserSelectedSide(PARTY.NONE)}>Change Side</Button>
          <Button primary onClick={handleFundAppeal} disabled={isLoading || contributionAmount === 0n}>
            {isLoading ? 'Processing...' : `Fund ${Number(formatEther(contributionAmount)).toFixed(4)} ${nativeCurrency}`}
          </Button>
        </ButtonGroup>
      </Modal>
    </ModalOverlay>
  )
}

export default CrowdfundModal
