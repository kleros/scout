import React from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { Link } from 'react-router-dom';
import { useItemsQuery } from 'hooks/queries/useItemsQuery';
import { revRegistryMap, GraphItem, buildItemPath, registryDisplayNames, getPropValue, getItemDisplayName, getChainId, getItemDisplayStatus } from 'utils/items';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
import { getChainIcon } from 'utils/chainIcons';
import useHumanizedCountdown, { useChallengeRemainingTime, useChallengePeriodDuration } from 'hooks/countdown';
import Skeleton from 'react-loading-skeleton';
import HourglassIcon from 'svgs/icons/hourglass.svg';
import ArrowIcon from 'assets/svgs/icons/arrow.svg';

const Container = styled.div`
  padding: 24px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: transparent;
  box-shadow: ${({ theme }) => theme.shadowCard};
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.glowPurple};
  }
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.secondaryBlue};
  font-family: "Open Sans";
  font-size: 16px;
  font-style: italic;
  font-weight: 400;
  line-height: normal;
  margin: 0 0 20px 0;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const ActivityRow = styled.div`
  ${hoverLongTransitionTiming}
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  row-gap: 8px;
  padding: 10px 0;
  border-bottom: 1px solid ${({ theme }) => theme.divider};
  transition: all 0.2s ease;
  flex-wrap: wrap;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => theme.subtleBackground};
    padding-left: 8px;
    padding-right: 8px;
    margin-left: -8px;
    margin-right: -8px;
    border-radius: 8px;
  }

  ${landscapeStyle(
    () => css`
      padding: 12px 0;
    `
  )}
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  row-gap: 6px;
  flex: 1 1 100%;
  max-width: 100%;
  min-width: 0;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      flex: 1 1 auto;
      max-width: none;
    `
  )}
`;

const ItemName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  max-width: 150px;

  ${landscapeStyle(
    () => css`
      max-width: 180px;
    `
  )}
`;

const RegistryName = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};
  flex-shrink: 0;
  white-space: nowrap;

  ${landscapeStyle(
    () => css`
      font-size: 14px;
    `
  )}
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  flex-shrink: 0;
  flex-wrap: nowrap;
  white-space: nowrap;
  flex-basis: auto;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.8;

    ${landscapeStyle(
      () => css`
        width: 14px;
        height: 14px;
      `
    )}
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  row-gap: 6px;
  flex: 0 0 100%;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: space-between;

  ${landscapeStyle(
    () => css`
      flex: initial;
      gap: 12px;
      justify-content: flex-start;
    `
  )}
`;

const StatusBadge = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.primaryText};
  white-space: nowrap;
  flex-shrink: 0;

  ${landscapeStyle(
    () => css`
      font-size: 13px;
    `
  )}

  &:before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    background-color: ${({ status, theme }) =>
    ({
      'Included': theme.statusIncluded,
      'Registration Requested': theme.statusRegistrationRequested,
      'Challenged Submission': theme.statusChallenged,
      'Challenged Removal': theme.statusChallenged,
      'Removal Requested': theme.statusChallenged,
      'Removed': theme.statusAbsent,
      'Rejected': theme.statusRejected,
    })[status] || theme.statusGray};
    border-radius: 50%;
    flex-shrink: 0;
  }
`;

const StatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;

  ${landscapeStyle(
    () => css`
      gap: 12px;
    `
  )}
`;

const ChainInfo = styled.div`
  display: flex;
  align-items: center;

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }
`;

const ViewButton = styled(Link)`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
  font-family: "Open Sans", sans-serif;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  border-color: ${({ theme }) => theme.buttonSecondaryBorder};
  flex-shrink: 0;
  white-space: nowrap;
  text-decoration: none;

  ${landscapeStyle(
    () => css`
      padding: 6px 12px;
      font-size: 12px;
    `
  )}

  svg {
    width: 10px;
    height: 10px;

    ${landscapeStyle(
      () => css`
        width: 12px;
        height: 12px;
      `
    )}

    path {
      fill: ${({ theme }) => theme.primaryText};
    }
  }

  &:hover {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
  }

  &:active {
    background: ${({ theme }) => theme.activeBackground};
  }
`;

