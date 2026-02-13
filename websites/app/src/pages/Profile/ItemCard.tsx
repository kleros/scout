import React, { useMemo } from 'react'
import styled from 'styled-components'
import { formatEther } from 'ethers'
import { Link } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import AddressDisplay from 'components/AddressDisplay'
import SubmittedByLink from 'components/SubmittedByLink'
import { revRegistryMap, registryDisplayNames, buildItemPath, getPropValue, getItemAddress, getDisplayStatus } from 'utils/items'
import useHumanizedCountdown, {
  useChallengeRemainingTime,
  useChallengePeriodDuration,
} from 'hooks/countdown'
import { formatTimestamp } from 'utils/formatTimestamp'
import HourglassIcon from 'svgs/icons/hourglass.svg'
import { hoverLongTransitionTiming } from 'styles/commonStyles'
import useRegistryParameters from 'hooks/useRegistryParameters'

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

const ViewLink = styled(Link)`
  ${hoverLongTransitionTiming}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 9999px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  min-width: 100px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.buttonSecondaryBorder};
  color: ${({ theme }) => theme.primaryText};

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${({ theme }) => theme.primaryText};
    color: ${({ theme }) => theme.primaryText};
  }
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


const ItemCard = ({ item, fromProfile = 'pending' }: { item: any; fromProfile?: string }) => {

  const registryKey = revRegistryMap[item.registryAddress] ?? 'Unknown'
  const registryName = registryDisplayNames[registryKey] ?? registryKey
  const { data: registryParams } = useRegistryParameters(item.registryAddress)

  const displayName =
    getPropValue(item, 'Name') ||
    getPropValue(item, 'Domain name') ||
    getPropValue(item, 'Public Name Tag') ||
    getPropValue(item, 'Description') ||
    item.itemID

  const statusText = item.disputed ? 'Challenged' : getDisplayStatus(item.status, false)

  const bulletColor = statusColors[statusText] ?? '#9CA3AF'

  const submittedOn =
    item.requests?.[0]?.submissionTime != null
      ? formatTimestamp(Number(item.requests[0].submissionTime))
      : '-'

  const deposit = useMemo(() => {
    if (item.requests?.[0]?.deposit == null) return '-'
    const baseDeposit = BigInt(item.requests[0].deposit)
    const arbitrationCost = registryParams?.arbitrationCost ?? 0n
    const total = baseDeposit + arbitrationCost
    return Number(formatEther(total)).toLocaleString('en-US', {
      maximumFractionDigits: 2,
    })
  }, [item.requests, registryParams?.arbitrationCost])

  const requester = item.requests?.[0]?.requester ?? ''

  const chainId = getPropValue(item, 'EVM Chain ID')
  const itemAddr = getItemAddress(item, registryKey)

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

  const itemPath = buildItemPath(item.id)

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
                <span>by</span>
                <SubmittedByLink address={requester} />
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

          <ViewLink to={itemPath} state={{ fromApp: true, from: 'profile', profileTab: fromProfile }}>View</ViewLink>
        </MetaLine>
      </Body>
    </Card>
  )
}

export default ItemCard
