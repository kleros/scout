import React from 'react';
import styled, { css, useTheme } from 'styled-components';
import { Link } from 'react-router-dom';
import { formatEther } from 'ethers';
import {
  GraphItem,
  buildItemPath,
  getItemDisplayStatus,
  getItemDisplayName,
  getItemLinkLabel,
  getItemAddress,
  getChainId,
  getItemThumbnailUrl,
  getPropValue,
  registryMap,
  revRegistryMap,
  statusDescriptionMap,
  bountyDescriptionMap,
} from 'utils/items';
import { getChainIcon } from 'utils/chainIcons';
import { chains } from 'utils/chains';
import { chainColorMap } from 'utils/colorMappings';
import Tooltip from 'components/Tooltip';
import AddressDisplay from 'components/AddressDisplay';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
import HourglassIcon from 'svgs/icons/hourglass.svg';
import ArrowIcon from 'assets/svgs/icons/arrow.svg';
import Skeleton from 'react-loading-skeleton';
import { useItemEvent, toIsoString } from './itemEvent';

/*
 * The whole row opens the item: one link is stretched over it (RowLink). The address link, the
 * copy button, the tooltips and the countdown sit above it and keep working on their own.
 */
const CompactRow = styled.div`
  ${hoverLongTransitionTiming}
  position: relative;
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

  a:not([data-row-link]),
  button,
  time,
  [role='img'] {
    position: relative;
    z-index: 2;
  }
`;

const RowLink = styled(Link)`
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: 8px;

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primaryBlue};
    outline-offset: -2px;
  }
`;

const RowTooltip = styled(Tooltip)`
  position: relative;
  z-index: 2;
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
  row-gap: 6px;
  flex: 0 0 100%;
  min-width: 0;
  flex-wrap: wrap;
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
        'Removal Requested': theme.statusClearingRequested,
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

// Takes the rest of the line (or a line of its own when the status leaves too little room).
// Tag Queries descriptions are long sentences: they get two lines.
const ItemName = styled.span<{ $twoLines?: boolean }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  flex: 1 1 140px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  ${({ $twoLines }) =>
    $twoLines &&
    css`
      white-space: normal;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow-wrap: anywhere;
    `}
`;

const SecondaryName = styled.span`
  color: ${({ theme }) => theme.secondaryText};
  font-weight: 400;
`;

const EventInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: ${({ theme }) => theme.secondaryText};
  flex-shrink: 0;
  white-space: nowrap;

  time {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.8;
  }
`;

const AddressWrapper = styled.div`
  min-width: 0;
  font-family: monospace;
  font-size: 13px;

  > div {
    margin-bottom: 0;
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

// Looks like a button and shows where to tap; the row's link underneath is what opens the item.
const ViewButton = styled.span`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  border: 1px solid;
  margin-left: auto;
  transition: all 0.2s;
  font-family: "Manrope", sans-serif;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  border-color: ${({ theme }) => theme.buttonSecondaryBorder};
  flex-shrink: 0;
  white-space: nowrap;

  svg {
    width: 10px;
    height: 10px;

    path {
      fill: ${({ theme }) => theme.primaryText};
    }
  }

  ${CompactRow}:hover & {
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
  const event = useItemEvent(item, challengePeriodDuration);

  const itemUrl = buildItemPath(item.id);
  const registryKey = revRegistryMap[item.registryAddress] || '';
  const displayName = getItemDisplayName(item, registryKey);
  // Several Single Tags share a project name: the tag tells them apart.
  const secondaryName = registryKey === 'single-tags' ? getPropValue(item, 'Public Name Tag') : '';
  const linkLabel = getItemLinkLabel(item, registryKey);
  const address = getItemAddress(item, registryKey);
  const status = getItemDisplayStatus(item);
  const chainId = getChainId(item);
  const ChainIcon = chainId ? getChainIcon(chainId) : null;
  const chainData = chainId ? chains.find((c) => c.id === chainId) : null;
  const chainLabel = chainData?.label || null;
  const chainColor = chainData ? chainColorMap[`${chainData.namespace}:${chainId}`] || theme.chainColorDefault : theme.chainColorDefault;

  const thumbnailUrl = getItemThumbnailUrl(item);
  const isTokenLogo = item.registryAddress === registryMap['tokens'];

  // A bounty can only be won while the request can still be challenged.
  const readableBounty =
    (item.status === 'ClearingRequested' || item.status === 'RegistrationRequested') && !item.disputed && event.kind !== 'over'
      ? Number(formatEther(item.requests?.[0]?.deposit || '0'))
      : null;

  return (
    <CompactRow>
      <RowLink to={itemUrl} state={{ fromApp: true }} title={linkLabel} data-row-link="" />
      <TopRow>
        <RowTooltip data-tooltip={statusDescriptionMap[status] || ''}>
          <StatusBadge status={status}>{status}</StatusBadge>
        </RowTooltip>
        {readableBounty ? (
          <RowTooltip data-tooltip={bountyDescriptionMap[item.status] || ''}>
            <BountyBadge>{readableBounty} xDAI</BountyBadge>
          </RowTooltip>
        ) : null}
        <ItemName $twoLines={registryKey === 'tags-queries'}>
          {displayName}
          {secondaryName && secondaryName !== displayName ? <SecondaryName>{` · ${secondaryName}`}</SecondaryName> : null}
        </ItemName>
      </TopRow>
      <BottomRow>
        {thumbnailUrl && <TokenLogo src={thumbnailUrl} alt={isTokenLogo ? 'Token logo' : 'Visual proof'} style={isTokenLogo ? undefined : { borderRadius: '4px' }} />}
        {address ? (
          <AddressWrapper>
            <AddressDisplay address={address} />
          </AddressWrapper>
        ) : ChainIcon ? (
          <ChainIconWrapper
            role="img"
            aria-label={chainData?.name ?? `Chain ${chainId}`}
            title={chainData?.name ?? `Chain ${chainId}`}
          >
            <ChainIcon />
          </ChainIconWrapper>
        ) : chainLabel ? (
          <ChainPill bgColor={chainColor} title={chainData?.name}>{chainLabel}</ChainPill>
        ) : null}
        <EventInfo>
          {event.kind === 'loading' ? (
            <Skeleton width={80} height={12} />
          ) : (event.kind === 'countdown' || event.kind === 'over') && event.text ? (
            <time dateTime={toIsoString(event.timestamp!)} title={event.title}>
              <HourglassIcon />
              {event.srPrefix ? <span className="visually-hidden">{`${event.srPrefix} `}</span> : null}
              <span>{event.text}</span>
            </time>
          ) : event.kind === 'date' ? (
            <span>
              <span className="visually-hidden">{`${event.srPrefix} `}</span>
              {event.text}
            </span>
          ) : event.text ? (
            <span>{event.text}</span>
          ) : null}
        </EventInfo>
        <ViewButton aria-hidden="true">
          View <ArrowIcon />
        </ViewButton>
      </BottomRow>
    </CompactRow>
  );
});

export default ItemCompactView;
