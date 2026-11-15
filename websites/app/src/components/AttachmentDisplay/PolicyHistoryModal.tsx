import React, { useEffect, useId, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import styled, { css } from 'styled-components';
import { useLocation, useParams, useSearchParams, Link } from 'react-router-dom';
import { format } from 'date-fns';
import Skeleton from 'react-loading-skeleton';
import { registryAddresses, RegistryType } from 'consts/contracts';
import { KLEROS_CDN_BASE } from 'consts/index';
import { getAllowedAttachmentUrl } from 'utils/url-validation';
import { PolicyHistoryEntry } from 'utils/fetchPolicyHistory';
import { usePolicyHistory } from 'hooks/usePolicyHistory';
import { useFocusOutside } from 'hooks/useFocusOutside';
import { useLockOverlayScroll } from 'hooks/useLockOverlayScroll';
import { useDialog } from 'hooks/useDialog';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import { landscapeStyle } from 'styles/landscapeStyle';
import { ModalButton } from 'components/ModalButtons';
import ErrorState from 'components/ErrorState';
import {
  ModalOverlay,
  ModalWrapper,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
  FooterButtons,
} from 'components/ModalComponents';
import NewTabIcon from 'svgs/icons/new-tab.svg';

const StyledModalWrapper = styled(ModalWrapper)`
  max-width: 700px;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const HistoryItem = styled.div<{ $isCurrent: boolean; $isViewing: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid ${({ $isViewing, $isCurrent, theme }) =>
    $isViewing ? theme.secondaryBlue + '60' : $isCurrent ? theme.secondaryBlue + '40' : 'transparent'};
  background: ${({ $isViewing, $isCurrent, theme }) =>
    $isViewing ? theme.secondaryBlue + '14' : $isCurrent ? theme.secondaryBlue + '0A' : 'transparent'};
  ${hoverShortTransitionTiming}

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
  }
`;

const ItemHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const DateRange = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.primaryText};
  font-weight: 600;
`;

const BadgesContainer = styled.div`
  display: flex;
  gap: 6px;
  align-items: center;
`;

const CurrentBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.secondaryBlue};
  background: ${({ theme }) => theme.secondaryBlue}18;
  padding: 2px 8px;
  border-radius: 9999px;
`;

const ViewingBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${({ theme }) => theme.success};
  background: ${({ theme }) => theme.success}18;
  padding: 2px 8px;
  border-radius: 9999px;
`;

const ItemLinks = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
`;

const PolicyLink = styled.a`
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryBlue};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  gap: 4px;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;
  }

  svg {
    width: 12px;
    height: 12px;
    path {
      fill: ${({ theme }) => theme.secondaryBlue};
      ${hoverShortTransitionTiming}
    }
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.primaryBlue};
  }
`;

const ViewButton = styled.button`
  font-size: 13px;
  color: ${({ theme }) => theme.secondaryBlue};
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  min-height: 24px;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;
  }
`;

const TxLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  text-decoration: none;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
  }
