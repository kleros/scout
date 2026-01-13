import React, { useMemo } from 'react'
import styled from 'styled-components'
import { format } from 'date-fns'
import { formatEther } from 'ethers'
import { useLocation, Link } from 'react-router-dom'
import 'react-loading-skeleton/dist/skeleton.css'
import AddressDisplay from 'components/AddressDisplay'
import { revRegistryMap } from 'utils/items'
import { shortenAddress } from 'utils/shortenAddress'
import { hoverLongTransitionTiming } from 'styles/commonStyles'

const Card = styled.div`
  width: 100%;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  background: transparent;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  flex-wrap: wrap;
`

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

const Bullet = styled.span<{ color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ color }) => color};
  flex: 0 0 8px;
`

const Title = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`

const Registry = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
`

const StatusLabel = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.primaryText};
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
      ? '#65DC7F30'
      : outcome === 'lost'
      ? '#FF5A7830'
      : outcome === 'refused'
      ? theme.secondaryText + '30'
      : theme.warning + '30'};
  color: ${({ outcome, theme }) =>
    outcome === 'won'
      ? '#65DC7F'
      : outcome === 'lost'
      ? '#FF5A78'
      : outcome === 'refused'
      ? theme.secondaryText
      : theme.warning};
`

const Divider = styled.hr`
  border: none;
  border-top: 1px solid ${({ theme }) => theme.stroke};
  margin: 0;
`

const Body = styled.div`
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const MetaLine = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
`

const InfoRow = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  flex: 1;
  min-width: 0;
`

const LabelValue = styled.span`
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
`

const ButtonsContainer = styled.div`
  display: flex;
  gap: 8px;
`

const ViewItemLink = styled(Link)`
  ${hoverLongTransitionTiming}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.buttonSecondaryBorder};
  color: ${({ theme }) => theme.primaryText};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${({ theme }) => theme.primaryText};
    color: ${({ theme }) => theme.primaryText};
  }
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

const StyledChainLabel = styled.span`
  margin-bottom: 8px;
`

const StyledChainContainer = styled(LabelValue)`
  margin-bottom: -8px;
`

const statusColors: Record<string, string> = {
  'Active Dispute': '#E87B35',
  Won: '#65DC7F',
  Lost: '#FF5A78',
  Refused: '#9CA3AF',
}

const getProp = (item: any, label: string) =>
  item?.props?.find((p: any) => p.label === label)?.value ?? ''

interface DisputeCardProps {
  item: any
  userAddress: string
}

const DisputeCard: React.FC<DisputeCardProps> = ({ item, userAddress }) => {
  const location = useLocation()

  const registryName = revRegistryMap[item.registryAddress] ?? 'Unknown'
  const request = item.requests?.[0]
  const userRole = item.userRole as 'requester' | 'challenger' | 'both'

  const displayName =
    getProp(item, 'Name') ||
    getProp(item, 'Domain name') ||
    getProp(item, 'Public Name Tag') ||
    getProp(item, 'Description') ||
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

  const bulletColor = statusColors[statusText] ?? '#9CA3AF'

  const disputeDate =
    request?.submissionTime != null
      ? format(new Date(Number(request.submissionTime) * 1000), 'PP')
      : '-'

  const deposit =
    request?.deposit != null
      ? Number(formatEther(request.deposit)).toLocaleString('en-US', {
          maximumFractionDigits: 0,
        })
      : '-'

  const requester = request?.requester ?? ''
  const challenger = request?.challenger ?? ''
  const disputeID = request?.disputeID

  const chainId = getProp(item, 'EVM Chain ID')
  const itemAddrMap: Record<string, string | undefined> = {
    Single_Tags: getProp(item, 'Contract Address'),
    Tags_Queries: undefined,
    Tokens: getProp(item, 'Address'),
    CDN: getProp(item, 'Contract address'),
  }
  const itemAddr = itemAddrMap[registryName]

  // Build the item URL for the link
  const itemUrl = useMemo(() => {
    const params = new URLSearchParams()
    params.append('status', 'Registered')
    params.append('status', 'RegistrationRequested')
    params.append('status', 'ClearingRequested')
    params.append('disputed', 'true')
    params.append('disputed', 'false')
    params.set('page', '1')
    params.set('orderDirection', 'desc')

    const currentSearch = new URLSearchParams(location.search)
    const userAddressParam = currentSearch.get('userAddress')

    if (userAddressParam) {
      params.set('userAddress', userAddressParam)
      params.set('fromActivity', 'disputes')
    }

    return `/item/${item.id}?${params.toString()}`
  }, [item.id, location.search])

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
                <span>{shortenAddress(challenger)}</span>
              </LabelValue>
            )}

            {userRole === 'challenger' && requester && (
              <LabelValue>
                <span>Submitter:</span>
                <span>{shortenAddress(requester)}</span>
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
            <ViewItemLink to={itemUrl}>View Item</ViewItemLink>
          </ButtonsContainer>
        </MetaLine>
      </Body>
    </Card>
  )
}

export default DisputeCard
