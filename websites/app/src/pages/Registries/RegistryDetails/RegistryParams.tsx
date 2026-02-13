import React, { useMemo } from 'react'
import styled from 'styled-components'
import { formatEther } from 'ethers'
import humanizeDuration from 'humanize-duration'
import { responsiveSize } from 'styles/responsiveSize'
import { FocusedRegistry } from 'utils/itemCounts'
import { useItemCountsQuery } from 'hooks/queries'
import Skeleton from 'react-loading-skeleton'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding: 20px ${responsiveSize(16, 24)};
  background: ${({ theme }) => theme.whiteBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
`

const Title = styled.h3`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

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

const Tooltip = styled.span`
  position: relative;
  cursor: help;
  border-bottom: 1px dotted ${({ theme }) => theme.secondaryText};

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    background: ${({ theme }) => theme.backgroundThree};
    color: ${({ theme }) => theme.primaryText};
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 400;
    white-space: normal;
    width: max-content;
    max-width: 280px;
    z-index: 10;
    line-height: 1.4;
    pointer-events: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    border: 1px solid ${({ theme }) => theme.stroke};
  }
`

const truncateAddress = (addr: string) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`

const formatDeposit = (base: bigint, arbitrationCost: bigint): string =>
  `${Number(formatEther(base + arbitrationCost))} xDAI`

const formatDuration = (seconds: number): string =>
  humanizeDuration(seconds * 1000, { largest: 2, round: true, units: ['d', 'h', 'm'] })

interface RegistryParamsProps {
  registryName?: string
}

const RegistryParams: React.FC<RegistryParamsProps> = ({ registryName }) => {
  const { data: countsData, isLoading } = useItemCountsQuery()

  const registry: FocusedRegistry | undefined = useMemo(() => {
    if (!registryName || !countsData) return undefined
    return countsData[registryName]
  }, [registryName, countsData])

  if (isLoading || !registry?.deposits) {
    return (
      <Container>
        <Title>List Parameters</Title>
        <ParamsGrid>
          {Array.from({ length: 10 }).map((_, i) => (
            <ParamItem key={i}>
              <Skeleton width={120} height={12} />
              <Skeleton width={90} height={16} />
            </ParamItem>
          ))}
        </ParamsGrid>
      </Container>
    )
  }

  const { deposits } = registry

  // timesPerPeriod: [evidence, commit, vote, appeal]
  const disputeDuration = deposits.timesPerPeriod[0] + deposits.timesPerPeriod[1] + deposits.timesPerPeriod[2]
  const appealDuration = deposits.timesPerPeriod[3]

  return (
    <Container>
      <Title>List Parameters</Title>
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
          <ParamValue>{formatDuration(Number(deposits.challengePeriodDuration))}</ParamValue>
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
          <ParamValue>{disputeDuration > 0 ? formatDuration(disputeDuration) : '—'}</ParamValue>
        </ParamItem>
        <ParamItem>
          <Tooltip data-tooltip="Time available to fund an appeal after each round. The losing side gets the full period; the winning side gets half.">
            <ParamLabel>Appeal Duration</ParamLabel>
          </Tooltip>
          <ParamValue>{appealDuration > 0 ? formatDuration(appealDuration) : '—'}</ParamValue>
        </ParamItem>
        <ParamItem>
          <Tooltip data-tooltip="Amount required for a submission. Fully refunded if you pass the challenge period or win a dispute.">
            <ParamLabel>Submission Deposit</ParamLabel>
          </Tooltip>
          <ParamValue>{formatDeposit(deposits.submissionBaseDeposit, deposits.arbitrationCost)}</ParamValue>
        </ParamItem>
        <ParamItem>
          <Tooltip data-tooltip="Deposit needed to challenge a submission. Fully refunded if the challenger wins the dispute.">
            <ParamLabel>Challenge Deposit</ParamLabel>
          </Tooltip>
          <ParamValue>{formatDeposit(deposits.submissionChallengeBaseDeposit, deposits.arbitrationCost)}</ParamValue>
        </ParamItem>
        <ParamItem>
          <Tooltip data-tooltip="The reward for challengers who spot incorrect entries. Increases with multiple dispute rounds.">
            <ParamLabel>Minimum Bounty</ParamLabel>
          </Tooltip>
          <ParamValue>{Number(formatEther(deposits.submissionBaseDeposit))} xDAI</ParamValue>
        </ParamItem>
        <ParamItem>
          <Tooltip data-tooltip="Deposit to request removal of a registered entry. Fully refunded if the challenge period passes or you win a dispute.">
            <ParamLabel>Removal Request Deposit</ParamLabel>
          </Tooltip>
          <ParamValue>{formatDeposit(deposits.removalBaseDeposit, deposits.arbitrationCost)}</ParamValue>
        </ParamItem>
      </ParamsGrid>
    </Container>
  )
}

export default RegistryParams
