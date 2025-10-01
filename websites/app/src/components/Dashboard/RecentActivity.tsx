import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { useNavigate } from 'react-router-dom';
import { useItemsQuery } from 'hooks/queries/useItemsQuery';
import { revRegistryMap } from 'utils/items';
import { shortenAddress } from 'utils/shortenAddress';
import HourglassIcon from 'svgs/icons/hourglass.svg';
import useHumanizedCountdown, {
  useChallengeRemainingTime,
  useChallengePeriodDuration,
} from 'hooks/countdown';

import ArbitrumIcon from 'svgs/chains/arbitrum.svg';
import AvalancheIcon from 'svgs/chains/avalanche.svg';
import BaseIcon from 'svgs/chains/base.svg';
import BnbIcon from 'svgs/chains/bnb.svg';
import CeloIcon from 'svgs/chains/celo.svg';
import EthereumIcon from 'svgs/chains/ethereum.svg';
import FantomIcon from 'svgs/chains/fantom.svg';
import GnosisIcon from 'svgs/chains/gnosis.svg';
import OptimismIcon from 'svgs/chains/optimism.svg';
import PolygonIcon from 'svgs/chains/polygon.svg';
import ScrollIcon from 'svgs/chains/scroll.svg';
import SolanaIcon from 'svgs/chains/solana.svg';
import ZkSyncIcon from 'svgs/chains/zksync.svg';

// Constants - must be defined before styled components
const DOT_COLORS = {
  active: '#C5ABFF',
  inactive: '#2A2A2A',
} as const;

const ACTIVITY_COLORS = {
  Challenged: '#E87B35',
  Submitted: '#60A5FA',
  Included: '#65DC7F',
  default: '#9CA3AF',
} as const;

const chainIconMap: Record<string, React.ComponentType<any>> = {
  '42161': ArbitrumIcon,
  '43114': AvalancheIcon,
  '8453': BaseIcon,
  '56': BnbIcon,
  '42220': CeloIcon,
  '1': EthereumIcon,
  '250': FantomIcon,
  '100': GnosisIcon,
  '10': OptimismIcon,
  '137': PolygonIcon,
  '534352': ScrollIcon,
  '4sGjMW1sUnHzSxGspuhpqLDx6wiyjNtZ': SolanaIcon,
  '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': SolanaIcon,
  '324': ZkSyncIcon,
};

const CAROUSEL_INTERVAL = 7500;
const ITEMS_PER_GROUP = 3;
const MAX_ITEMS = 9;

const Container = styled.div``;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin: 0;
`;

const ActivityList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const ActivityCard = styled.div`
  display: flex;
  flex-direction: column;
  padding: 16px 20px;
  margin-bottom: 8px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 8px;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.1);
    border-color: ${({ theme }) => theme.primary};
  }
  
  &:last-child {
    margin-bottom: 0;
  }
`;

const FirstLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
`;

const LeftSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
  
  ${landscapeStyle(
    () => css`
      flex-direction: row;
      align-items: center;
      gap: 8px;
    `
  )}
`;

const SecondLine = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ActivityName = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin: 0;
  line-height: 1.3;
  word-break: break-word;
  overflow-wrap: break-word;
  
  ${landscapeStyle(
    () => css`
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 200px;
    `
  )}
`;


const ActivityType = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ theme }) => theme.primaryText};
  line-height: 1.2;
  display: flex;
  align-items: center;
`;

const RegistryType = styled.span`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  font-weight: 400;
  flex-shrink: 0;
  margin-top: 2px;
  
  ${landscapeStyle(
    () => css`
      font-size: 14px;
      margin-top: 0;
    `
  )}
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  
  svg {
    width: 14px;
    height: 14px;
    fill: ${({ theme }) => theme.secondaryText};
  }
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 4px;
  
  ${landscapeStyle(
    () => css`
      gap: 8px;
      margin-top: 0;
    `
  )}
