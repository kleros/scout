import React, { useEffect, useMemo, useState, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useSearchParams, useParams } from 'react-router-dom';
import { useItemsQuery, useItemCountsQuery } from '../../hooks/queries';
import { registryMap, registryDisplayNames } from 'utils/items';
import { useRegistryFilters, ALL_NETWORK_FILTERS, getActiveFilterCount } from 'context/FilterContext';
import { useDocumentTitle } from 'hooks/useDocumentTitle';
import ErrorState from 'components/ErrorState';
import { StyledButton } from 'components/Button';
import SubmitButton from './SubmitButton';
import Search from './Search';
import LoadingItems from './LoadingItems';
import ItemsList from './ItemsList';
import { StyledPagination } from 'components/StyledPagination';
import ParametersModal from './ParametersModal';
import FilterModal from 'components/FilterModal';
import FilterButton from 'components/FilterButton';
import ViewSwitcher from 'components/ViewSwitcher';
import { useViewMode } from 'hooks/useViewMode';
import { usePolicyHistory } from 'hooks/usePolicyHistory';
import CloseIcon from 'svgs/icons/close.svg';
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay';
import PolicyButton from './PolicyButton';
import ExportButton from './ExportButton';
import ExportModal from './ExportModal';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import HeroShadowSVG from 'svgs/header/hero-shadow.svg';
import { MAX_WIDTH_LANDSCAPE, landscapeStyle } from 'styles/landscapeStyle';
import { responsiveSize } from 'styles/responsiveSize';
import ScrollTop from 'components/ScrollTop';

const Container = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.lightBackground};
  padding: 24px 16px 40px;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  color: ${({ theme }) => theme.primaryText};
  font-family: "Manrope", sans-serif;
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      padding: 36px ${responsiveSize(0, 48)} 60px;
    `
  )}
`;

const PageInner = styled.div`
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  z-index: 0;
`;

const FullWidthSection = styled.div`
  display: flex;
  width: 100%;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  overflow: visible;
`;

const ActionablesContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  align-items: center;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      gap: 24px;
    `
  )}
`;

const SearchAndFiltersContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  flex: 1 1 100%;

  ${landscapeStyle(
    () => css`
      flex: 1 1 auto;
      flex-wrap: nowrap;
    `
  )}
`;

const PolicyAndSubmitItemContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;

  ${landscapeStyle(
    () => css`
      gap: 24px;
    `
  )}
`;

const ParametersButton = styled.button.attrs({ type: 'button' })`
  ${hoverShortTransitionTiming}
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0;
  background: none;
  border: none;
  cursor: pointer;
  color: ${({ theme }) => theme.secondaryText};
  font-family: "Manrope", sans-serif;
  font-size: 14px;
  font-weight: 400;

  :hover {
    color: ${({ theme }) => theme.primaryText};
  }
`;

export const StyledCloseButton = styled(CloseIcon)`
  display: flex;
  z-index: 100;
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.white};
  font-size: 24px;
  cursor: pointer;
`;

export const ClosedButtonContainer = styled.div`
  display: flex;
  width: 24px;
  height: 24px;
`;

export const ITEMS_PER_PAGE = 20;

/** The filtered count asks the indexer for at most this many ids (see useItemsQuery). */
const COUNT_LIMIT = 1000;

const MessageContainer = styled.div`
  width: 100%;
  padding: 40px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  text-align: center;
`;

const MessageTitle = styled.p`
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  color: ${({ theme }) => theme.primaryText};
  overflow-wrap: anywhere;
`;

const MessageLine = styled.p`
  margin: 0;
  max-width: 480px;
  font-size: 14px;
  line-height: 20px;
  color: ${({ theme }) => theme.secondaryText};
`;

const MessageActions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
`;

interface ListMessageAction {
  label: string;
  onClick: () => void;
}

/** Why the list shows nothing, and the way out. */
const ListMessage: React.FC<{ title: string; line?: string; actions?: ListMessageAction[] }> = ({
  title,
  line,
  actions = [],
}) => (
  <MessageContainer role="status">
    <MessageTitle>{title}</MessageTitle>
    {line ? <MessageLine>{line}</MessageLine> : null}
    {actions.length > 0 ? (
      <MessageActions>
        {actions.map(({ label, onClick }) => (
          <StyledButton key={label} type="button" variant="secondary" size="small" onClick={onClick}>
            {label}
          </StyledButton>
        ))}
      </MessageActions>
    ) : null}
  </MessageContainer>
);

/** "verification status", "verification status and one network", "a, one b and one c". */
const joinGroups = (groups: string[]) =>
  groups.length <= 1
    ? groups.join('')
    : `${groups.slice(0, -1).join(', one ')} and one ${groups[groups.length - 1]}`;

const HeroWrapper = styled.div`
  position: relative;
  width: 100%;
  border-radius: 20px;
  overflow: visible;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
