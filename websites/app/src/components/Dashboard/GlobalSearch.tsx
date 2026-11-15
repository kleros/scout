import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { useDebounce } from 'react-use';
import { Link } from 'react-router-dom';
import { useItemsQuery } from 'hooks/queries/useItemsQuery';
import { revRegistryMap, buildItemPath, registryDisplayNames, getItemDisplayName, getChainId, getItemDisplayStatus, GraphItem } from 'utils/items';
import SearchIcon from 'svgs/icons/search.svg';
import CloseIcon from 'svgs/icons/close.svg';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
import { useIsMobile } from 'hooks/useIsMobile';
import { useDialog } from 'hooks/useDialog';
import { useLockOverlayScroll } from 'hooks/useLockOverlayScroll';
import { SubmissionSelectionModal } from 'components/SubmissionSelectionModal';
import ErrorState from 'components/ErrorState';
import {
  ChainLogo,
  ChallengePeriods,
  ItemCountdown,
  getItemSecondaryLabel,
  useRegistryChallengePeriods,
} from './itemRow';

/** The search shows this many matches, newest first; the query asks for one more to know there are more. */
const SEARCH_LIMIT = 20;

const Overlay = styled.div<{ $isActive: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: ${({ theme }) => theme.lightBackground};
  z-index: 999;
  opacity: ${({ $isActive }) => ($isActive ? 1 : 0)};
  pointer-events: ${({ $isActive }) => ($isActive ? 'auto' : 'none')};
  transition: opacity 0.3s ease;
`;

const SearchContainer = styled.div<{ $isActive: boolean }>`
  position: relative;
  width: 100%;
  margin: 0 auto;
  z-index: ${({ $isActive }) => ($isActive ? 1000 : 1)};

  ${({ $isActive }) => $isActive && css`
    position: fixed;
    top: 120px;
    left: 50%;
    transform: translateX(-50%);
    padding: 0 16px;
    max-width: 630px;
  `}
`;

const Container = styled.div`
  ${hoverLongTransitionTiming}
  display: flex;
  align-items: center;
  background-color: transparent;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding-left: 16px;
  padding-right: 8px;
  width: 100%;
  height: 48px;

  svg {
    flex-shrink: 0;
  }

  :hover {
    background-color: ${({ theme }) => theme.hoverBackground};
  }

  /* The field itself has no outline: the whole pill shows keyboard focus, like the global ring. */
  &:focus-within {
    outline: 2px solid ${({ theme }) => theme.primaryBlue};
    outline-offset: 2px;
  }

  /* The clear button has its own ring. */
  &:has(button:focus-visible) {
    outline: none;
  }
`;

const StyledInput = styled.input`
  flex-grow: 1;
  min-width: 0;
  padding: 8px;
  background: transparent;
  font-size: 16px;
  outline: none;
  border: none;
  color: ${({ theme }) => theme.primaryText};
  border-radius: 12px;
  text-overflow: ellipsis;

  ::placeholder {
    color: ${({ theme }) => theme.secondaryText};
  }
`;

const ClearButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
  ${hoverLongTransitionTiming}

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    background: ${({ theme }) => theme.hoverBackground};
  }
`;

const ResultsDropdown = styled.div<{ $isVisible: boolean; $isActive: boolean }>`
  position: absolute;
  top: calc(100% + 8px);
  /* While the search is open its container has 16px side padding: keep the panel under the field. */
  left: ${({ $isActive }) => ($isActive ? '16px' : '0')};
  right: ${({ $isActive }) => ($isActive ? '16px' : '0')};
  background: ${({ theme }) => theme.lightBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 16px;
  max-height: 500px;
  overflow-y: auto;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  /* Hidden also from keyboard and screen readers, not only from sight. */
  visibility: ${({ $isVisible }) => ($isVisible ? 'visible' : 'hidden')};
  pointer-events: ${({ $isVisible }) => ($isVisible ? 'auto' : 'none')};
  transition: ${({ $isVisible }) =>
    $isVisible ? 'opacity 0.2s ease, visibility 0s' : 'opacity 0.2s ease, visibility 0s linear 0.2s'};
  box-shadow: ${({ theme }) => theme.shadowDropdown};
  z-index: 1001;
`;

const ResultsList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const ResultListItem = styled.li`
  border-bottom: 1px solid ${({ theme }) => theme.divider};

  &:last-child {
    border-bottom: none;
  }
`;

const ResultItem = styled(Link)`
  ${hoverLongTransitionTiming}
  display: block;
  padding: 12px 16px;
  color: inherit;
  text-decoration: none;
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.subtleBackground};
  }

  &:focus-visible {
    outline-offset: -2px;
    background: ${({ theme }) => theme.subtleBackground};
  }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
`;

const LeftSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
`;

const RightSection = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
`;

const ResultName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;

  ${landscapeStyle(
    () => css`
      max-width: none;
    `
  )}
`;

const ResultRegistry = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  flex-shrink: 0;
`;

/** Public name tag or address: what tells this row apart from others with the same name. */
const SecondaryLabel = styled.span`
  flex: 1 1 0;
  min-width: 72px;
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StatusBadge = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.primaryText};
  white-space: nowrap;

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

const ChainInfo = styled(ChainLogo)`
  svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
  }
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: ${({ theme }) => theme.secondaryText};
  white-space: nowrap;

  &:empty {
    display: none;
  }

  svg {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }
`;

const LoadingMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
`;

const EmptyMessage = styled.div`
  padding: 20px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const MoreNote = styled.p`
  margin: 0;
  padding: 12px 16px;
  font-size: 12px;
  line-height: 18px;
  color: ${({ theme }) => theme.secondaryText};
  border-top: 1px solid ${({ theme }) => theme.divider};
`;

const SubmitButton = styled.button`
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  border: none;
  border-radius: 9999px;
  padding: 10px 20px;
  font-size: 14px;
  font-family: "Manrope", sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
  }
`;

const SuggestionButton = styled.button`
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  border: 1px solid ${({ theme }) => theme.buttonSecondaryBorder};
  border-radius: 9999px;
  padding: 8px 16px;
  font-size: 14px;
  font-family: "Manrope", sans-serif;
  font-weight: 600;
  cursor: pointer;
  overflow-wrap: anywhere;
  ${hoverLongTransitionTiming}

  &:hover {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
  }
`;

const ModalWrapper = styled.div`
  position: relative;
  z-index: 1002;
`;

/**
 * For a pasted link ("https://app.aave.com/"), the site name the registries are keyed by
 * ("app.aave.com"). Undefined for anything that is not a web link.
 */
const getSearchableHost = (term: string): string | undefined => {
  if (!/^https?:\/\//i.test(term)) return undefined;
  try {
    const host = new URL(term).hostname.replace(/^www\./i, '');
    return host && host !== term ? host : undefined;
  } catch {
    return undefined;
  }
};

interface SearchResultItemProps {
  item: GraphItem;
  periods: ChallengePeriods;
  onOpen: () => void;
}

// Defined outside GlobalSearch: rows keep their state (and their countdown) while the user types.
const SearchResultItem: React.FC<SearchResultItemProps> = ({ item, periods, onOpen }) => {
  const registryName = revRegistryMap[item.registryAddress] || 'Unknown';
  const displayName = getItemDisplayName(item, registryName);
  const secondaryLabel = getItemSecondaryLabel(item, registryName);
  const status = getItemDisplayStatus(item);
  const chainId = getChainId(item);

  return (
    <ResultListItem>
      <ResultItem
        to={buildItemPath(item.id)}
        state={{ fromApp: true, from: 'home' }}
        onClick={onOpen}
        data-search-result=""
      >
        <TopRow>
          <LeftSection>
            <ResultName>{displayName}</ResultName>
            <ResultRegistry>({registryDisplayNames[registryName] || registryName})</ResultRegistry>
            {secondaryLabel ? <SecondaryLabel title={secondaryLabel}>{secondaryLabel}</SecondaryLabel> : null}
            {!item.disputed && (
              <TimeInfo>
                <ItemCountdown item={item} periods={periods} skeletonWidth={100} />
              </TimeInfo>
            )}
          </LeftSection>
          <RightSection>
            <StatusBadge status={status}>{status}</StatusBadge>
            <ChainInfo chainId={chainId} />
          </RightSection>
        </TopRow>
      </ResultItem>
    </ResultListItem>
  );
};

interface SearchResultsProps {
  items: GraphItem[];
  hasMore: boolean;
  onOpen: () => void;
}

const SearchResultsList: React.FC<SearchResultsProps & { periods: ChallengePeriods }> = ({ items, hasMore, onOpen, periods }) => (
  <>
    <ResultsList aria-label="Search results">
      {items.map((item) => (
        <SearchResultItem key={item.id} item={item} periods={periods} onOpen={onOpen} />
      ))}
    </ResultsList>
    {hasMore ? (
      <MoreNote>
        Showing the {SEARCH_LIMIT} most recent matches. Type more of the name or the address to narrow them down.
      </MoreNote>
    ) : null}
  </>
);

const SearchResultsWithCountdowns: React.FC<SearchResultsProps> = (props) => {
  // One read of the four challenge periods for the whole list, not one per row.
  const periods = useRegistryChallengePeriods();
  return <SearchResultsList {...props} periods={periods} />;
};

/** No countdown to show: no challenge period to read. */
const NO_PERIODS: ChallengePeriods = { byRegistry: {}, gaveUp: true };

const isInChallengePeriod = (item: GraphItem) =>
  !item.disputed && (item.status === 'RegistrationRequested' || item.status === 'ClearingRequested');

const SearchResults: React.FC<SearchResultsProps> = (props) =>
  props.items.some(isInChallengePeriod) ? (
    <SearchResultsWithCountdowns {...props} />
  ) : (
    <SearchResultsList {...props} periods={NO_PERIODS} />
  );

interface GlobalSearchProps {
  className?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ className }) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState<string>('');
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState<boolean>(false);
  const isMobile = useIsMobile();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsId = useId();

  useDebounce(
    () => {
      // A pasted address often carries a space or a line break; the field keeps what was typed.
      setDebouncedSearchTerm(searchTerm.trim());
    },
    500,
    [searchTerm]
  );

  const { data: searchResult, isLoading, isError, isFetching, refetch } = useItemsQuery({
    registryNames: ['tokens', 'cdn', 'single-tags', 'tags-queries'],
    status: ['Registered', 'RegistrationRequested', 'ClearingRequested'],
    disputed: ['true', 'false'],
    text: debouncedSearchTerm,
    orderDirection: 'desc',
    page: 1,
    chainFilters: [],
    enabled: !!debouncedSearchTerm,
  });

  const items = searchResult?.items ?? [];
  const hasResults = items.length > 0;
  const hasMore = Boolean(searchResult?.hasMore) || items.length > SEARCH_LIMIT;
  const showDropdown = isActive && debouncedSearchTerm.length > 0;
  const suggestedHost = !isLoading && !isError && !hasResults ? getSearchableHost(debouncedSearchTerm) : undefined;

  useEffect(() => {
    setIsActive(searchTerm.length > 0);
  }, [searchTerm]);

  const closeSearch = useCallback(() => {
    setSearchTerm('');
    setIsActive(false);
  }, []);

  // While the search covers the page: Tab stays in the search, Escape clears it (focus stays in the
  // field), and the page behind does not scroll. The chooser opened from here is a dialog on top.
  const { ref: searchRef } = useDialog<HTMLDivElement>(
    isActive,
    () => {
      closeSearch();
      inputRef.current?.focus();
    },
    { restoreFocus: false },
  );
  useLockOverlayScroll(isActive);

  const handleClear = () => {
    setSearchTerm('');
    inputRef.current?.focus();
  };

  // Down and Up move between the field and the results; Enter opens the focused result (it is a link).
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    const container = searchRef.current;
    if (!container) return;
    const results = Array.from(container.querySelectorAll<HTMLAnchorElement>('[data-search-result]'));
    if (results.length === 0) return;
    const current = results.indexOf(document.activeElement as HTMLAnchorElement);
    const onInput = document.activeElement === inputRef.current;
    if (!onInput && current === -1) return;
    event.preventDefault();
    if (event.key === 'ArrowDown') {
      results[onInput ? 0 : Math.min(current + 1, results.length - 1)].focus();
    } else if (current <= 0) {
      inputRef.current?.focus();
    } else {
      results[current - 1].focus();
    }
  };

  // Announced to screen readers as results change (the error itself is announced by ErrorState).
  const statusMessage = !showDropdown || isError
    ? ''
    : isLoading
        ? 'Searching...'
        : hasResults
          ? `${Math.min(items.length, SEARCH_LIMIT)}${hasMore ? '+' : ''} ${items.length === 1 ? 'result' : 'results'}`
          : `No results found for "${debouncedSearchTerm}"`;

  return (
    <>
      <Overlay $isActive={isActive || isSubmissionModalOpen} onClick={closeSearch} />
      <SearchContainer
        ref={searchRef}
        role="search"
        $isActive={isActive}
        className={className}
        onKeyDown={handleKeyDown}
      >
        <Container>
          <SearchIcon aria-hidden="true" />
          <StyledInput
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search all registries"
            aria-controls={resultsId}
            autoComplete="off"
            enterKeyHint="search"
            placeholder={
              isMobile
                ? 'Search items, addresses, names…'
                : 'Search for any item with keywords, address, name, etc.'
            }
          />
          {searchTerm ? (
            <ClearButton type="button" aria-label="Clear search" onClick={handleClear}>
              <CloseIcon aria-hidden="true" />
            </ClearButton>
          ) : null}
        </Container>
        <span className="visually-hidden" role="status">
          {statusMessage}
        </span>
        <ResultsDropdown
          id={resultsId}
          // Stays shown under the chooser's overlay: hiding it would leave the chooser no
          // "Submit it Now" to give focus back to when it closes.
          $isVisible={showDropdown}
          $isActive={isActive}
        >
          {!showDropdown ? null : isError ? (
            // A failed read is not "no results": nothing was checked.
            <ErrorState
              compact
              title="The search did not load."
              message="Nothing was checked, so this does not mean the entry is missing. Check your connection and try again."
              onRetry={() => refetch()}
              retrying={isFetching}
            />
          ) : isLoading ? (
            <LoadingMessage>Searching...</LoadingMessage>
          ) : hasResults ? (
            <SearchResults items={items.slice(0, SEARCH_LIMIT)} hasMore={hasMore} onOpen={closeSearch} />
          ) : (
            <EmptyMessage>
              <div>No results found for "{debouncedSearchTerm}"</div>
              {suggestedHost ? (
                <SuggestionButton type="button" onClick={() => setSearchTerm(suggestedHost)}>
                  Search for "{suggestedHost}" instead
                </SuggestionButton>
              ) : null}
              <SubmitButton type="button" onClick={() => setIsSubmissionModalOpen(true)}>
                Submit it Now
              </SubmitButton>
            </EmptyMessage>
          )}
        </ResultsDropdown>
      </SearchContainer>

      <ModalWrapper>
        <SubmissionSelectionModal
          isOpen={isSubmissionModalOpen}
          // Closing the chooser returns to the search as it was (focus goes back to "Submit it Now").
          onClose={() => setIsSubmissionModalOpen(false)}
        />
      </ModalWrapper>
    </>
  );
};
