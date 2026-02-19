import React, { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { formatEther } from 'ethers'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import AddressDisplay from 'components/AddressDisplay'
import SubmittedByLink from 'components/SubmittedByLink'
import { revRegistryMap, registryDisplayNames, buildItemPath, getPropValue, getItemAddress, getItemDisplayStatus } from 'utils/items'
import useHumanizedCountdown, {
  useChallengeRemainingTime,
  useChallengePeriodDuration,
} from 'hooks/countdown'
import { formatTimestamp } from 'utils/formatTimestamp'
import HourglassIcon from 'svgs/icons/hourglass.svg'
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
`

const HeaderRight = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  white-space: nowrap;
`

const ItemCard = ({ item, fromProfile = 'pending' }: { item: any; fromProfile?: string }) => {
  const theme = useTheme()

  const statusColors: Record<string, string> = {
    Included: theme.statusIncluded,
    Removed: theme.statusAbsent,
    Rejected: theme.statusRejected,
    'Registration Requested': theme.statusRegistrationRequested,
    'Removal Requested': theme.statusClearingRequested,
    Challenged: theme.statusChallenged,
  }

  const registryKey = revRegistryMap[item.registryAddress] ?? 'Unknown'
  const registryName = registryDisplayNames[registryKey] ?? registryKey
  const { data: registryParams } = useRegistryParameters(item.registryAddress)

  const displayName =
    getPropValue(item, 'Name') ||
    getPropValue(item, 'Domain name') ||
    getPropValue(item, 'Public Name Tag') ||
    getPropValue(item, 'Description') ||
    item.itemID

  const statusText = getItemDisplayStatus(item)

  const bulletColor = statusColors[statusText] ?? theme.statusGray

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
