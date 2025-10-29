import React, { useCallback } from 'react';
import styled from 'styled-components';
import { useSearchParams, useNavigate } from 'react-router-dom';
// import { Link } from 'react-router-dom'; // UNUSED: Only needed for SubmitterLink which is commented out
import { formatEther } from 'ethers';
import { GraphItem, registryMap } from 'utils/items';
import AddressDisplay from 'components/AddressDisplay';
// import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'; // UNUSED: Only needed for submitter display which is commented out
import { formatTimestamp } from 'utils/formatTimestamp';
import useHumanizedCountdown, {
  useChallengeRemainingTime,
} from 'hooks/countdown';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
// import ArrowIcon from 'assets/svgs/icons/arrow.svg'; // UNUSED: Only needed for submitter links which are commented out
import Skeleton from 'react-loading-skeleton';

// Chain icons
import ArbitrumIcon from 'assets/svgs/chains/arbitrum.svg';
import AvalancheIcon from 'assets/svgs/chains/avalanche.svg';
import BaseIcon from 'assets/svgs/chains/base.svg';
import BnbIcon from 'assets/svgs/chains/bnb.svg';
import CeloIcon from 'assets/svgs/chains/celo.svg';
import EthereumIcon from 'assets/svgs/chains/ethereum.svg';
import FantomIcon from 'assets/svgs/chains/fantom.svg';
import GnosisIcon from 'assets/svgs/chains/gnosis.svg';
import OptimismIcon from 'assets/svgs/chains/optimism.svg';
import PolygonIcon from 'assets/svgs/chains/polygon.svg';
import ScrollIcon from 'assets/svgs/chains/scroll.svg';
import SolanaIcon from 'assets/svgs/chains/solana.svg';
import ZkSyncIcon from 'assets/svgs/chains/zksync.svg';

// Chain icon mapping
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

const ListRow = styled.div<{ registryType?: string; }>`
  ${hoverLongTransitionTiming}
  display: grid;
  grid-template-columns: ${({ registryType }) => {
    switch (registryType) {
      case 'Tokens':
        return '1.2fr 0.3fr 0.5fr 0.6fr 1fr 1.2fr 1fr'; // Status, Logo, Symbol, Name, Website, Address, Period ends in
      case 'Single_Tags':
        return '1.2fr 0.8fr 1fr 1fr 1.2fr 1fr'; // Status, Project, Tag, Website, Address, Period ends in
      case 'CDN':
        return '1.2fr 1fr 1fr 1.2fr 1fr'; // Status, Domain, Website, Address, Period ends in
      case 'Tags_Queries':
        return '1.2fr 1.3fr 1fr 0.4fr 0.9fr 1fr'; // Status, Description, Repository, Commit, Chain, Period ends in
      default:
        return '200px 280px 180px 200px 100px 180px';
    }
  }};
  gap: 16px;
  align-items: center;
  padding: 8px 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  font-family: "Open Sans", sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;

  &:first-child {
    padding-top: 0;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  &:last-child {
    border-bottom: none;
  }
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
    background-color: ${({ status }) =>
    ({
      Included: '#90EE90',
      'Registration Requested': '#FFEA00',
      'Challenged Submission': '#E87B35',
      'Challenged Removal': '#E87B35',
      Removed: 'red',
    })[status] || 'gray'};
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

const WebsiteLink = styled.a`
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

// const SubmissionDate = styled.a`
//   color: ${({ theme }) => theme.secondaryText};
//   font-size: 12px;
//   font-style: italic;
//   overflow: hidden;
//   text-overflow: ellipsis;
//   white-space: nowrap;
//   text-decoration: none;
//   cursor: pointer;
//   transition: color 0.2s ease;

