import React, { useEffect, useMemo } from 'react';
import styled from 'styled-components';
import { useSearchParams, createSearchParams } from 'react-router-dom';
import { useItemsQuery, useItemCountsQuery } from '../../hooks/queries';
import { chains } from 'utils/chains';
// import RegistryDetails from './RegistryDetails';
import SubmitButton from './SubmitButton';
import Search from './Search';
import LoadingItems from './LoadingItems';
import EntriesList from './EntriesList';
import Pagination from './Pagination';
import RegistryDetailsModal from './RegistryDetails/RegistryDetailsModal';
// import Filters from './Filters';
import AddEntryModal from './SubmitEntries/AddEntryModal';
import CloseIcon from 'svgs/icons/close.svg';
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay';
import PolicyButton from './PolicyButton';
import HeroShadowSVG from 'svgs/header/hero-shadow.svg';
import { MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle';

const Container = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  color: white;
  padding-bottom: 48px;
  width: 100%;
`;

const PageInner = styled.div`
  position: relative;
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  padding: 0 40px;
  margin-top: 24px;
  box-sizing: border-box;
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
`;

const ActionablesContainer = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  gap: 24px;
  width: 100%;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchAndFiltersContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  flex: 1;
  min-width: 300px;
`;

const PolicyAndSubmitItemContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
`;

export const StyledCloseButton = styled(CloseIcon)`
  display: flex;
  z-index: 100;
  background: transparent;
  border: none;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
`;

export const ClosedButtonContainer = styled.div`
  display: flex;
  width: 24px;
  height: 24px;
`;

export const ITEMS_PER_PAGE = 20;

const HeroWrapper = styled.div`
  position: relative;
  width: 100%;
  border-radius: 20px;
  padding: 32px 24px 32px;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(153, 153, 153, 0.08) 100%
  );
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 6px;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: 20px;
    background: linear-gradient(180deg, #7186FF90 0%, #BEBEC590 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
  }
`;

const HeroShadow = styled.div`
  position: absolute;
  top: -40px;
  left: -80px;
  width: 363px;
  height: 300px;
  pointer-events: none;
  z-index: 0;
  svg {
    width: 100%;
    height: 100%;
    display: block;
  }