const LoadingRow = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid ${({ theme }) => theme.divider};

  &:last-child {
    border-bottom: none;
  }
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
`;

const getDisplayName = (item: GraphItem): string => {
  const registryKey = revRegistryMap[item.registryAddress] || 'Unknown';
  return getItemDisplayName(item, registryKey);
};

const getActivityStatus = (item: GraphItem): string =>
  getItemDisplayStatus(item);

const formatRegistryName = (registryName: string): string =>
  registryDisplayNames[registryName] || registryName;

interface ActivityItemProps {
  item: GraphItem;
  itemUrl: string;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ item, itemUrl }) => {
  const registryName = revRegistryMap[item.registryAddress] || 'Unknown';
  const displayName = getDisplayName(item);
  const status = getActivityStatus(item);
  const chainId = getChainId(item);
  const ChainIcon = getChainIcon(chainId || '');

  const challengePeriodDuration = useChallengePeriodDuration(item.registryAddress);
  const endsAtSeconds = useChallengeRemainingTime(
    item.requests?.[0]?.submissionTime,
    item.disputed,
    challengePeriodDuration,
  );
  const endsIn = useHumanizedCountdown(endsAtSeconds, 2);
  const showEndsIn = Boolean(endsIn) && item.status !== 'Registered' && !item.disputed;
  const isLoadingCountdown = item.status !== 'Registered' && challengePeriodDuration === null && !item.disputed;

  const timeText = item.status === 'ClearingRequested' ? 'Will be removed in' : 'Will be included in';
  const completedText = item.status === 'ClearingRequested' ? 'Removed' : 'Already included';

  return (
    <ActivityRow>
      <LeftSection>
        <ItemName>{displayName}</ItemName>
        <RegistryName>({formatRegistryName(registryName)})</RegistryName>
        {!item.disputed && (
          <TimeInfo>
            {isLoadingCountdown ? (
              <Skeleton width={150} height={12} />
            ) : showEndsIn ? (
              <>
                <HourglassIcon />
                <span>{timeText}: {endsIn}</span>
              </>
            ) : item.status !== 'Registered' ? null : (
              <>
                <HourglassIcon />
                <span>{completedText}</span>
              </>
            )}
          </TimeInfo>
        )}
      </LeftSection>
      <RightSection>
        <StatusGroup>
          <StatusBadge status={status}>{status}</StatusBadge>
          {ChainIcon && (
            <ChainInfo>
              <ChainIcon />
            </ChainInfo>
          )}
        </StatusGroup>
        <ViewButton to={itemUrl} state={{ fromApp: true, from: 'home' }}>
          View <ArrowIcon />
        </ViewButton>
      </RightSection>
    </ActivityRow>
  );
};

export const HomeRecentActivity: React.FC = () => {
  const { data: searchResult, isLoading } = useItemsQuery({
    registryNames: ['tokens', 'cdn', 'single-tags', 'tags-queries'],
    status: ['Registered', 'RegistrationRequested', 'ClearingRequested'],
    disputed: ['true', 'false'],
    text: '',
    orderDirection: 'desc',
    page: 1,
    chainFilters: [],
    enabled: true,
  });

  const items = searchResult?.items ?? [];

  if (isLoading) {
    return (
      <Container>
        <Title>Recent Activity</Title>
        <ActivityList>
          {Array.from({ length: 20 }).map((_, i) => (
            <LoadingRow key={i}>
              <Skeleton height={14} style={{ marginBottom: 4 }} />
              <Skeleton height={12} width="80%" />
            </LoadingRow>
          ))}
        </ActivityList>
      </Container>
    );
  }

  if (!items.length) {
    return (
      <Container>
        <Title>Recent Activity</Title>
        <EmptyState>No recent activity found</EmptyState>
      </Container>
    );
  }

  // Show latest 20 entries
  const displayItems = items.slice(0, 20);

  return (
    <Container>
      <Title>Recent Activity</Title>
      <ActivityList>
        {displayItems.map((item) => (
          <ActivityItem
            key={item.id}
            item={item}
            itemUrl={buildItemPath(item.id)}
          />
        ))}
      </ActivityList>
    </Container>
  );
};
