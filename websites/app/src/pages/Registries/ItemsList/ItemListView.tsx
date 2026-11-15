import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { formatEther } from 'ethers';
import { GraphItem, registryMap, buildItemPath, getRegistryKey, getItemThumbnailUrl, getItemDisplayStatus, getItemLinkLabel, statusDescriptionMap, bountyDescriptionMap, getPropValue as getItemProp } from 'utils/items';
import Tooltip from 'components/Tooltip';
import AddressDisplay from 'components/AddressDisplay';
import SafeLink from 'components/SafeLink';
// import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'; // UNUSED: Only needed for submitter display which is commented out
import { hoverLongTransitionTiming } from 'styles/commonStyles';
// import ArrowIcon from 'assets/svgs/icons/arrow.svg'; // UNUSED: Only needed for submitter links which are commented out
import Skeleton from 'react-loading-skeleton';
import { getChainIcon } from 'utils/chainIcons';
import { getChainName } from 'utils/chains';
import HourglassIcon from 'svgs/icons/hourglass.svg';
import NewTabIcon from 'svgs/icons/new-tab.svg';
import { getListColumns } from './ListHeader';
import { useItemEvent, toIsoString } from './itemEvent';

/*
 * A row is one link stretched over the whole row (RowLink), so a click anywhere opens the item,
 * a middle or Cmd/Ctrl click opens it in a new tab, and screen readers hear one short link per
 * row. The links, buttons, tooltips and countdown inside the row sit above it and keep working.
 */
const ListRow = styled.div<{ $registryType?: string; }>`
  ${hoverLongTransitionTiming}
  position: relative;
  display: grid;
  grid-template-columns: ${({ $registryType }) => getListColumns($registryType)};
  gap: 16px;
  align-items: center;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.divider};
  border-radius: 0;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  font-family: "Manrope", sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-decoration: none;

  &:first-child {
    padding-top: 0;
  }

  &:hover {
    background: ${({ theme }) => theme.subtleBackground};
  }

  &:last-child {
    border-bottom: none;
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

  /* Drawn inside the row: the list clips anything wider. */
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.primaryBlue};
    outline-offset: -2px;
  }
`;

const RowTooltip = styled(Tooltip)`
  position: relative;
  z-index: 2;
`;

const Cell = styled.div`
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  padding: 0;
`;

const LogoCell = styled.div`
  display: flex;
  align-items: center;
  overflow: hidden;
  width: auto;

  img {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
  }

  .skeleton-logo {
    width: 32px;
    height: 32px;
    flex-shrink: 0;
    line-height: 1;

    > span {
      display: block !important;
      width: 32px !important;
      height: 32px !important;
      line-height: 1 !important;
    }
  }
`;