`;

// On narrow screens the links wrap, and a separator would be left hanging at the end of a line:
// the row gap separates them there.
const Separator = styled.span`
  display: none;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;

  ${landscapeStyle(
    () => css`
      display: inline;
    `
  )}
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 24px 16px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
`;

const REGISTRY_DISPLAY_NAMES: Record<string, string> = {
  tokens: 'Kleros Tokens',
  cdn: 'CDN',
  'single-tags': 'Single Tags',
  'tags-queries': 'Tag Queries',
};

const formatDate = (iso: string): string => {
  return format(new Date(iso), 'MMM d, yyyy');
};

const truncateHash = (hash: string): string =>
  `${hash.slice(0, 10)}...${hash.slice(-6)}`;

interface PolicyHistoryModalProps {
  onClose: () => void;
}

const PolicyHistoryModal: React.FC<PolicyHistoryModalProps> = ({ onClose }) => {
  const { ref: modalRef, dialogProps } = useDialog<HTMLDivElement>(true, onClose);
  const titleId = useId();
  const { registryName } = useParams<{ registryName: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();

  useFocusOutside(modalRef, onClose);
  useLockOverlayScroll(true);

  const currentPolicyTx = searchParams.get('policyTx');
  const currentAttachmentUrl = searchParams.get('attachment');
  const currentIpfsPath = currentAttachmentUrl
    ? currentAttachmentUrl.replace(KLEROS_CDN_BASE, '')
    : null;

  const registryAddress = registryName
    ? registryAddresses[registryName as RegistryType]
    : undefined;

  const { data: historyData, isLoading, isError, isFetching, refetch } =
    usePolicyHistory(registryAddress);

  // "Try again" disappears when it is pressed (the list reloads); keep keyboard focus in the dialog,
  // not on the page behind it.
  const showsError = isError && !historyData?.length;
  const showedErrorRef = useRef(false);
  useEffect(() => {
    const node = modalRef.current;
    if (showedErrorRef.current && !showsError && node && !node.contains(document.activeElement)) {
      node.focus({ preventScroll: true });
    }
    showedErrorRef.current = showsError;
  }, [showsError, modalRef]);

  const history = useMemo(() => {
    if (!historyData) return [];
    // Show newest first
    return [...historyData].reverse();
  }, [historyData]);

  const handleViewPolicy = (entry: PolicyHistoryEntry) => {
    const url = `${KLEROS_CDN_BASE}${entry.policyURI}`;
    // Replaces the viewer's entry but keeps its router state, so Return still knows whether the
    // viewer was opened in the app.
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set('attachment', url);
      newParams.set('policyTx', entry.txHash);
      newParams.set('isPolicy', 'true');
      return newParams;
    }, { replace: true, state: location.state });
    onClose();
  };

  // Rendered at the top of the document so it covers the site header like the other modals
  // (inside the page it was trapped under the header's stacking order).
  return createPortal(
    <ModalOverlay>
      <StyledModalWrapper>
        <ModalContainer {...dialogProps} aria-labelledby={titleId}>
          <ModalHeader>
            <ModalTitle id={titleId}>
              Policy History
              {registryName && REGISTRY_DISPLAY_NAMES[registryName]
                ? ` - ${REGISTRY_DISPLAY_NAMES[registryName]}`
                : ''}
            </ModalTitle>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>

          <HistoryList aria-busy={isLoading && history.length === 0 ? true : undefined}>
            {isLoading && history.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <HistoryItem key={i} $isCurrent={false} $isViewing={false}>
                    <Skeleton width={220} height={16} />
                    <Skeleton width={300} height={14} />
                  </HistoryItem>
                ))
              : null}
            {isError && history.length === 0 ? (
              <ErrorState
                compact
                title="The policy history did not load."
                message="Gnosis Chain or IPFS did not answer. Check your connection and try again."
                onRetry={() => refetch()}
                retrying={isFetching}
              />
            ) : null}
            {!isLoading && !isError && history.length === 0 ? (
              <EmptyState>No policy history found for this registry.</EmptyState>
            ) : null}
            {history.map((entry) => {
              const isCurrent = entry.endDate === null;
              // If policyTx is set, match by txHash (exact entry).
              // Otherwise, the user opened from the registry page — mark the current entry as viewing.
              const isViewing = currentPolicyTx
                ? entry.txHash === currentPolicyTx
                : isCurrent && currentIpfsPath === entry.policyURI;
              const policyHref = getAllowedAttachmentUrl(
                `${KLEROS_CDN_BASE}${entry.policyURI}`,
              );
              return (
                <HistoryItem key={entry.txHash} $isCurrent={isCurrent} $isViewing={isViewing}>
                  <ItemHeader>
                    <DateRange>
                      {formatDate(entry.startDate)}
                      {' → '}
                      {isCurrent ? 'Present' : formatDate(entry.endDate!)}
                    </DateRange>
                    <BadgesContainer>
                      {isViewing && <ViewingBadge>Viewing</ViewingBadge>}
                      {isCurrent && <CurrentBadge>Current</CurrentBadge>}
                    </BadgesContainer>
                  </ItemHeader>
                  <ItemLinks>
                    <ViewButton type="button" onClick={() => handleViewPolicy(entry)}>
                      View Policy
                    </ViewButton>
                    {policyHref && (
                      <>
                        <Separator aria-hidden="true">|</Separator>
                        <PolicyLink
                          href={policyHref}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Open in new tab
                          <NewTabIcon />
                        </PolicyLink>
                      </>
                    )}
                    <Separator aria-hidden="true">|</Separator>
                    <TxLink to={`/tx/${entry.txHash}`}>
                      tx: {truncateHash(entry.txHash)}
                    </TxLink>
                  </ItemLinks>
                </HistoryItem>
              );
            })}
          </HistoryList>

          <FooterButtons>
            <ModalButton type="button" variant="secondary" onClick={onClose}>
              Close
            </ModalButton>
          </FooterButtons>
        </ModalContainer>
      </StyledModalWrapper>
    </ModalOverlay>,
    document.body,
  );
};

export default PolicyHistoryModal;