`;

const ChainIcon = styled.div`
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  margin-bottom: 8px;
  
  svg {
    width: 100%;
    height: 100%;
  }
`;

const StatusIcon = styled.div<{ status: string }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ status }) => ACTIVITY_COLORS[status as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.default};
  flex-shrink: 0;
`;

const ViewButton = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  font-weight: 500;
  
  &::after {
    content: '→';
    font-size: 16px;
  }
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 24px;
`;

const Dot = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ active }) => active ? DOT_COLORS.active : DOT_COLORS.inactive};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${DOT_COLORS.active};
  }
`;

const LoadingCard = styled.div`
  padding: 16px;
  margin-bottom: 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  animation: pulse 2s infinite;
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
`;

const EmptyState = styled.div`
  padding: 20px;
  text-align: center;
  color: #666;
`;

interface ActivityItem {
  id: string;
  itemID: string;
  registryAddress: string;
  disputed: boolean;
  status: 'Registered' | 'RegistrationRequested' | 'ClearingRequested' | 'Absent';
  metadata?: {
    key0: string;
    key1: string;
    key2: string;
    key3: string;
    key4: string;
    props: Array<{
      label: string;
      value: string;
    }>;
  } | null;
  requests?: Array<{
    submissionTime: string;
    requester: string;
  }>;
}

type ActivityStatus = 'Challenged' | 'Submitted' | 'Included' | 'Removing' | 'Removed';

const getProp = (item: ActivityItem, label: string): string =>
  item?.metadata?.props?.find((p) => p.label === label)?.value ?? "";

const getChainId = (item: ActivityItem): string | undefined => {
  const key0 = item?.metadata?.key0;
  if (!key0) return undefined;
  
  const parts = key0.split(':');
  return parts[1]; // Extract chain ID from format like "eip155:1:0x..."
};

const getChainIcon = (chainId: string | undefined) => {
  if (!chainId) return null;
  return chainIconMap[chainId] || null;
};

