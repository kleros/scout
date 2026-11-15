import React, { useMemo } from 'react'
import styled, { useTheme } from 'styled-components'
import { useLocation } from 'react-router-dom'
import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import AddressDisplay from 'components/AddressDisplay'
import SubmittedByLink from 'components/SubmittedByLink'
import { revRegistryMap, registryDisplayNames, buildItemPath, getPropValue, getItemAddress, getItemDisplayStatus } from 'utils/items'
import { useTimeLeft } from 'hooks/countdown'
import { formatTimestamp } from 'utils/formatTimestamp'
import { formatValue } from 'utils/formatValue'
import HourglassIcon from 'svgs/icons/hourglass.svg'
import useRegistryParameters from 'hooks/useRegistryParameters'
import { useCurateRewards } from 'hooks/useCurateRewards'
import { getItemRewardTotal } from 'utils/rewardedItems'
import {
  Card, Header, Bullet, Title, Registry, StatusLabel, Divider, Body,
  MetaLine, InfoRow, LabelValue, StyledChainLabel, StyledChainContainer, ViewLink,
  ActionsGroup, RewardedBadge, DateValue,
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
  flex-wrap: wrap;
  gap: 4px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;

  svg {
    flex-shrink: 0;
  }

  time {
    white-space: nowrap;
  }
`

const PENDING_STATUSES = ['RegistrationRequested', 'ClearingRequested']

const ItemCard = ({ item, fromProfile = 'pending' }: { item: any; fromProfile?: string }) => {
  const theme = useTheme()
  const location = useLocation()

  const statusColors: Record<string, string> = {
    Included: theme.statusIncluded,
    Removed: theme.statusAbsent,
    Rejected: theme.statusRejected,
    'Registration Requested': theme.statusRegistrationRequested,
    'Removal Requested': theme.statusClearingRequested,
    'Challenged Submission': theme.statusChallenged,
    'Challenged Removal': theme.statusChallenged,
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

  const submissionTime =
    item.requests?.[0]?.submissionTime != null ? Number(item.requests[0].submissionTime) : null

  const deposit = useMemo(() => {
    if (item.requests?.[0]?.deposit == null) return '-'
    const baseDeposit = BigInt(item.requests[0].deposit)
    const arbitrationCost = registryParams?.arbitrationCost ?? 0n
    const total = baseDeposit + arbitrationCost
    return formatValue(total, 2)
  }, [item.requests, registryParams?.arbitrationCost])

  const requester = item.requests?.[0]?.requester ?? ''

  const { data: rewardsData } = useCurateRewards(requester)
  const rewardTotalWei = useMemo(
    () => getItemRewardTotal(item, rewardsData?.rewardedEntries),
    [item, rewardsData?.rewardedEntries],
  )

  const chainId = getPropValue(item, 'EVM Chain ID')
  const itemAddr = getItemAddress(item, registryKey)

  // A request that is not challenged goes through when its challenge period ends. The period comes
  // with the registry parameters (one cached read per registry, not one per card).
  const isPendingUnchallenged = PENDING_STATUSES.includes(item.status) && !item.disputed
  const challengePeriodDuration =
    registryParams?.challengePeriodDuration != null ? Number(registryParams.challengePeriodDuration) : null
  const endsAt =
    isPendingUnchallenged && submissionTime !== null && challengePeriodDuration !== null
      ? submissionTime + challengePeriodDuration
      : null
  const timeLeft = useTimeLeft(endsAt)
  const isCountdownLoading = isPendingUnchallenged && submissionTime !== null && challengePeriodDuration === null
  const showEndsIn = isCountdownLoading || (endsAt !== null && timeLeft !== null && timeLeft !== 'Ended')

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
            <HourglassIcon aria-hidden="true" />
            {item.status === 'ClearingRequested' ? 'Will be removed in' : 'Will be included in'}{' '}
            {endsAt === null ? (
              <Skeleton width={60} />
            ) : (
              <time dateTime={new Date(endsAt * 1000).toISOString()} title={formatTimestamp(endsAt, true)}>
                {timeLeft} ({formatTimestamp(endsAt, true)})
              </time>
            )}
          </HeaderRight>
        )}
      </Header>

      <Divider />

      <Body>
        <MetaLine>
          <InfoRow>
            <LabelValue>
              <span>Submitted on:</span>
              {submissionTime !== null ? (
                <DateValue dateTime={new Date(submissionTime * 1000).toISOString()} title={formatTimestamp(submissionTime, true)}>
                  {formatTimestamp(submissionTime)}
                </DateValue>
              ) : (
                <span>-</span>
              )}
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
                <StyledChainLabel>Address:</StyledChainLabel>
                <AddressDisplay address={itemAddr} />
              </StyledChainContainer>
            )}
          </InfoRow>

          <ActionsGroup>
            {rewardTotalWei > 0n && (
              <RewardedBadge
                title={`This submission earned ${formatValue(rewardTotalWei, 0)} ${rewardsData?.tokenSymbol ?? 'PNK'} in curation rewards`}
              >
                Rewarded
              </RewardedBadge>
            )}
            <ViewLink
              to={itemPath}
              state={{ fromApp: true, from: 'profile', profileTab: fromProfile, profileSearch: location.search }}
            >
              View
            </ViewLink>
          </ActionsGroup>
        </MetaLine>
      </Body>
    </Card>
  )
}

export default ItemCard