`;

const HeroShadow = styled.div`
  position: absolute;
  top: -280px;
  left: 50%;
  transform: translateX(-50%);
  width: 1000px;
  height: 600px;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  display: none;

  ${landscapeStyle(
    () => css`
      display: none;
    `
  )}
`;

const HeroTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
  margin: 0;
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
  filter: drop-shadow(0 0 12px ${({ theme }) => theme.secondaryBlue}59)
          drop-shadow(0 0 24px ${({ theme }) => theme.secondaryBlue}33);
  text-shadow: 0 0 15px ${({ theme }) => theme.secondaryBlue}66,
               0 0 30px ${({ theme }) => theme.secondaryBlue}40;

  ${landscapeStyle(
    () => css`
      filter: drop-shadow(0 0 15px ${({ theme }) => theme.secondaryBlue}66)
              drop-shadow(0 0 30px ${({ theme }) => theme.secondaryBlue}40);
      text-shadow: 0 0 18px ${({ theme }) => theme.secondaryBlue}73,
                   0 0 36px ${({ theme }) => theme.secondaryBlue}4D;
    `
  )}
`;

const HeroSubtitle = styled.h2`
  font-size: 16px;
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};
  margin: 0;
  position: relative;
  z-index: 1;
  letter-spacing: 0.3px;
`;

const HeroDescription = styled.p`
  font-size: 14px;
  line-height: 1.4;
  max-width: 880px;
  margin: 0;
  color: ${({ theme }) => theme.secondaryText};
  position: relative;
  z-index: 1;
`;

const REGISTRY_INFO: Record<string, { title: string; subtitle?: string; description: string; }> = {
  'cdn': {
    title: 'Contract Domain Name - CDN',
    description:
      'The Contract Domain Name (CDN) prevents front-end DNS attacks. It associates smart contracts to specific domains, ensuring users interact with the correct contract. If a website is hacked and the contract is altered, the change will be detected.'
  },
  'single-tags': {
    title: 'Single Tags',
    description:
      'A registry that links addresses to verified public tags to help users avoid scams.'
  },
  'tags-queries': {
    title: 'Tag Queries',
    description:
      'A registry of verified query modules that retrieve address tags for many contracts at once.'
  },
  'tokens': {
    title: 'Kleros Tokens',
    description:
      'A community-curated list of safe, whitelisted cryptoassets.'
  }
};

const Hero: React.FC<{ registryKey: string; }> = ({ registryKey }) => {
  const info = REGISTRY_INFO[registryKey];
  if (!info) return null;
  return (
    <HeroWrapper>
      <HeroShadow>
        <HeroShadowSVG />
      </HeroShadow>
      <HeroTitle>{info.title}</HeroTitle>
      {info.subtitle && <HeroSubtitle>{info.subtitle}</HeroSubtitle>}
      <HeroDescription>{info.description}</HeroDescription>
    </HeroWrapper>
  );
};