export const RecentActivity: React.FC = () => {
  const [currentGroup, setCurrentGroup] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();
    // Registries to fetch from
    ['Tokens', 'CDN', 'Single_Tags', 'Tags_Queries'].forEach(registry => {
      params.append('registry', registry);
    });
    // Status filters
    ['Registered', 'RegistrationRequested', 'ClearingRequested'].forEach(status => {
      params.append('status', status);
    });
    // Include both disputed and non-disputed items
    ['true', 'false'].forEach(disputed => {
      params.append('disputed', disputed);
    });
    params.append('orderDirection', 'desc');
    params.append('page', '1');
    return params;
  }, []);

  const { data: items = [], isLoading } = useItemsQuery({
    searchParams,
    chainFilters: [],
    enabled: true,
  });

  const itemGroups = useMemo(() => {
    if (!items.length) return [];
    
    const groups: ActivityItem[][] = [];
    const maxItems = Math.min(items.length, MAX_ITEMS);
    
    for (let i = 0; i < maxItems; i += ITEMS_PER_GROUP) {
      groups.push(items.slice(i, i + ITEMS_PER_GROUP));
    }
    return groups;
  }, [items]);

  useEffect(() => {
    if (itemGroups.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentGroup((prev) => (prev + 1) % itemGroups.length);
    }, CAROUSEL_INTERVAL);
    
    intervalRef.current = interval;

    return () => clearInterval(interval);
  }, [itemGroups.length]);

  const handleCardClick = useCallback((item: ActivityItem) => {
    const registryName = revRegistryMap[item.registryAddress] ?? "Unknown";
    const params = new URLSearchParams();
    
    params.set("registry", registryName);
    ['Registered', 'RegistrationRequested', 'ClearingRequested', 'Absent'].forEach(status => {
      params.set("status", status);
    });
    ['true', 'false'].forEach(disputed => {
      params.set("disputed", disputed);
    });
    params.set("page", "1");
    params.set("orderDirection", "desc");
    
    navigate(`/item/${item.id}?${params.toString()}`);
  }, [navigate]);

  const handleDotClick = useCallback((index: number) => {
    setCurrentGroup(index);
    
    // Reset the timer by clearing current interval and starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (itemGroups.length > 1) {
      const newInterval = setInterval(() => {
        setCurrentGroup((prev) => (prev + 1) % itemGroups.length);
      }, CAROUSEL_INTERVAL);
      intervalRef.current = newInterval;
    }
  }, [itemGroups.length]);

  const getDisplayName = useCallback((item: ActivityItem): string => {
    const propNames = ["Name", "Domain name", "Public Name Tag", "Description"];
    
    for (const propName of propNames) {
      const value = getProp(item, propName);
      if (value) return value;
    }
    
    return shortenAddress(item.itemID);
  }, []);

  const getActivityType = useCallback((item: ActivityItem): ActivityStatus => {
    if (item.disputed) return 'Challenged';
    if (item.status === 'RegistrationRequested') return 'Submitted';
    if (item.status === 'Registered') return 'Included';
    if (item.status === 'ClearingRequested') return 'Removing';
    if (item.status === 'Absent') return 'Removed';
    return 'Submitted';
  }, []);

  const ActivityCardItem: React.FC<{ item: ActivityItem }> = ({ item }) => {
    const registryName = revRegistryMap[item.registryAddress] ?? "Unknown";
    const displayName = getDisplayName(item);
    const activityType = getActivityType(item);
    
    const challengePeriodDuration = useChallengePeriodDuration(item.registryAddress);
    const endsAtSeconds = useChallengeRemainingTime(
      item.requests?.[0]?.submissionTime,
      item.disputed,
      challengePeriodDuration
    );
    const endsIn = useHumanizedCountdown(endsAtSeconds, 2);
    const showEndsIn = Boolean(endsIn) && item.status !== "Registered";
    
    return (
      <ActivityCard key={item.id} onClick={() => handleCardClick(item)}>
        <FirstLine>
          <LeftSection>
            <ActivityName>{displayName}</ActivityName>
            <RegistryType>({registryName})</RegistryType>
          </LeftSection>
          <RightSection>
            <StatusIcon status={activityType} />
            <ActivityType>
              {activityType}
            </ActivityType>
            {(() => {
              const chainId = getChainId(item);
              const ChainIconComponent = getChainIcon(chainId);
              return ChainIconComponent ? (
                <ChainIcon>
                  <ChainIconComponent />
                </ChainIcon>
              ) : null;
            })()}
          </RightSection>
        </FirstLine>
        <SecondLine>
          <TimeInfo>
            <HourglassIcon />
            <span>
              {showEndsIn 
                ? `Will be included in: ${endsIn}`
                : 'Already included'
              }
            </span>
          </TimeInfo>
          <ViewButton>
            View
          </ViewButton>
        </SecondLine>
      </ActivityCard>
    );
  };

  if (isLoading) {
    return (
      <Container>
        <Header>
          <Title>Recent Activity</Title>
        </Header>
        <ActivityList>
          {[1, 2, 3].map((i) => (
            <LoadingCard key={i} />
          ))}
        </ActivityList>
      </Container>
    );
  }

  if (!itemGroups.length) {
    return (
      <Container>
        <Header>
          <Title>Recent Activity</Title>
        </Header>
        <ActivityList>
          <EmptyState>
            No recent activity found
          </EmptyState>
        </ActivityList>
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>Recent Activity</Title>
      </Header>
      <ActivityList>
        {itemGroups[currentGroup]?.map((item) => (
          <ActivityCardItem key={item.id} item={item} />
        ))}
      </ActivityList>
      {itemGroups.length > 1 && (
        <DotsContainer>
          {itemGroups.map((_, index) => (
            <Dot
              key={index}
              active={index === currentGroup}
              onClick={() => handleDotClick(index)}
            />
          ))}
        </DotsContainer>
      )}
    </Container>
  );
};