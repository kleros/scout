import React, { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { formatEther } from 'ethers'
import 'react-loading-skeleton/dist/skeleton.css'
import AddressDisplay from 'components/AddressDisplay'
import SubmittedByLink from 'components/SubmittedByLink'
import { revRegistryMap, registryDisplayNames, buildItemPath, getPropValue, getItemAddress } from 'utils/items'
import { formatTimestamp } from 'utils/formatTimestamp'
import { hoverLongTransitionTiming } from 'styles/commonStyles'
import useRegistryParameters from 'hooks/useRegistryParameters'
import {
  Card, Header, Bullet, Title, Registry, StatusLabel, Divider, Body,
  MetaLine, InfoRow, LabelValue, StyledChainLabel, StyledChainContainer, ViewLink,
} from './profileCardStyles'

const HeaderLeft = styled.div`
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  flex: 1;
`

const HeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

const RoleBadge = styled.span<{ role: 'requester' | 'challenger' | 'both' }>`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${({ role, theme }) =>
    role === 'challenger'
      ? theme.warning + '30'
      : role === 'requester'
      ? theme.secondaryBlue + '30'
      : theme.primaryPurple + '30'};
  color: ${({ role, theme }) =>
    role === 'challenger'
      ? theme.warning
      : role === 'requester'
      ? theme.secondaryBlue
      : theme.primaryPurple};
`

const OutcomeBadge = styled.span<{ outcome: 'won' | 'lost' | 'pending' | 'refused' }>`
  font-size: 12px;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 4px;
  background: ${({ outcome, theme }) =>
    outcome === 'won'
      ? `${theme.success}30`
      : outcome === 'lost'
      ? `${theme.error}30`
      : outcome === 'refused'
      ? theme.secondaryText + '30'
      : theme.warning + '30'};
  color: ${({ outcome, theme }) =>
    outcome === 'won'
      ? theme.success
      : outcome === 'lost'
      ? theme.error
      : outcome === 'refused'
      ? theme.secondaryText
      : theme.warning};
`

const ButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
`

const ViewCaseLink = styled.a`
  ${hoverLongTransitionTiming}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.secondaryPurple}80;
  color: ${({ theme }) => theme.secondaryPurple};

  &:hover {
    background: ${({ theme }) => theme.secondaryPurple}15;
    border-color: ${({ theme }) => theme.secondaryPurple};
    color: ${({ theme }) => theme.secondaryPurple};
  }