//   &:hover {
//     color: ${({ theme }) => theme.primaryText};
//     text-decoration: underline;
//   }
// `;

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
`;

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

interface ItemListViewProps {
  item: GraphItem;
  challengePeriodDuration: number | null;
}

const ItemListView = React.memo(
  ({ item, challengePeriodDuration }: ItemListViewProps) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const challengeRemainingTime = useChallengeRemainingTime(
      item.requests[0]?.submissionTime,
      item.disputed,
      challengePeriodDuration,
    );
    const formattedChallengeRemainingTime = useHumanizedCountdown(
      challengeRemainingTime,
      2,
    );

    const handleClick = useCallback(() => {
      navigate(`/item/${item.id}?${searchParams.toString()}`);
    }, [navigate, item.id, searchParams]);

    const getPropValue = (label: string) => {
      return item?.props?.find((prop) => prop.label === label)?.value || '';
    };

    const status = item.disputed
      ? challengedStatusMap[item.status]
      : readableStatusMap[item.status];

    const readableBounty =
      (item.status === 'ClearingRequested' ||
        item.status === 'RegistrationRequested') &&
        !item.disputed
        ? Number(formatEther(item.requests[0].deposit))
        : null;

    const renderContent = () => {
      // UNUSED: submittedDate is only used in commented-out SubmitterCell sections
      // const submittedDate = formatTimestamp(
      //   Number(item.requests[0]?.submissionTime),
      //   true, // Show full timestamp with time
      // );

      const isLoading = challengePeriodDuration === null && item.status !== 'Registered' && !item.disputed;

      const periodEndsIn = item.status === 'Registered'
        ? formatTimestamp(Number(item.requests[0]?.resolutionTime), false)
        : (isLoading ? <Skeleton width={100} /> : formattedChallengeRemainingTime || '');

      // UNUSED: submitterAddress is only used in commented-out SubmitterCell sections
      // const submitterAddress = item.requests[0]?.requester as `0x${string}` | undefined;

      if (item.registryAddress === registryMap.Tokens) {
        const logoUrl = getPropValue('Logo')
          ? `https://cdn.kleros.link${getPropValue('Logo')}`
          : '';
        const website = getPropValue('Website');

        return (
          <>
            <StatusCell status={status}>
              {status}
              {readableBounty && <BountyBadge> ${readableBounty}</BountyBadge>}
            </StatusCell>
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
                <WebsiteLink
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {website}
                </WebsiteLink>
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
                    to={`/activity/ongoing?userAddress=${submitterAddress}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="16" address={submitterAddress} />
                    <AddressOrName address={submitterAddress} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                  <SubmissionDate
                    href={`https://gnosisscan.io/tx/${item.requests[0]?.creationTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {submittedDate}
                  </SubmissionDate>
                </>
              ) : (
                '-'
              )}
            </SubmitterCell> */}
            <DateCell>{periodEndsIn}</DateCell>
          </>
        );
      }

      if (item.registryAddress === registryMap.Single_Tags) {
        const website = getPropValue('UI/Website Link');

        return (
          <>
            <StatusCell status={status}>
              {status}
              {readableBounty && <BountyBadge> ${readableBounty}</BountyBadge>}
            </StatusCell>
            <Cell>
              <SymbolText>{getPropValue('Project Name') || '-'}</SymbolText>
            </Cell>
            <Cell>
              <NameText>{getPropValue('Public Name Tag') || '-'}</NameText>
            </Cell>
            <Cell>
              {website ? (
                <WebsiteLink
                  href={website.startsWith('http') ? website : `https://${website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {website}
                </WebsiteLink>
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
                    to={`/activity/ongoing?userAddress=${submitterAddress}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="16" address={submitterAddress} />
                    <AddressOrName address={submitterAddress} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                  <SubmissionDate
                    href={`https://gnosisscan.io/tx/${item.requests[0]?.creationTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {submittedDate}
                  </SubmissionDate>
                </>
              ) : (
                '-'
              )}
            </SubmitterCell> */}
            <DateCell>{periodEndsIn}</DateCell>
          </>
        );
      }

      if (item.registryAddress === registryMap.CDN) {
        const domainName = getPropValue('Domain name');
        const website = domainName ? `https://${domainName}` : '';

        return (
          <>
            <StatusCell status={status}>
              {status}
              {readableBounty && <BountyBadge> ${readableBounty}</BountyBadge>}
            </StatusCell>
            <Cell>
              <SymbolText>{domainName || '-'}</SymbolText>
            </Cell>
            <Cell>
              {website ? (
                <WebsiteLink
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {website}
                </WebsiteLink>
              ) : (
                '-'
              )}
            </Cell>
            <AddressCell>
              <AddressDisplay address={getPropValue('Contract address')} />
            </AddressCell>
            {/* <SubmitterCell>
              {submitterAddress ? (
                <>
                  <SubmitterLink
                    to={`/activity/ongoing?userAddress=${submitterAddress}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="16" address={submitterAddress} />
                    <AddressOrName address={submitterAddress} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                  <SubmissionDate
                    href={`https://gnosisscan.io/tx/${item.requests[0]?.creationTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {submittedDate}
                  </SubmissionDate>
                </>
              ) : (
                '-'
              )}
            </SubmitterCell> */}
            <DateCell>{periodEndsIn}</DateCell>
          </>
        );
      }

      if (item.registryAddress === registryMap.Tags_Queries) {
        const repository = getPropValue('Github Repository URL');
        const commitHash = getPropValue('Commit hash');
        const chainId = getPropValue('EVM Chain ID');
        const ChainIcon = chainIconMap[chainId];

        return (
          <>
            <StatusCell status={status}>
              {status}
              {readableBounty && <BountyBadge> ${readableBounty}</BountyBadge>}
            </StatusCell>
            <Cell>
              <NameText>{getPropValue('Description') || '-'}</NameText>
            </Cell>
            <Cell>
              {repository ? (
                <WebsiteLink
                  href={repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  {repository}
                </WebsiteLink>
              ) : (
                '-'
              )}
            </Cell>
            <Cell>
              <NameText>{commitHash || '-'}</NameText>
            </Cell>
            <ChainCell>
              {ChainIcon && <ChainIcon />}
              <span>Chain {chainId}</span>
            </ChainCell>
            {/* <SubmitterCell>
              {submitterAddress ? (
                <>
                  <SubmitterLink
                    to={`/activity/ongoing?userAddress=${submitterAddress}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="16" address={submitterAddress} />
                    <AddressOrName address={submitterAddress} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                  <SubmissionDate
                    href={`https://gnosisscan.io/tx/${item.requests[0]?.creationTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {submittedDate}
                  </SubmissionDate>
                </>
              ) : (
                '-'
              )}
            </SubmitterCell> */}
            <DateCell>{periodEndsIn}</DateCell>
          </>
        );
      }

      return null;
    };

    const getRegistryType = () => {
      if (item.registryAddress === registryMap.Tokens) return 'Tokens';
      if (item.registryAddress === registryMap.Single_Tags) return 'Single_Tags';
      if (item.registryAddress === registryMap.CDN) return 'CDN';
      if (item.registryAddress === registryMap.Tags_Queries) return 'Tags_Queries';
      return undefined;
    };

    return (
      <ListRow registryType={getRegistryType()} onClick={handleClick}>
        {renderContent()}
      </ListRow>
    );
  },
);

export default ItemListView;