const StatusCell = styled(Cell) <{ status: string; }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;

  &:before {
    content: '';
    display: inline-block;
    width: 6px;
    height: 6px;
    background-color: ${({ status, theme }) =>
    ({
      Included: theme.statusIncluded,
      'Registration Requested': theme.statusRegistrationRequested,
      'Removal Requested': theme.statusClearingRequested,
      'Challenged Submission': theme.statusChallenged,
      'Challenged Removal': theme.statusChallenged,
      Removed: theme.statusAbsent,
      Rejected: theme.statusRejected,
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
  display: inline;
`;

const SymbolText = styled.div`
  font-weight: 600;
  font-size: 15px;
  color: ${({ theme }) => theme.primaryText};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const NameText = styled.div`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const WebsiteLink = styled(SafeLink)`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
  }
`;

const AddressCell = styled(Cell)`
  font-family: monospace;
  font-size: 13px;

  > div {
    margin-bottom: 0;
    display: inline-flex;
    align-items: center;
  }
`;

const DateCell = styled(Cell)`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;
`;

// UNUSED: Styled components below are only used in commented-out submitter/decimals columns
// Can be uncommented if those columns are re-enabled

// const SubmitterCell = styled.div`
//   display: flex;
//   flex-direction: row;
//   align-items: center;
//   gap: 8px;
//   overflow: hidden;
//   white-space: nowrap;
//   min-width: 0;
// `;

// const SubmitterLink = styled(Link)`
//   display: flex;
//   align-items: center;
//   gap: 4px;
//   font-size: 14px;
//   text-decoration: none;
//   overflow: hidden;
//   text-overflow: ellipsis;
//   white-space: nowrap;
//   min-width: 0;
//   cursor: pointer !important;

//   label {
//     color: ${({ theme }) => theme.secondaryText};
//     margin-left: 2px;
//   }

//   svg {
//     width: 12px;
//     height: 12px;
//     path {
//       fill: ${({ theme }) => theme.secondaryText};
//     }
//   }

//   &:hover {
//     cursor: pointer !important;
//     label {
//       color: ${({ theme }) => theme.primaryText};
//     }

//     svg {
//       path {
//         fill: ${({ theme }) => theme.primaryText};
//       }
//     }
//   }
// `;

const SubmissionDate = styled(Link)`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
  }
`;

// const DecimalsCell = styled(Cell)`
//   text-align: center;
//   color: ${({ theme }) => theme.secondaryText};
//   font-size: 14px;
//   display: flex;
//   justify-content: center;
//   align-items: center;
// `;

const ChainCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  overflow: hidden;
  white-space: nowrap;

  svg {
    width: 20px;
    height: 20px;
    flex-shrink: 0;
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const EventTime = styled.time`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  /* "Challenge period over" may take two lines in a narrow column rather than be cut. */
  white-space: normal;

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
    opacity: 0.8;
  }
`;

// Shows a link's full address on hover (a native title, found on the link's parent).
const TitleWrap = styled.span`
  display: block;
  min-width: 0;
  overflow: hidden;
`;

const IconTitleWrap = styled.span`
  display: inline-flex;
  flex-shrink: 0;
`;

const DomainCell = styled(Cell)`
  display: flex;
  align-items: center;
  gap: 6px;

  /* A long domain is cut with an ellipsis; the link to the site stays visible. */
  > div {
    min-width: 0;
  }
`;

const ExternalLink = styled(SafeLink)`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  color: ${({ theme }) => theme.secondaryText};
  transition: color 0.2s ease, background 0.2s ease;

  svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
  }

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    background: ${({ theme }) => theme.hoverBackground};
  }
`;


interface ItemListViewProps {
  item: GraphItem;
  challengePeriodDuration: number | null;
}

const ItemListView = React.memo(
  ({ item, challengePeriodDuration }: ItemListViewProps) => {
    const event = useItemEvent(item, challengePeriodDuration);

    const itemUrl = buildItemPath(item.id);

    const getPropValue = (label: string) => getItemProp(item, label);

    const status = getItemDisplayStatus(item);

    // A bounty can only be won while the request can still be challenged.
    const readableBounty =
      (item.status === 'ClearingRequested' ||
        item.status === 'RegistrationRequested') &&
        !item.disputed &&
        event.kind !== 'over'
        ? Number(formatEther(item.requests?.[0]?.deposit || '0'))
        : null;

    const renderContent = () => {
      // UNUSED: submittedDate is only used in commented-out SubmitterCell sections
      // const submittedDate = formatTimestamp(
      //   Number(item.requests[0]?.submissionTime),
      //   true, // Show full timestamp with time
      // );

      const statusCell = (
        <StatusCell status={status}>
          <RowTooltip data-tooltip={statusDescriptionMap[status] || ''}>{status}</RowTooltip>
          {readableBounty ? (
            <RowTooltip data-tooltip={bountyDescriptionMap[item.status] || ''}>
              <BountyBadge>{readableBounty} xDAI</BountyBadge>
            </RowTooltip>
          ) : null}
        </StatusCell>
      );

      // Resolution date once included, removed or rejected; for a pending request, the time left
      // in its challenge period, with the exact end on hover.
      const eventCell = (
        <DateCell>
          {event.kind === 'loading' ? (
            <Skeleton width={100} />
          ) : event.kind === 'countdown' || event.kind === 'over' ? (
            <EventTime dateTime={toIsoString(event.timestamp!)} title={event.title}>
              <HourglassIcon />
              {event.srPrefix ? <span className="visually-hidden">{`${event.srPrefix} `}</span> : null}
              {event.text}
            </EventTime>
          ) : event.kind === 'date' ? (
            <>
              <span className="visually-hidden">{`${event.srPrefix} `}</span>
              {event.text}
            </>
          ) : (
            event.text
          )}
        </DateCell>
      );

      // UNUSED: submitterAddress is only used in commented-out SubmitterCell sections
      // const submitterAddress = item.requests[0]?.requester as `0x${string}` | undefined;

      if (item.registryAddress === registryMap['tokens']) {
        const logoUrl = getItemThumbnailUrl(item) || '';
        const website = getPropValue('Website');

        return (
          <>
            {statusCell}
            <LogoCell>
              {logoUrl ? (
                <>
                  <Skeleton
                    circle
                    width={32}
                    height={32}
                    style={{
                      display: 'block',
                      flexShrink: 0,
                      lineHeight: 1
                    }}
                    containerClassName="skeleton-logo"
                  />
                  <img
                    src={logoUrl}
                    alt="Token logo"
                    onLoad={(e) => {
                      const skeleton = e.currentTarget.previousSibling as HTMLElement;
                      if (skeleton) skeleton.style.display = 'none';
                      e.currentTarget.style.display = 'block';
                    }}
                    style={{ display: 'none' }}
                  />
                </>
              ) : '-'}
            </LogoCell>
            <Cell>
              <SymbolText>{getPropValue('Symbol') || '-'}</SymbolText>
            </Cell>
            <Cell>
              <NameText>{getPropValue('Name') || '-'}</NameText>
            </Cell>
            <Cell>
              {website ? (
                <TitleWrap title={website}>
                  <WebsiteLink
                    url={website}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {website}
                  </WebsiteLink>
                </TitleWrap>
              ) : (
                ''
              )}
            </Cell>
            <AddressCell>
              <AddressDisplay address={getPropValue('Address')} />
            </AddressCell>
            {/* <DecimalsCell>{getPropValue('Decimals') || '-'}</DecimalsCell> */}
            {/* <SubmitterCell>
              {submitterAddress ? (
                <>
                  <SubmitterLink
                    to={`/profile/pending?address=${submitterAddress}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="16" address={submitterAddress} />
                    <AddressOrName address={submitterAddress} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                  <SubmissionDate
                    to={`/tx/${item.requests[0]?.creationTx}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {submittedDate}
                  </SubmissionDate>
                </>
              ) : (
                '-'
              )}
            </SubmitterCell> */}
            {eventCell}
          </>
        );
      }

      if (item.registryAddress === registryMap['single-tags']) {
        const website = getPropValue('UI/Website Link');

        return (
          <>
            {statusCell}
            <Cell>
              <SymbolText>{getPropValue('Project Name') || '-'}</SymbolText>
            </Cell>
            <Cell>
              <NameText>{getPropValue('Public Name Tag') || '-'}</NameText>
            </Cell>
            <Cell>
              {website ? (
                <TitleWrap title={website}>
                  <WebsiteLink
                    url={website}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {website}
                  </WebsiteLink>
                </TitleWrap>
              ) : (
                '-'
              )}
            </Cell>
            <AddressCell>
              <AddressDisplay address={getPropValue('Contract Address')} />
            </AddressCell>
            {/* <SubmitterCell>
              {submitterAddress ? (
                <>
                  <SubmitterLink
                    to={`/profile/pending?address=${submitterAddress}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="16" address={submitterAddress} />
                    <AddressOrName address={submitterAddress} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                  <SubmissionDate
                    to={`/tx/${item.requests[0]?.creationTx}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {submittedDate}
                  </SubmissionDate>
                </>
              ) : (
                '-'
              )}
            </SubmitterCell> */}
            {eventCell}
          </>
        );
      }

      if (item.registryAddress === registryMap['cdn']) {
        const domainName = getPropValue('Domain name');
        const website = domainName || '';
        const proofUrl = getItemThumbnailUrl(item) || '';

        return (
          <>
            {statusCell}
            <LogoCell>
              {proofUrl ? (
                <>
                  <Skeleton
                    width={32}
                    height={32}
                    style={{
                      display: 'block',
                      flexShrink: 0,
                      lineHeight: 1,
                      borderRadius: '4px',
                    }}
                    containerClassName="skeleton-logo"
                  />
                  <img
                    src={proofUrl}
                    alt="Visual proof"
                    style={{ display: 'none', borderRadius: '4px' }}
                    onLoad={(e) => {
                      const skeleton = e.currentTarget.previousSibling as HTMLElement;
                      if (skeleton) skeleton.style.display = 'none';
                      e.currentTarget.style.display = 'block';
                    }}
                  />
                </>
              ) : '-'}
            </LogoCell>
            <DomainCell>
              <SymbolText>{domainName || '-'}</SymbolText>
              {website ? (
                <IconTitleWrap title={`Open ${website}`}>
                  <ExternalLink
                    url={website}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <NewTabIcon />
                    <span className="visually-hidden">{`Open ${website} in a new tab`}</span>
                  </ExternalLink>
                </IconTitleWrap>
              ) : null}
            </DomainCell>
            <AddressCell>
              <AddressDisplay address={getPropValue('Contract address')} />
            </AddressCell>
            {/* <SubmitterCell>
              {submitterAddress ? (
                <>
                  <SubmitterLink
                    to={`/profile/pending?address=${submitterAddress}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="16" address={submitterAddress} />
                    <AddressOrName address={submitterAddress} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                  <SubmissionDate
                    to={`/tx/${item.requests[0]?.creationTx}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {submittedDate}
                  </SubmissionDate>
                </>
              ) : (
                '-'
              )}
            </SubmitterCell> */}
            {eventCell}
          </>
        );
      }

      if (item.registryAddress === registryMap['tags-queries']) {
        const repository = getPropValue('Github Repository URL');
        const commitHash = getPropValue('Commit hash');
        const chainId = getPropValue('EVM Chain ID');
        const ChainIcon = getChainIcon(chainId);
        const chainName = getChainName(chainId) ?? (chainId ? `Chain ${chainId}` : '-');

        return (
          <>
            {statusCell}
            <Cell>
              <NameText>{getPropValue('Description') || '-'}</NameText>
            </Cell>
            <Cell>
              {repository ? (
                <TitleWrap title={repository}>
                  <WebsiteLink
                    url={repository}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {repository}
                  </WebsiteLink>
                </TitleWrap>
              ) : (
                '-'
              )}
            </Cell>
            <Cell>
              <NameText>{commitHash || '-'}</NameText>
            </Cell>
            <ChainCell>
              {ChainIcon && <ChainIcon />}
              <span>{chainName}</span>
            </ChainCell>
            {/* <SubmitterCell>
              {submitterAddress ? (
                <>
                  <SubmitterLink
                    to={`/profile/pending?address=${submitterAddress}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="16" address={submitterAddress} />
                    <AddressOrName address={submitterAddress} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                  <SubmissionDate
                    to={`/tx/${item.requests[0]?.creationTx}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {submittedDate}
                  </SubmissionDate>
                </>
              ) : (
                '-'
              )}
            </SubmitterCell> */}
            {eventCell}
          </>
        );
      }

      return null;
    };

    const registryType = getRegistryKey(item.registryAddress);
    // Names the row's link, and on hover shows the full name or tag the cells may cut off.
    const linkLabel = getItemLinkLabel(item, registryType ?? '');

    return (
      <ListRow $registryType={registryType}>
        <RowLink to={itemUrl} state={{ fromApp: true }} title={linkLabel} data-row-link="" />
        {renderContent()}
      </ListRow>
    );
  },
);

export default ItemListView;
