import React, { useMemo, useRef } from 'react'
import styled from 'styled-components'
import { formatEther } from 'ethers'
import humanizeDuration from 'humanize-duration'
import Skeleton from 'react-loading-skeleton'
import { FocusedRegistry } from 'utils/itemCounts'
import { useItemCountsQuery } from 'hooks/queries'
import { useFocusOutside } from 'hooks/useFocusOutside'
import BaseTooltip from 'components/Tooltip'
import { ModalButton } from 'components/ModalButtons'
import {
  ModalOverlay,
  ModalWrapper,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
  FooterButtons,
} from 'components/ModalComponents'

const ParamsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 32px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`

const ParamItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const ParamLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
`

const ParamValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const ParamLink = styled.a`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryBlue};
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.secondaryBlue};
    text-decoration: underline;
  }
`

const Tooltip = styled(BaseTooltip)`
  border-bottom: 1px dotted ${({ theme }) => theme.secondaryText};
`

const truncateAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`

const formatDeposit = (base: bigint, arbitrationCost: bigint): string =>
  `${Number(formatEther(base + arbitrationCost))} xDAI`

const formatDuration = (seconds: number): string =>
  humanizeDuration(seconds * 1000, {
    largest: 2,
    round: true,
    units: ['d', 'h', 'm'],
  })

interface ParametersModalProps {
  registryName?: string
  onClose: () => void
}

const ParametersModal: React.FC<ParametersModalProps> = ({
  registryName,
  onClose,
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const { data: countsData, isLoading } = useItemCountsQuery()

  useFocusOutside(modalRef, onClose)

  const registry: FocusedRegistry | undefined = useMemo(() => {
    if (!registryName || !countsData) return undefined
    return countsData[registryName]
  }, [registryName, countsData])

  const deposits = registry?.deposits

  const disputeDuration =
    deposits?.timesPerPeriod
      ? deposits.timesPerPeriod[0] +
        deposits.timesPerPeriod[1] +
        deposits.timesPerPeriod[2]
      : 0
  const appealDuration = deposits?.timesPerPeriod?.[3] ?? 0

  return (
    <ModalOverlay>
      <ModalWrapper>
        <ModalContainer ref={modalRef}>
          <ModalHeader>
            <ModalTitle>List Parameters</ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>

          {isLoading || !deposits ? (
            <ParamsGrid>
              {Array.from({ length: 10 }).map((_, i) => (
                <ParamItem key={i}>
                  <Skeleton width={120} height={12} />
                  <Skeleton width={90} height={16} />
                </ParamItem>
              ))}
            </ParamsGrid>
          ) : (
            <ParamsGrid>
              <ParamItem>
                <Tooltip data-tooltip="The address that controls this registry. It can change all parameters at any given time.">
                  <ParamLabel>Governor</ParamLabel>
                </Tooltip>
                <ParamLink
                  href={`https://gnosisscan.io/address/${deposits.governor}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {truncateAddress(deposits.governor)}
                </ParamLink>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="The court where disputes are resolved. If appealed, the case may jump to a higher court.">
                  <ParamLabel>Reference Court</ParamLabel>
                </Tooltip>
                <ParamValue>{deposits.courtName}</ParamValue>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="The time required for an item to be registered. This is the window challengers have to flag your submission.">
                  <ParamLabel>Challenge Period</ParamLabel>
                </Tooltip>
                <ParamValue>
                  {formatDuration(Number(deposits.challengePeriodDuration))}
                </ParamValue>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="How many jurors will be drawn in the first round. In case of appeals, the number of jurors increases per round.">
                  <ParamLabel>Nr. of Jurors (1st Round)</ParamLabel>
                </Tooltip>
                <ParamValue>{deposits.numberOfJurors}</ParamValue>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="How long it takes to resolve the first round of a dispute (evidence + commit + vote periods).">
                  <ParamLabel>Dispute Duration</ParamLabel>
                </Tooltip>
                <ParamValue>
                  {disputeDuration > 0 ? formatDuration(disputeDuration) : '—'}
                </ParamValue>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="Time available to fund an appeal after each round. The losing side gets the full period; the winning side gets half.">
                  <ParamLabel>Appeal Duration</ParamLabel>
                </Tooltip>
                <ParamValue>
                  {appealDuration > 0 ? formatDuration(appealDuration) : '—'}
                </ParamValue>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="Amount required for a submission. Fully refunded if you pass the challenge period or win a dispute.">
                  <ParamLabel>Submission Deposit</ParamLabel>
                </Tooltip>
                <ParamValue>
                  {formatDeposit(
                    deposits.submissionBaseDeposit,
                    deposits.arbitrationCost,
                  )}
                </ParamValue>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="Deposit needed to challenge a submission. Fully refunded if the challenger wins the dispute.">
                  <ParamLabel>Challenge Deposit</ParamLabel>
                </Tooltip>
                <ParamValue>
                  {formatDeposit(
                    deposits.submissionChallengeBaseDeposit,
                    deposits.arbitrationCost,
                  )}
                </ParamValue>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="The reward for challengers who spot incorrect entries. Increases with multiple dispute rounds.">
                  <ParamLabel>Minimum Bounty</ParamLabel>
                </Tooltip>
                <ParamValue>
                  {Number(formatEther(deposits.submissionBaseDeposit))} xDAI
                </ParamValue>
              </ParamItem>
              <ParamItem>
                <Tooltip data-tooltip="Deposit to request removal of a registered entry. Fully refunded if the challenge period passes or you win a dispute.">
                  <ParamLabel>Removal Request Deposit</ParamLabel>
                </Tooltip>
                <ParamValue>
                  {formatDeposit(
                    deposits.removalBaseDeposit,
                    deposits.arbitrationCost,
                  )}
                </ParamValue>
              </ParamItem>
            </ParamsGrid>
          )}

          <FooterButtons>
            <ModalButton variant="secondary" onClick={onClose}>
              Close
            </ModalButton>
          </FooterButtons>
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  )
}

export default ParametersModal