`;

const HeroTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  line-height: 1.15;
  margin: 0;
  position: relative;
  z-index: 1;
  letter-spacing: 0.5px;
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
  CDN: {
    title: 'Contract Domain Name - CDN',
    description:
      'The Contract Domain Name (CDN) prevents front-end DNS attacks. It associates smart contracts to specific domains, ensuring users interact with the correct contract. If a website is hacked and the contract is altered, the change will be detected.'
  },
  Single_Tags: {
    title: 'Single Tags',
    description:
      'A registry that links addresses to verified public tags to help users avoid scams.'
  },
  Tags_Queries: {
    title: 'Tag Queries',
    description:
      'A registry that links addresses to verified public tags to help users avoid scams.'
  },
  Tokens: {
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
  const [searchParams, setSearchParams] = useSearchParams();


  const isRegistryDetailsModalOpen = useMemo(
    () => !!searchParams.get('registrydetails'),
    [searchParams]
  );
  const isAddItemOpen = useMemo(
    () => !!searchParams.get('additem'),
    [searchParams]
  );
  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams]
  );

  const { isLoading: searchLoading, data: searchData } = useItemsQuery({ 
    searchParams 
  });

  const { isLoading: countsLoading, data: countsData } = useItemCountsQuery();

  const currentItemCount = useMemo(() => {
    const registry = searchParams.getAll('registry');
    const status = searchParams.getAll('status');
    const disputed = searchParams.getAll('disputed');
    const network = searchParams.getAll('network');
    const text = searchParams.get('text');
    const page = searchParams.get('page');
    if (
      countsLoading ||
      registry.length === 0 ||
      status.length === 0 ||
      disputed.length === 0 ||
      page === null ||
      !countsData
    ) {
      return undefined;
    } else if (!text && network.length === 0) {
      const getCount = (r: 'Single_Tags' | 'Tags_Queries' | 'Tokens' | 'CDN') => {
        return (
          (status.includes('Absent') && disputed.includes('false') ? countsData[r].numberOfAbsent : 0) +
          (status.includes('Registered') && disputed.includes('false') ? countsData[r].numberOfRegistered : 0) +
          (status.includes('RegistrationRequested') && disputed.includes('false') ? countsData[r].numberOfRegistrationRequested : 0) +
          (status.includes('RegistrationRequested') && disputed.includes('true') ? countsData[r].numberOfChallengedRegistrations : 0) +
          (status.includes('ClearingRequested') && disputed.includes('false') ? countsData[r].numberOfClearingRequested : 0) +
          (status.includes('ClearingRequested') && disputed.includes('true') ? countsData[r].numberOfChallengedClearing : 0)
        );
      };
      const count =
        (registry.includes('Single_Tags') ? getCount('Single_Tags') : 0) +
        (registry.includes('Tags_Queries') ? getCount('Tags_Queries') : 0) +
        (registry.includes('CDN') ? getCount('CDN') : 0) +
        (registry.includes('Tokens') ? getCount('Tokens') : 0);
      return count;
    } else {
      if (!searchData || searchData.length > ITEMS_PER_PAGE) return null;
      return searchData.length + (Number(page) - 1) * ITEMS_PER_PAGE;
    }
  }, [searchParams, countsData, countsLoading, searchData]);

  useEffect(() => {
    if (searchParams.get('page') === 'rewards' || searchParams.get('attachment') || searchParams.get('itemdetails')) {
      return;
    }
    const registry = searchParams.getAll('registry');
    const status = searchParams.getAll('status');
    const disputed = searchParams.getAll('disputed');
    const page = searchParams.get('page');
    const network = searchParams.getAll('network');
    const orderDirection = searchParams.get('orderDirection');
    if (
      registry.length === 0 ||
      status.length === 0 ||
      disputed.length === 0 ||
      network.length === 0 ||
      orderDirection === null ||
      page === null
    ) {
      const newSearchParams = createSearchParams({
        registry: registry.length === 0 ? ['Single_Tags'] : registry,
        network: network.length === 0 ? [...chains.filter(c => !c.deprecated).map(c => c.id), 'unknown'] : network,
        status: status.length === 0 ? ['Registered', 'RegistrationRequested', 'ClearingRequested', 'Absent'] : status,
        disputed: disputed.length === 0 ? ['true', 'false'] : disputed,
        page: page === null ? '1' : page,
        orderDirection: orderDirection === null ? 'desc' : orderDirection
      });
      setSearchParams(newSearchParams);
    }
  }, [searchParams, setSearchParams]);

  const totalPages =
    currentItemCount !== null && currentItemCount !== undefined
      ? Math.ceil(currentItemCount / ITEMS_PER_PAGE)
      : null;

  const selectedRegistries = searchParams.getAll('registry');
  const singleRegistry = selectedRegistries.length === 1 ? selectedRegistries[0] : null;

  return (
    <Container>
      {isAttachmentOpen ? (
        <EvidenceAttachmentDisplay />
      ) : (
        <>
          <PageInner>
              <FullWidthSection>
                {singleRegistry && REGISTRY_INFO[singleRegistry] && <Hero registryKey={singleRegistry} />}
                <ActionablesContainer>
                  <SearchAndFiltersContainer>
                    <Search />
                  </SearchAndFiltersContainer>
                  <PolicyAndSubmitItemContainer>
                    <PolicyButton />
                    <SubmitButton />
                  </PolicyAndSubmitItemContainer>
                </ActionablesContainer>
              </FullWidthSection>
              <FullWidthSection>
                {searchLoading || !searchData ? <LoadingItems /> : <EntriesList searchData={searchData} />}
                <Pagination totalPages={totalPages} />
              </FullWidthSection>
            </PageInner>
          {isRegistryDetailsModalOpen && <RegistryDetailsModal />}
          {isAddItemOpen && <AddEntryModal />}
        </>
      )}
    </Container>
  );
};

export default Home;