`

interface DisputeCardProps {
  item: any
  userAddress: string
}

const DisputeCard: React.FC<DisputeCardProps> = ({ item, userAddress }) => {
  const theme = useTheme()

  const statusColors: Record<string, string> = {
    'Active Dispute': theme.statusChallenged,
    Won: theme.success,
    Lost: theme.error,
    Refused: theme.statusGray,
  }

  const registryKey = revRegistryMap[item.registryAddress] ?? 'Unknown'
  const registryName = registryDisplayNames[registryKey] ?? registryKey
  const request = item.requests?.[0]
  const userRole = item.userRole as 'requester' | 'challenger' | 'both'
  const { data: registryParams } = useRegistryParameters(item.registryAddress)

  const displayName =
    getPropValue(item, 'Name') ||
    getPropValue(item, 'Domain name') ||
    getPropValue(item, 'Public Name Tag') ||
    getPropValue(item, 'Description') ||
    item.itemID

  // Determine outcome for the user
  const outcome = useMemo(() => {
    if (!request?.resolved) return 'pending'

    const disputeOutcome = request.disputeOutcome
    if (disputeOutcome === 'None' || disputeOutcome === 'Refuse') return 'refused'

    // Accept = requester wins, Reject = challenger wins
    if (userRole === 'requester') {
      return disputeOutcome === 'Accept' ? 'won' : 'lost'
    } else if (userRole === 'challenger') {
      return disputeOutcome === 'Reject' ? 'won' : 'lost'
    } else {
      // Both roles - show as won if either role won (edge case)
      return 'pending'
    }
  }, [request, userRole])

  const statusText = request?.resolved
    ? outcome === 'won'
      ? 'Won'
      : outcome === 'lost'
      ? 'Lost'
      : 'Refused'
    : 'Active Dispute'

  const bulletColor = statusColors[statusText] ?? theme.statusGray

  const disputeDate =
    request?.submissionTime != null
      ? formatTimestamp(Number(request.submissionTime))
      : '-'

  const deposit = useMemo(() => {
    if (request?.deposit == null) return '-'
    const baseDeposit = BigInt(request.deposit)
    const arbitrationCost = registryParams?.arbitrationCost ?? 0n
    const total = baseDeposit + arbitrationCost
    return Number(formatEther(total)).toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })
  }, [request?.deposit, registryParams?.arbitrationCost])

  const requester = request?.requester ?? ''
  const challenger = request?.challenger ?? ''
  const disputeID = request?.disputeID

  const chainId = getPropValue(item, 'EVM Chain ID')
  const itemAddr = getItemAddress(item, registryKey)

  const itemUrl = buildItemPath(item.id)

  const roleLabel =
    userRole === 'requester'
      ? 'Submitter'
      : userRole === 'challenger'
      ? 'Challenger'
      : 'Both'

  const requestTypeLabel =
    request?.requestType === 'RegistrationRequested'
      ? 'Registration'
      : request?.requestType === 'ClearingRequested'
      ? 'Removal'
      : 'Request'

  return (
    <Card>
      <Header>
        <HeaderLeft>
          <Title>{displayName}</Title>
          <Registry>({registryName})</Registry>
          <Bullet color={bulletColor} />
          <StatusLabel>{statusText}</StatusLabel>
        </HeaderLeft>
        <HeaderRight>
          <RoleBadge role={userRole}>{roleLabel}</RoleBadge>
          {request?.resolved && (
            <OutcomeBadge outcome={outcome}>{outcome === 'won' ? 'Won' : outcome === 'lost' ? 'Lost' : 'Refused'}</OutcomeBadge>
          )}
        </HeaderRight>
      </Header>

      <Divider />

      <Body>
        <MetaLine>
          <InfoRow>
            <LabelValue>
              <span>Dispute Type:</span>
              <span>{requestTypeLabel}</span>
            </LabelValue>

            <LabelValue>
              <span>Challenged on:</span>
              <span>{disputeDate}</span>
            </LabelValue>

            {disputeID && (
              <LabelValue>
                <span>Case #{disputeID}</span>
              </LabelValue>
            )}

            <LabelValue>
              <span>Deposit:</span>
              <span>{deposit} xDAI</span>
            </LabelValue>

            {userRole === 'requester' && challenger && (
              <LabelValue>
                <span>Challenger:</span>
                <SubmittedByLink address={challenger} />
              </LabelValue>
            )}

            {userRole === 'challenger' && requester && (
              <LabelValue>
                <span>Submitter:</span>
                <SubmittedByLink address={requester} />
              </LabelValue>
            )}

            {chainId && (
              <StyledChainContainer>
                <StyledChainLabel>Chain:</StyledChainLabel>
                <AddressDisplay address={`eip155:${chainId}`} />
              </StyledChainContainer>
            )}

            {itemAddr && (
              <StyledChainContainer>
                <StyledChainLabel>Chain:</StyledChainLabel>
                <AddressDisplay address={itemAddr} />
              </StyledChainContainer>
            )}
          </InfoRow>

          <ButtonsContainer>
            {disputeID && (
              <ViewCaseLink
                href={`https://klerosboard.com/100/cases/${disputeID}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Case
              </ViewCaseLink>
            )}
            <ViewLink to={itemUrl} state={{ fromApp: true, from: 'profile', profileTab: 'disputes' }}>View Item</ViewLink>
          </ButtonsContainer>
        </MetaLine>
      </Body>
    </Card>
  )
}

export default DisputeCard
