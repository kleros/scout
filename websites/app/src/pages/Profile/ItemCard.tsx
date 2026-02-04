import React, { useMemo } from 'react'
import styled from 'styled-components'
import { formatEther } from 'ethers'
import { useNavigate, useLocation } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import AddressDisplay from 'components/AddressDisplay'
import { StyledButton } from 'components/Button'
import { revRegistryMap } from 'utils/items'
import { useScrollTop } from 'hooks/useScrollTop'
import useHumanizedCountdown, {
  useChallengeRemainingTime,
  useChallengePeriodDuration,
} from 'hooks/countdown'
import { shortenAddress } from 'utils/shortenAddress'
import { formatTimestamp } from 'utils/formatTimestamp'
import HourglassIcon from 'svgs/icons/hourglass.svg'
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
`

const HeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  white-space: nowrap;
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

const ViewButton = styled(StyledButton).attrs({ variant: 'secondary', size: 'medium' })`
  ${hoverLongTransitionTiming}
  min-width: 100px;
`

const StyledChainLabel = styled.span`
  margin-bottom: 8px;
`

const StyledChainContainer = styled(LabelValue)`
  margin-bottom: -8px;
`

const statusColors: Record<string, string> = {
  Included: '#65DC7F',
  Removed: '#FF5A78',
  'Registration Requested': '#60A5FA',
  'Removal Requested': '#FBBF24',
  Challenged: '#E87B35',
}

const readableStatus: Record<string, string> = {
  Registered: 'Included',
  Absent: 'Removed',
  RegistrationRequested: 'Registration Requested',
  ClearingRequested: 'Removal Requested',
}

const challengedStatus: Record<string, string> = {
  RegistrationRequested: 'Challenged',
  ClearingRequested: 'Challenged',
}

const getProp = (item: any, label: string) =>
  item?.props?.find((p: any) => p.label === label)?.value ?? ''

const ItemCard = ({ item }: { item: any }) => {
  const navigate = useNavigate()
  const scrollTop = useScrollTop()
  const location = useLocation()

  const registryName = revRegistryMap[item.registryAddress] ?? 'Unknown'

  const displayName =
    getProp(item, 'Name') ||
    getProp(item, 'Domain name') ||
    getProp(item, 'Public Name Tag') ||
    getProp(item, 'Description') ||
    item.itemID

  const statusText = item.disputed
    ? challengedStatus[item.status] || 'Challenged'
    : readableStatus[item.status] || item.status

  const bulletColor = statusColors[statusText] ?? '#9CA3AF'

  const submittedOn =
    item.requests?.[0]?.submissionTime != null
      ? formatTimestamp(Number(item.requests[0].submissionTime))
      : '-'

  const deposit =
    item.requests?.[0]?.deposit != null
      ? Number(formatEther(item.requests[0].deposit)).toLocaleString('en-US', {
          maximumFractionDigits: 0,
        })
      : '-'

  const requester = item.requests?.[0]?.requester ?? ''

  const chainId = getProp(item, 'EVM Chain ID')
  const itemAddrMap: Record<string, string | undefined> = {
    Single_Tags: getProp(item, 'Contract Address'),
    Tags_Queries: undefined,
    Tokens: getProp(item, 'Address'),
    CDN: getProp(item, 'Contract address'),
  }
  const itemAddr = itemAddrMap[registryName]

  const challengePeriodDuration = useChallengePeriodDuration(
    item.registryAddress,
  )
  const endsAtSeconds = useChallengeRemainingTime(
    item.requests?.[0]?.submissionTime,
    item.disputed,
    challengePeriodDuration,
  )
  const endsIn = useHumanizedCountdown(endsAtSeconds, 2)
  const isCountdownLoading = challengePeriodDuration === null && item.status !== 'Registered' && !item.disputed
  const showEndsIn = useMemo(
    () => (isCountdownLoading || Boolean(endsIn)) && item.status !== 'Registered' && !item.disputed,
    [isCountdownLoading, endsIn, item.status, item.disputed],
  )

  const onView = () => {
    const params = new URLSearchParams()
    params.append('status', 'Registered')
    params.append('status', 'RegistrationRequested')
    params.append('status', 'ClearingRequested')
    params.append('disputed', 'true')
    params.append('disputed', 'false')
    params.set('page', '1')
    params.set('orderDirection', 'desc')

    // Preserve the current location (profile path + params) so ItemDetails can navigate back correctly
    const currentSearch = new URLSearchParams(location.search)
    const userAddress = currentSearch.get('userAddress')

    if (userAddress) {
      params.set('userAddress', userAddress)
      // Also preserve the profile path (pending or resolved) so we know where to go back
      const profilePath = location.pathname.split('/').pop() // 'pending' or 'resolved'
      if (profilePath === 'pending' || profilePath === 'resolved') {
        params.set('fromProfile', profilePath)
      }
    }

    navigate(`/item/${item.id}?${params.toString()}`)
    scrollTop()
  }

  return (
    <Card>
      <Header>
        <HeaderLeft>
          <Title>{displayName}</Title>
          <Registry>({registryName})</Registry>
          <Bullet color={bulletColor} />
          <StatusLabel>{statusText}</StatusLabel>
        </HeaderLeft>
        {showEndsIn && (
          <HeaderRight>
            <HourglassIcon />
            {item.status === 'ClearingRequested' ? 'Will be removed in' : 'Will be included in'}: {isCountdownLoading ? <Skeleton width={60} /> : endsIn}
          </HeaderRight>
        )}
      </Header>

      <Divider />

      <Body>
        <MetaLine>
          <InfoRow>
            <LabelValue>
              <span>Submitted on:</span>
              <span>{submittedOn}</span>
            </LabelValue>

            {requester && (
              <LabelValue>
                <span>by {shortenAddress(requester)}</span>
              </LabelValue>
            )}

            <LabelValue>
              <span>Deposit:</span>
              <span>{deposit} xDAI</span>
            </LabelValue>

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

          <ViewButton onClick={onView}>View</ViewButton>
        </MetaLine>
      </Body>
    </Card>
  )
}

export default ItemCard
