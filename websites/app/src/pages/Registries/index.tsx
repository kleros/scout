import React, { useEffect, useMemo, useState, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useSearchParams, useParams } from 'react-router-dom';
import { useItemsQuery, useItemCountsQuery } from '../../hooks/queries';
import { chains } from 'utils/chains';
import { registryMap } from 'utils/items';
import { useRegistryFilters } from 'context/FilterContext';
import SubmitButton from './SubmitButton';
import Search from './Search';
import LoadingItems from './LoadingItems';
import ItemsList from './ItemsList';
import { StyledPagination } from 'components/StyledPagination';
import AddItemModal from './SubmitItems/AddItemModal';
import ParametersModal from './ParametersModal';
import FilterModal from 'components/FilterModal';
import FilterButton from 'components/FilterButton';
import ViewSwitcher from 'components/ViewSwitcher';
import { useViewMode } from 'hooks/useViewMode';
import CloseIcon from 'svgs/icons/close.svg';
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay';
import PolicyButton from './PolicyButton';
import ExportButton from './ExportButton';
import ExportModal from './ExportModal';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import HeroShadowSVG from 'svgs/header/hero-shadow.svg';
import { MAX_WIDTH_LANDSCAPE, landscapeStyle } from 'styles/landscapeStyle';
import ScrollTop from 'components/ScrollTop';

const Container = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.lightBackground};
  padding: 24px 16px 40px;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  color: ${({ theme }) => theme.primaryText};
  font-family: "Open Sans", sans-serif;
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      padding: 36px 32px 60px;
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

const ParametersLabel = styled.label`
  ${hoverShortTransitionTiming}
  cursor: pointer;
  color: ${({ theme }) => theme.secondaryText};
  font-family: "Open Sans", sans-serif;
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

const EmptyState = styled.div`
  width: 100%;
  padding: 20px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 16px;
`;

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
      'A registry that links addresses to verified public tags to help users avoid scams.'
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
  const { registryName } = useParams<{ registryName: string }>();
  const [searchParams] = useSearchParams();
  const filters = useRegistryFilters();
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);
  const [chainFilters, setChainFilters] = useState<string[]>(() => [
    ...chains.filter(c => !c.deprecated).map(c => c.id),
    'unknown'
  ]);
  const [viewMode, setViewMode] = useViewMode();
  const [isFilterChanging, setIsFilterChanging] = useState(false);

  const isAddItemOpen = useMemo(
    () => !!searchParams.get('additem'),
    [searchParams]
  );
  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams]
  );

  // Only fetch count when complex filters are active (simple filters use precise countsData instead)
  const allChains = useMemo(() => [...chains.filter(c => !c.deprecated).map(c => c.id), 'unknown'], []);
  const hasComplexFilters = !!(filters.text || (chainFilters.length > 0 && chainFilters.length < allChains.length) || filters.hasEverBeenDisputed || filters.dateRange !== 'all');

  const { isLoading: searchLoading, isFetching: searchFetching, data: searchResult } = useItemsQuery({
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
  });

  const searchData = searchResult?.items;
  const totalCount = searchResult?.totalCount ?? 0;

  const { isLoading: countsLoading, data: countsData } = useItemCountsQuery();

  // Use precise pre-computed counts for simple filters, fall back to totalCount from query for complex filters
  const currentItemCount = useMemo(() => {
    if (hasComplexFilters) return null;

    const { status, disputed } = filters;
    if (countsLoading || !registryName || status.length === 0 || disputed.length === 0 || !countsData) {
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

  // Reset page to 1 when filters change (but not on initial mount)
  const filterKey = useMemo(() => [
    filters.status.slice().sort().join(','),
    filters.disputed.slice().sort().join(','),
    String(filters.hasEverBeenDisputed),
    filters.text,
    [...chainFilters].sort().join(','),
    filters.orderDirection,
    filters.dateRange,
    filters.customDateFrom,
    filters.customDateTo,
  ].join('|'), [filters.status, filters.disputed, filters.hasEverBeenDisputed, filters.text, filters.orderDirection, chainFilters, filters.dateRange, filters.customDateFrom, filters.customDateTo]);

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
      filters.setPage(1);
      setIsFilterChanging(true);
      hasFetchingStartedRef.current = false;
    }
  }, [filterKey, filters]);

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

  // Use precise countsData when available (simple filters), fall back to totalCount from query (complex filters)
  const totalPages = useMemo(() => {
    if (currentItemCount !== null && currentItemCount !== undefined) {
      return Math.ceil(currentItemCount / ITEMS_PER_PAGE);
    }
    return totalCount > 0 ? Math.ceil(totalCount / ITEMS_PER_PAGE) : 0;
  }, [currentItemCount, totalCount]);

  const currentRegistryAddress = registryName ? registryMap[registryName] : undefined;


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
                    <Search text={filters.text} setText={filters.setText} />
                    <FilterButton onClick={() => setIsFilterModalOpen(true)} />
                    <ViewSwitcher
                      viewMode={viewMode}
                      onViewModeChange={setViewMode}
                    />
                  </SearchAndFiltersContainer>
                  <PolicyAndSubmitItemContainer>
                    <ExportButton onClick={() => setIsExportModalOpen(true)} registryName={registryName} />
                    <ParametersLabel onClick={() => setIsParamsModalOpen(true)}>Parameters</ParametersLabel>
                    <PolicyButton registryName={registryName} />
                    <SubmitButton registryName={registryName} />
                  </PolicyAndSubmitItemContainer>
                </ActionablesContainer>
              </FullWidthSection>
              <FullWidthSection>
                {searchLoading || isFilterChanging || !searchData ? (
                  <LoadingItems />
                ) : searchData.length === 0 ? (
                  <EmptyState>No items found</EmptyState>
                ) : (
                  <ItemsList searchData={searchData} viewMode={viewMode} />
                )}
                {totalPages > 1 && (
                  <StyledPagination
                    currentPage={filters.page}
                    numPages={totalPages}
                    callback={(newPage) => {
                      filters.setPage(newPage)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  />
                )}
              </FullWidthSection>
            </PageInner>
          {isAddItemOpen && <AddItemModal />}
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            chainFilters={chainFilters}
            onChainFiltersChange={setChainFilters}
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
