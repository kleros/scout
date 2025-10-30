import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useItemsQuery } from 'hooks/queries/useItemsQuery';
import { revRegistryMap, GraphItem } from 'utils/items';
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
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0px 8px 32px rgba(125, 75, 255, 0.1);
  }
`;

const Title = styled.h3`
  color: var(--Secondary-blue, #7186FF);
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
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: all 0.2s ease;
  flex-wrap: wrap;

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    padding-left: 8px;
    padding-right: 8px;
    margin-left: -8px;
    margin-right: -8px;
    border-radius: 8px;
  }

  @media (max-width: 767px) {
    padding: 10px 0;
  }
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  row-gap: 6px;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;

  @media (max-width: 767px) {
    flex: 1 1 100%;
    max-width: 100%;
  }
`;

const ItemName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  max-width: 100px;

  @media (min-width: 480px) {
    max-width: 150px;
  }

  @media (min-width: 768px) {
    max-width: 180px;
  }
`;

const RegistryName = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};
  flex-shrink: 0;
  white-space: nowrap;

  @media (max-width: 767px) {
    font-size: 13px;
  }
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.secondaryText};
  flex-shrink: 0;
  flex-wrap: nowrap;
  white-space: nowrap;
  flex-basis: 100%;

  @media (min-width: 480px) {
    flex-basis: auto;
    font-size: 12px;
  }

  @media (min-width: 768px) {
    flex-basis: auto;
  }

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.8;

    @media (min-width: 768px) {
      width: 14px;
      height: 14px;
    }
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
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: space-between;

  @media (min-width: 768px) {
    gap: 12px;
    justify-content: flex-start;
  }

  @media (max-width: 767px) {
    flex: 0 0 100%;
  }
`;

const StatusBadge = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.primaryText};
  white-space: nowrap;
  flex-shrink: 0;

  @media (min-width: 768px) {
    font-size: 13px;
  }

  &:before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    background-color: ${({ status }) =>
    ({
      'Included': '#90EE90',
      'Registration Requested': '#FFEA00',
      'Challenged Submission': '#E87B35',
      'Challenged Removal': '#E87B35',
      'Removal Requested': '#E87B35',
      'Removed': 'red',
    })[status] || 'gray'};
    border-radius: 50%;
    flex-shrink: 0;
  }
`;

const StatusGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;

  @media (min-width: 768px) {
    gap: 12px;
  }
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

const ViewButton = styled.button`
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

  @media (min-width: 768px) {
    padding: 6px 12px;
    font-size: 12px;
  }

  svg {
    width: 10px;
    height: 10px;

    @media (min-width: 768px) {
      width: 12px;
      height: 12px;
    }

    path {
      fill: ${({ theme }) => theme.primaryText};
    }
  }

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: ${({ theme }) => theme.primaryText};
  }

  &:active {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const LoadingRow = styled.div`
  padding: 12px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

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

const getPropValue = (item: GraphItem, label: string) => {
  return item?.props?.find((prop) => prop.label === label)?.value || '';
};

const getChainId = (item: GraphItem): string | undefined => {
  const key0 = item?.key0;
  if (!key0) return undefined;

  const parts = key0.split(':');
  return parts[1]; // Extract chain ID from format like "eip155:1:0x..."
};

const getDisplayName = (item: GraphItem): string => {
  const registryName = revRegistryMap[item.registryAddress] || 'Unknown';

  if (registryName === 'Tokens') {
    return getPropValue(item, 'Symbol') || getPropValue(item, 'Name') || 'Unnamed';
  } else if (registryName === 'CDN') {
    return getPropValue(item, 'Domain name') || 'Unnamed';
  } else if (registryName === 'Single_Tags') {
    return getPropValue(item, 'Project Name') || getPropValue(item, 'Public Name Tag') || 'Unnamed';
  } else if (registryName === 'Tags_Queries') {
    return getPropValue(item, 'Description') || 'Unnamed';
  }
  return 'Unnamed';
};

const readableStatusMap = {
  Registered: 'Included',
  Absent: 'Removed',
  RegistrationRequested: 'Registration Requested',
  ClearingRequested: 'Removal Requested',
};

const challengedStatusMap = {
  RegistrationRequested: 'Challenged Submission',
  ClearingRequested: 'Challenged Removal',
};

const getActivityStatus = (item: GraphItem): string => {
  if (item.disputed) {
    return challengedStatusMap[item.status] || 'Unknown';
  }
  return readableStatusMap[item.status] || 'Unknown';
};

const formatRegistryName = (registryName: string): string => {
  if (registryName === 'Single_Tags') return 'Single Tags';
  if (registryName === 'Tags_Queries') return 'Query Tags';
  return registryName;
};

interface ActivityItemProps {
  item: GraphItem;
  onClick: () => void;
}

const ActivityItem: React.FC<ActivityItemProps> = ({ item, onClick }) => {
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
        <ViewButton onClick={onClick}>
          View <ArrowIcon />
        </ViewButton>
      </RightSection>
    </ActivityRow>
  );
};

export const HomeRecentActivity: React.FC = () => {
  const navigate = useNavigate();

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    // Fetch from all 4 registries
    ['Tokens', 'CDN', 'Single_Tags', 'Tags_Queries'].forEach((registry) => {
      params.append('registry', registry);
    });
    // Include all statuses
    ['Registered', 'RegistrationRequested', 'ClearingRequested'].forEach((status) => {
      params.append('status', status);
    });
    // Include both disputed and non-disputed
    ['true', 'false'].forEach((disputed) => {
      params.append('disputed', disputed);
    });
    params.set('orderDirection', 'desc');
    params.set('page', '1');
    return params;
  }, []);

  const { data: items = [], isLoading } = useItemsQuery({
    searchParams,
    chainFilters: [],
    enabled: true,
  });

  const handleRowClick = useCallback(
    (item: GraphItem) => {
      navigate(`/item/${item.id}?fromHome=true`);
    },
    [navigate]
  );

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
            onClick={() => handleRowClick(item)}
          />
        ))}
      </ActivityList>
    </Container>
  );
};