const Home: React.FC = () => {
  const { registryName = '' } = useParams<{ registryName: string }>();
  const [searchParams] = useSearchParams();
  const filters = useRegistryFilters();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);
  const chainFilters = filters.chainFilters;
  const [viewMode, setViewMode] = useViewMode();
  const [isFilterChanging, setIsFilterChanging] = useState(false);

  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams]
  );
  const isPolicyOpen = isAttachmentOpen && (searchParams.has('isPolicy') || searchParams.has('policyTx'));
  const registryLabel = registryDisplayNames[registryName];
  useDocumentTitle(registryLabel ? (isPolicyOpen ? `${registryLabel} policy` : registryLabel) : undefined);

  const searchText = filters.text.trim();

  // Only fetch count when complex filters are active (simple filters use precise countsData instead)
  const hasComplexFilters = !!(searchText || (chainFilters.length > 0 && chainFilters.length < ALL_NETWORK_FILTERS.length) || filters.hasEverBeenDisputed || filters.dateRange !== 'all');

  // A group with nothing ticked matches nothing: say so instead of loading forever.
  const emptyGroups = [
    filters.status.length === 0 && 'verification status',
    filters.disputed.length === 0 && 'challenge status',
    chainFilters.length === 0 && 'network',
  ].filter((group): group is string => !!group);

  const {
    isLoading: searchLoading,
    isFetching: searchFetching,
    isError: searchFailed,
    data: searchResult,
    refetch: refetchSearch,
  } = useItemsQuery({
    registryName,
    status: filters.status,
    disputed: filters.disputed,
    hasEverBeenDisputed: filters.hasEverBeenDisputed,
    text: filters.text,
    orderDirection: filters.orderDirection,
    page: filters.page,
    chainFilters,
    dateRange: filters.dateRange,
    customDateFrom: filters.customDateFrom,
    customDateTo: filters.customDateTo,
    includeCount: hasComplexFilters,
    enabled: emptyGroups.length === 0,
  });

  const searchData = searchResult?.items;

  const { isLoading: countsLoading, isError: countsFailed, data: countsData } = useItemCountsQuery();

  // Use precise pre-computed counts for simple filters, fall back to totalCount from query for complex filters
  const currentItemCount = useMemo(() => {
    if (hasComplexFilters) return null;

    const { status, disputed } = filters;
    if (countsLoading || !registryName || status.length === 0 || disputed.length === 0 || !countsData?.[registryName]) {
      return undefined;
    }

    const getCount = (r: string) => (
      (status.includes('Absent') && disputed.includes('false') ? countsData[r].numberOfAbsent : 0) +
      (status.includes('Registered') && disputed.includes('false') ? countsData[r].numberOfRegistered : 0) +
      (status.includes('RegistrationRequested') && disputed.includes('false') ? countsData[r].numberOfRegistrationRequested : 0) +
      (status.includes('RegistrationRequested') && disputed.includes('true') ? countsData[r].numberOfChallengedRegistrations : 0) +
      (status.includes('ClearingRequested') && disputed.includes('false') ? countsData[r].numberOfClearingRequested : 0) +
      (status.includes('ClearingRequested') && disputed.includes('true') ? countsData[r].numberOfChallengedClearing : 0)
    );

    return getCount(registryName as string);
  }, [hasComplexFilters, filters.status, filters.disputed, countsData, countsLoading, registryName]);

  // Show the loader while a filter change is being fetched (not on first mount). Every filter
  // change already returns to page 1 in the same update.
  const filterKey = useMemo(() => [
    filters.status.slice().sort().join(','),
    filters.disputed.slice().sort().join(','),
    String(filters.hasEverBeenDisputed),
    searchText,
    [...chainFilters].sort().join(','),
    filters.orderDirection,
    filters.dateRange,
    filters.customDateFrom,
    filters.customDateTo,
  ].join('|'), [filters.status, filters.disputed, filters.hasEverBeenDisputed, searchText, filters.orderDirection, chainFilters, filters.dateRange, filters.customDateFrom, filters.customDateTo]);

  const prevFilterKeyRef = useRef<string | null>(null);
  const hasFetchingStartedRef = useRef(false);

  useEffect(() => {
    // Skip first render to preserve page number
    if (prevFilterKeyRef.current === null) {
      prevFilterKeyRef.current = filterKey;
      return;
    }

    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setIsFilterChanging(true);
      hasFetchingStartedRef.current = false;
    }
  }, [filterKey]);

  // Nothing is fetched while a group is empty, so there is nothing to wait for.
  useEffect(() => {
    if (emptyGroups.length > 0 && isFilterChanging) {
      setIsFilterChanging(false);
      hasFetchingStartedRef.current = false;
    }
  }, [emptyGroups.length, isFilterChanging]);

  // Track when fetching starts
  useEffect(() => {
    if (searchFetching && isFilterChanging && !hasFetchingStartedRef.current) {
      hasFetchingStartedRef.current = true;
    }
  }, [searchFetching, isFilterChanging]);

  // Clear filter changing state ONLY after fetching has started AND completed
  useEffect(() => {
    if (!searchFetching && isFilterChanging && hasFetchingStartedRef.current) {
      setIsFilterChanging(false);
      hasFetchingStartedRef.current = false;
    }
  }, [searchFetching, isFilterChanging]);

  // Precise counts for simple filters; the query's own count for complex ones. That count stops at
  // COUNT_LIMIT matches, and the counts can fail to load: then the number of pages is only a lower
  // bound, and the next page stays reachable for as long as the indexer returns more rows.
  const pagination = useMemo((): { numPages: number; moreBeyondLast: boolean } | null => {
    const page = filters.page;
    const atLeast = (knownPages: number) => {
      if (!searchResult) return null;
      const numPages = Math.max(knownPages, page + (searchResult.hasMore ? 1 : 0));
      return { numPages, moreBeyondLast: searchResult.hasMore || page < numPages };
    };
    if (currentItemCount !== null && currentItemCount !== undefined) {
      return { numPages: Math.ceil(currentItemCount / ITEMS_PER_PAGE), moreBeyondLast: false };
    }
    if (hasComplexFilters) {
      if (!searchResult) return null;
      if (searchResult.totalCount < COUNT_LIMIT) {
        return { numPages: Math.ceil(searchResult.totalCount / ITEMS_PER_PAGE), moreBeyondLast: false };
      }
      return atLeast(Math.ceil(COUNT_LIMIT / ITEMS_PER_PAGE));
    }
    return countsFailed ? atLeast(page) : null;
  }, [currentItemCount, hasComplexFilters, searchResult, countsFailed, filters.page]);

  const activeFilterCount = getActiveFilterCount(filters, chainFilters);
  const openFilters = () => setIsFilterModalOpen(true);
  const goToPage = (newPage: number) => {
    filters.setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const currentRegistryAddress = registryName ? registryMap[registryName] : undefined;

  // Prefetch the latest policy-update timestamp so the "(updated X ago)" badge
  // is warm in cache by the time the user clicks "Submit item".
  usePolicyHistory(currentRegistryAddress, 'latest');

  const renderList = () => {
    if (emptyGroups.length > 0) {
      return (
        <ListMessage
          title={`Select at least one ${joinGroups(emptyGroups)}.`}
          actions={[
            { label: 'Open filters', onClick: openFilters },
            { label: 'Reset filters', onClick: filters.resetFilters },
          ]}
        />
      );
    }
    if (searchFailed && !searchData) {
      return (
        <ErrorState
          title="The list did not load."
          onRetry={() => refetchSearch()}
          retrying={searchFetching}
        />
      );
    }
    if (searchLoading || isFilterChanging || !searchData) {
      return <LoadingItems label="Loading items" />;
    }
    if (searchData.length > 0) {
      return <ItemsList searchData={searchData} viewMode={viewMode} />;
    }
    if (filters.page > 1) {
      return (
        <ListMessage
          title={`Page ${filters.page} is past the end of this list.`}
          line={pagination && pagination.numPages > 0 ? `The last page is ${pagination.numPages}.` : undefined}
          actions={[{ label: 'Go to page 1', onClick: () => goToPage(1) }]}
        />
      );
    }
    if (searchText) {
      return (
        <ListMessage
          title={`No items match "${searchText}"${activeFilterCount > 0 ? ' with the current filters' : ''}.`}
          actions={[
            { label: 'Clear search', onClick: () => filters.setText('') },
            ...(activeFilterCount > 0 ? [{ label: 'Reset filters', onClick: filters.resetFilters }] : []),
          ]}
        />
      );
    }
    if (activeFilterCount > 0) {
      return (
        <ListMessage
          title="No items match the current filters."
          actions={[{ label: 'Reset filters', onClick: filters.resetFilters }]}
        />
      );
    }
    return (
      <ListMessage
        title="No items to show."
        line="Removed and rejected items are hidden by default. You can show them from Filters."
        actions={[{ label: 'Open filters', onClick: openFilters }]}
      />
    );
  };

  const showPagination =
    emptyGroups.length === 0 && !!pagination && (pagination.numPages > 1 || pagination.moreBeyondLast);

  return (
    <Container>
      <ScrollTop />
      {isAttachmentOpen ? (
        <PageInner>
          <EvidenceAttachmentDisplay />
        </PageInner>
      ) : (
        <>
          <PageInner>
              <FullWidthSection>
                {registryName && REGISTRY_INFO[registryName] && <Hero registryKey={registryName} />}
                <ActionablesContainer>
                  <SearchAndFiltersContainer>
                    <Search
                      text={filters.text}
                      setText={filters.setText}
                      label={registryLabel ? `Search ${registryLabel}` : 'Search this registry'}
                    />
                    <FilterButton onClick={openFilters} activeCount={activeFilterCount} />
                    <ViewSwitcher
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                    />
                  </SearchAndFiltersContainer>
                  <PolicyAndSubmitItemContainer>
                    <ExportButton onClick={() => setIsExportModalOpen(true)} registryName={registryName} />
                    <ParametersButton aria-haspopup="dialog" onClick={() => setIsParamsModalOpen(true)}>
                      Parameters
                    </ParametersButton>
                    <PolicyButton registryName={registryName} openInNewTab={false} />
                    <SubmitButton registryName={registryName} />
                  </PolicyAndSubmitItemContainer>
                </ActionablesContainer>
              </FullWidthSection>
              <FullWidthSection>
                {renderList()}
                {showPagination && pagination && (
                  <StyledPagination
                    currentPage={filters.page}
                    numPages={pagination.numPages}
                    moreBeyondLast={pagination.moreBeyondLast}
                    callback={goToPage}
                  />
                )}
              </FullWidthSection>
            </PageInner>
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            chainFilters={chainFilters}
            onChainFiltersChange={filters.setChainFilters}
            scope="registry"
          />
          {isExportModalOpen && currentRegistryAddress && (
            <ExportModal
              registryAddress={currentRegistryAddress}
              onClose={() => setIsExportModalOpen(false)}
            />
          )}
          {isParamsModalOpen && (
            <ParametersModal
              registryName={registryName}
              onClose={() => setIsParamsModalOpen(false)}
            />
          )}
        </>
      )}
    </Container>
  );
};

export default Home;
