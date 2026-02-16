import React from 'react';
import styled, { useTheme } from 'styled-components';
import { Link } from 'react-router-dom';
import { formatEther } from 'ethers';
import {
  GraphItem,
  buildItemPath,
  getItemDisplayStatus,
  getItemDisplayName,
  getChainId,
  getItemThumbnailUrl,
  registryMap,
  revRegistryMap,
  statusDescriptionMap,
  bountyDescriptionMap,
} from 'utils/items';
import { getChainIcon } from 'utils/chainIcons';
import { chains } from 'utils/chains';
import { chainColorMap } from 'utils/colorMappings';
import Tooltip from 'components/Tooltip';
import useHumanizedCountdown, { useChallengeRemainingTime } from 'hooks/countdown';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
import { formatTimestamp } from 'utils/formatTimestamp';
import HourglassIcon from 'svgs/icons/hourglass.svg';
import ArrowIcon from 'assets/svgs/icons/arrow.svg';
import Skeleton from 'react-loading-skeleton';

const CompactRow = styled.div`
  ${hoverLongTransitionTiming}
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  row-gap: 6px;
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
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 100%;
  min-width: 0;
  flex-wrap: wrap;
  row-gap: 6px;
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 100%;
`;

const StatusBadge = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.primaryText};
  white-space: nowrap;
  flex-shrink: 0;

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

const BountyBadge = styled.span`
  font-size: 10px;
  color: ${({ theme }) => theme.tintYellow};
  font-weight: 600;
  white-space: nowrap;
  margin-left: 2px;
`;

const ItemName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex-shrink: 1;
  max-width: 120px;

  @media (min-width: 480px) {
    max-width: 180px;
  }
`;

const EventInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.secondaryText};
  flex-shrink: 0;
  white-space: nowrap;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.8;
  }
`;

const ChainIconWrapper = styled.div`
  display: flex;
  align-items: center;
  flex-shrink: 0;

  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const TokenLogo = styled.img`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const ChainPill = styled.span<{ bgColor: string }>`
  padding: 2px 6px;
  color: ${({ theme }) => theme.primaryText};
  border-radius: 40px;
  font-size: 10px;
  font-weight: 500;
  background-color: ${(props) => props.bgColor};
  flex-shrink: 0;
  white-space: nowrap;
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
  margin-left: auto;
  transition: all 0.2s;
  font-family: "Open Sans", sans-serif;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  border-color: ${({ theme }) => theme.buttonSecondaryBorder};
  flex-shrink: 0;
  white-space: nowrap;
  text-decoration: none;

  svg {
    width: 10px;
    height: 10px;

    path {
      fill: ${({ theme }) => theme.primaryText};
    }
  }

  &:hover {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
  }
`;

interface ItemCompactViewProps {
  item: GraphItem;
  challengePeriodDuration: number | null;
}

const ItemCompactView = React.memo(({ item, challengePeriodDuration }: ItemCompactViewProps) => {
  const theme = useTheme();
  const challengeRemainingTime = useChallengeRemainingTime(
    item.requests?.[0]?.submissionTime,
    item.disputed,
    challengePeriodDuration,
  );
  const formattedChallengeRemainingTime = useHumanizedCountdown(challengeRemainingTime, 2);

  const itemUrl = buildItemPath(item.id);
  const registryKey = revRegistryMap[item.registryAddress] || '';
  const displayName = getItemDisplayName(item, registryKey);
  const status = getItemDisplayStatus(item);
  const chainId = getChainId(item);
  const ChainIcon = chainId ? getChainIcon(chainId) : null;
  const chainData = chainId ? chains.find((c) => c.id === chainId) : null;
  const chainLabel = chainData?.label || null;
  const chainColor = chainData ? chainColorMap[`${chainData.namespace}:${chainId}`] || theme.chainColorDefault : theme.chainColorDefault;

  const thumbnailUrl = getItemThumbnailUrl(item);
  const isTokenLogo = item.registryAddress === registryMap['tokens'];

  const readableBounty =
    (item.status === 'ClearingRequested' || item.status === 'RegistrationRequested') && !item.disputed
      ? Number(formatEther(item.requests?.[0]?.deposit || '0'))
      : null;

  const isLoadingCountdown =
    challengePeriodDuration === null && item.status !== 'Registered' && item.status !== 'Absent' && !item.disputed;

  const getEventDisplay = () => {
    if (item.status === 'Registered') {
      const registrationRequest = (item.requests || []).find(
        (req) => req.requestType?.toLowerCase() === 'registrationrequested' && req.resolved,
      );
      return formatTimestamp(Number(registrationRequest?.resolutionTime || 0), false);
    } else if (item.status === 'Absent') {
      return formatTimestamp(Number(item.requests?.[0]?.resolutionTime || 0), false);
    }
    return isLoadingCountdown ? null : formattedChallengeRemainingTime || '';
  };
  const eventDisplay = getEventDisplay();

  const isPending =
    (item.status === 'RegistrationRequested' || item.status === 'ClearingRequested') && !item.disputed;

  return (
    <CompactRow>
      <TopRow>
        <Tooltip data-tooltip={statusDescriptionMap[status] || ''}>
          <StatusBadge status={status}>{status}</StatusBadge>
        </Tooltip>
        {readableBounty && (
          <Tooltip data-tooltip={bountyDescriptionMap[item.status] || ''}>
            <BountyBadge>${readableBounty}</BountyBadge>
          </Tooltip>
        )}
        <ItemName>{displayName}</ItemName>
      </TopRow>
      <BottomRow>
        {thumbnailUrl && <TokenLogo src={thumbnailUrl} alt={isTokenLogo ? 'Token logo' : 'Visual proof'} style={isTokenLogo ? undefined : { borderRadius: '4px' }} />}
        {ChainIcon ? (
          <ChainIconWrapper><ChainIcon /></ChainIconWrapper>
        ) : chainLabel ? (
          <ChainPill bgColor={chainColor}>{chainLabel}</ChainPill>
        ) : null}
        <EventInfo>
          {isLoadingCountdown ? (
            <Skeleton width={80} height={12} />
          ) : isPending && eventDisplay ? (
            <>
              <HourglassIcon />
              <span>{eventDisplay}</span>
            </>
          ) : eventDisplay ? (
            <span>{eventDisplay}</span>
          ) : null}
        </EventInfo>
        <ViewButton to={itemUrl} state={{ fromApp: true }}>
          View <ArrowIcon />
        </ViewButton>
      </BottomRow>
    </CompactRow>
  );
});

export default ItemCompactView;
