import React, { useState, useEffect, useMemo, useRef } from "react";
import styled, { css, createGlobalStyle } from "styled-components";
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";
import ActivityIcon from "svgs/icons/activity.svg";
import { useSubmitterStats } from "hooks/useSubmitterStats";
import { useDisputeStats } from "hooks/useDisputeStats";
import { commify } from "utils/commify";
import { shortenAddress } from "utils/shortenAddress";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ConnectWallet from "components/ConnectWallet";
import OngoingSubmissions from "./OngoingSubmissions";
import PastSubmissions from "./PastSubmissions";
import Disputes from "./Disputes";
import FilterButton from "components/FilterButton";
import FilterModal from "./FilterModal";
import ActivitySearchBar from "./SearchBar";
import Copyable from "components/Copyable";
import { ExternalLink } from "components/ExternalLink";
import { DEFAULT_CHAIN, getChain } from "consts/chains";
import { chains } from "utils/chains";
import ScrollTop from "components/ScrollTop";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  padding: 32px 16px 64px;
  font-family: "Open Sans", sans-serif;
  background: ${({ theme }) => theme.lightBackground};
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;

  ${landscapeStyle(
    () => css`
      padding: 48px ${responsiveSize(0, 48)} 60px;
    `
  )}
`;

const Header = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 16px;
  margin-bottom: 32px;
  svg {
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
`;

const StyledExternalLink = styled(ExternalLink)`
  color: ${({ theme }) => theme.secondaryBlue};
  font-size: 24px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    text-decoration: underline;
  }
`;

const TooltipGlobalStyle = createGlobalStyle`
  .dark-tooltip {
    background-color: ${({ theme }) => theme.darkBackground || '#000000'} !important;
    color: ${({ theme }) => theme.primaryText || 'white'} !important;
    border: 1px solid ${({ theme }) => theme.lightGrey || '#0A0A0A'} !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    font-size: 12px !important;
    padding: 6px 8px !important;
    border-radius: 4px !important;
    z-index: 1000 !important;
  }

  .dark-tooltip svg {
    min-height: 24px;
    min-width: 24px;
    margin-left: 6px;
  }
`;

const StyledCopyable = styled(Copyable)`
  display: inline-flex;
  align-items: center;
  gap: 4px;

  button {
    color: ${({ theme }) => theme.secondaryBlue};
    transition: color 0.2s ease;

    &:hover {
      color: ${({ theme }) => theme.primaryBlue};
      opacity: 1;
    }
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;

const Subtitle = styled.p`
  margin: 4px 0 0 0;
  color: ${({ theme }) => theme.secondaryText};
`;

const TotalSubmissionsCount = styled.span`
  color: ${({ theme }) => theme.secondaryBlue};
  font-weight: 700;
`;

const TabsWrapper = styled.div`
  display: flex;
  gap: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.lightGrey};
  margin-bottom: 24px;
`;

const TabButton = styled.button<{ selected: boolean }>`
  background: none;
  border: none;
  padding: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.secondaryText)};
  border-bottom: 3px solid ${({ theme, selected }) => (selected ? theme.secondaryBlue : "transparent")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    border-bottom-color: ${({ theme }) => theme.primaryBlue};
  }
`;

const ConnectWalletContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.primaryText};
  gap: 24px;
  
  hr {
    width: 200px;
    border: 1px solid ${({ theme }) => theme.lightGrey};
    margin: 0;
  }
`;

const FilterControlsContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
`;

const SubTabsWrapper = styled.div`
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
`;

const SubTabButton = styled.button<{ selected: boolean }>`
  background: none;
  border: none;
  padding: 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.secondaryText)};
  border-bottom: 2px solid ${({ theme, selected }) => (selected ? theme.secondaryBlue : "transparent")};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }
`;

const DisputeStatsContainer = styled.div`
  display: flex;
  gap: 24px;
  padding: 16px;
  background: ${({ theme }) => theme.lightBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const StatBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 80px;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  text-transform: uppercase;
`;

const StatValue = styled.span<{ color?: string }>`
  font-size: 20px;
  font-weight: 700;
  color: ${({ color, theme }) => color || theme.primaryText};
`;

const StatDivider = styled.div`
  width: 1px;
  background: ${({ theme }) => theme.stroke};
  align-self: stretch;
`;

const PATHS = ["ongoing", "past", "disputes"];

const REGISTRATION_STATUSES = ['Registered', 'RegistrationRequested', 'ClearingRequested'];
const CHALLENGE_STATUSES = ['true', 'false'];

const Activity: React.FC = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const userAddress = searchParams.get("userAddress");
  const address = (userAddress || connectedAddress || "").toLowerCase();
  const { data, isLoading } = useSubmitterStats(address);
  const { data: disputeData, isLoading: isLoadingDisputes } = useDisputeStats(address);
  const stats = data?.submitter;
  const disputeStats = disputeData?.disputeStats;

  // Dispute sub-tab state (active vs resolved)
  const [showResolvedDisputes, setShowResolvedDisputes] = useState(false);
  
  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isFilterChanging, setIsFilterChanging] = useState(false);
  // Initialize chain filters with all available chains by default
  const [chainFilters, setChainFilters] = useState<string[]>(() => {
    const availableChains = chains.filter(chain => !chain.deprecated).map(chain => chain.id);
    return [...availableChains, 'unknown']; // Include all chains + unknown by default
  });

  // Auto-add connected address to URL when user connects wallet
  useEffect(() => {
    if (isConnected && connectedAddress && !userAddress) {
      const newParams = new URLSearchParams(searchParams);
      newParams.set('userAddress', connectedAddress.toLowerCase());
      setSearchParams(newParams, { replace: true });
    }
  }, [isConnected, connectedAddress, userAddress, searchParams, setSearchParams]);

  // Initialize URL params with all statuses/disputed values for Activity page
  useEffect(() => {
    if (address && searchParams.getAll('status').length === 0 && searchParams.getAll('disputed').length === 0) {
      const newParams = new URLSearchParams(searchParams);

      // Add all registration statuses
      REGISTRATION_STATUSES.forEach(status => newParams.append('status', status));
      // Add all challenge statuses
      CHALLENGE_STATUSES.forEach(challengeValue => newParams.append('disputed', challengeValue));

      // Preserve existing params like userAddress, page, etc.
      setSearchParams(newParams, { replace: true });
    }
  }, [address, searchParams, setSearchParams]);

  // Reset page to 1 when filters change
  const filterKey = useMemo(() => {
    return [
      searchParams.getAll('status').sort().join(','),
      searchParams.getAll('disputed').sort().join(','),
      searchParams.get('search') || '',
      chainFilters.sort().join(','),
      searchParams.get('orderDirection') || ''
    ].join('|');
  }, [searchParams, chainFilters]);

  const prevFilterKeyRef = useRef(filterKey);

  useEffect(() => {
    const currentPage = searchParams.get('page');

    // Only reset page if the FILTERS actually changed (not just the page number)
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;

      // Immediately show loading state when filters change
      setIsFilterChanging(true);

      // If we're not on page 1, reset to page 1 when filters change
      if (currentPage && currentPage !== '1') {
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev.toString());
          newParams.set('page', '1');
          return newParams;
        });
      }
    }
  }, [filterKey, searchParams, setSearchParams]);
  
  const addressExplorerLink = useMemo(() => {
    if (!userAddress) return null;
    return `${getChain(DEFAULT_CHAIN)?.blockExplorers?.default.url}/address/${userAddress}`;
  }, [userAddress]);
  const navigate = useNavigate();
  const location = useLocation();
  const currentPathSegment = location.pathname.split("/").at(-1) || "";
  const [currentTab, setCurrentTab] = useState(() => {
    const idx = PATHS.indexOf(currentPathSegment);
    return idx > -1 ? idx : 0;
  });
  useEffect(() => {
    const idx = PATHS.indexOf(currentPathSegment);
    setCurrentTab(idx > -1 ? idx : 0);
  }, [currentPathSegment]);
  const ongoingSubmissions = stats?.ongoingSubmissions ?? 0;
  const pastSubmissions = stats?.pastSubmissions ?? 0;
  const totalSubmissions = stats?.totalSubmissions ?? 0;
  const activeDisputes = disputeStats?.activeDisputes ?? 0;
  const resolvedDisputes = disputeStats?.resolvedDisputes ?? 0;
  const totalDisputes = activeDisputes + resolvedDisputes;
  const tabs = useMemo(
    () => [
      {
        key: "ongoing",
        label: (
          <>
            Ongoing ({isLoading ? <Skeleton inline width={30} height={20} /> : commify(ongoingSubmissions)})
          </>
        ),
        path: "ongoing",
      },
      {
        key: "past",
        label: (
          <>
            Past ({isLoading ? <Skeleton inline width={30} height={20} /> : commify(pastSubmissions)})
          </>
        ),
        path: "past",
      },
      {
        key: "disputes",
        label: (
          <>
            Disputes ({isLoadingDisputes ? <Skeleton inline width={30} height={20} /> : commify(totalDisputes)})
          </>
        ),
        path: "disputes",
      },
    ],
    [isLoading, isLoadingDisputes, ongoingSubmissions, pastSubmissions, totalDisputes]
  );
  const basePath = useMemo(() => location.pathname.split(/\/(ongoing|past|disputes)\b/)[0], [location.pathname]);
  const switchTab = (n: number) => {
    setCurrentTab(n);
    const params = new URLSearchParams(location.search);
    params.set("page", "1");
    navigate(`${basePath}/${tabs[n].path}?${params.toString()}`);
  };

  const shouldShowConnectWallet = !isConnected && !userAddress;

  const renderAddressLink = (address: string) => (
    <StyledCopyable
      copyableContent={address}
      info="Copy Address"
    >
      {addressExplorerLink ? (
        <StyledExternalLink to={addressExplorerLink} target="_blank" rel="noopener noreferrer">
          {shortenAddress(address)}
        </StyledExternalLink>
      ) : (
        shortenAddress(address)
      )}
    </StyledCopyable>
  );

  return (
    <Container>
      <ScrollTop />
      <TooltipGlobalStyle />
      {!shouldShowConnectWallet ? (
        <>
          <Header>
            <ActivityIcon />
            <div>
              <Title>
                {isConnected && userAddress && userAddress.toLowerCase() === connectedAddress?.toLowerCase() 
                  ? <>My Activity - {renderAddressLink(userAddress)}</>
                  : userAddress 
                  ? <>Activity - {renderAddressLink(userAddress)}</>
                  : "My Activity"}
              </Title>
              <Subtitle>
                <TotalSubmissionsCount>
                  {isLoading ? <Skeleton inline width={30} height={16} /> : commify(totalSubmissions)}
                </TotalSubmissionsCount> total submissions. Follow up {isConnected && userAddress && userAddress.toLowerCase() === connectedAddress?.toLowerCase() ? 'your' : 'on'} submissions, challenges, and other interactions with Scout.
              </Subtitle>
            </div>
          </Header>
          <TabsWrapper>
            {tabs.map((tab, i) => (
              <TabButton key={tab.key} selected={i === currentTab} onClick={() => switchTab(i)}>
                {tab.label}
              </TabButton>
            ))}
          </TabsWrapper>
          <FilterControlsContainer>
            <ActivitySearchBar />
            <FilterButton onClick={() => setIsFilterModalOpen(true)} />
          </FilterControlsContainer>
          {currentTab === 0 && (
            <OngoingSubmissions totalItems={ongoingSubmissions} address={address} chainFilters={chainFilters} isFilterChanging={isFilterChanging} setIsFilterChanging={setIsFilterChanging} />
          )}
          {currentTab === 1 && (
            <PastSubmissions totalItems={pastSubmissions} address={address} chainFilters={chainFilters} isFilterChanging={isFilterChanging} setIsFilterChanging={setIsFilterChanging} />
          )}
          {currentTab === 2 && (
            <>
              <DisputeStatsContainer>
                <StatBox>
                  <StatLabel>Active</StatLabel>
                  <StatValue>
                    {isLoadingDisputes ? <Skeleton width={30} height={24} /> : activeDisputes}
                  </StatValue>
                </StatBox>
                <StatDivider />
                <StatBox>
                  <StatLabel>Resolved</StatLabel>
                  <StatValue>
                    {isLoadingDisputes ? <Skeleton width={30} height={24} /> : resolvedDisputes}
                  </StatValue>
                </StatBox>
                <StatDivider />
                <StatBox>
                  <StatLabel>Wins</StatLabel>
                  <StatValue color="#65DC7F">
                    {isLoadingDisputes ? <Skeleton width={30} height={24} /> : disputeStats?.totalWins ?? 0}
                  </StatValue>
                </StatBox>
                <StatBox>
                  <StatLabel>Losses</StatLabel>
                  <StatValue color="#FF5A78">
                    {isLoadingDisputes ? <Skeleton width={30} height={24} /> : disputeStats?.totalLosses ?? 0}
                  </StatValue>
                </StatBox>
                <StatDivider />
                <StatBox>
                  <StatLabel>As Submitter</StatLabel>
                  <StatValue>
                    {isLoadingDisputes ? (
                      <Skeleton width={60} height={24} />
                    ) : (
                      <span>
                        <span style={{ color: '#65DC7F' }}>{disputeStats?.winsAsRequester ?? 0}W</span>
                        {' / '}
                        <span style={{ color: '#FF5A78' }}>{disputeStats?.lossesAsRequester ?? 0}L</span>
                      </span>
                    )}
                  </StatValue>
                </StatBox>
                <StatBox>
                  <StatLabel>As Challenger</StatLabel>
                  <StatValue>
                    {isLoadingDisputes ? (
                      <Skeleton width={60} height={24} />
                    ) : (
                      <span>
                        <span style={{ color: '#65DC7F' }}>{disputeStats?.winsAsChallenger ?? 0}W</span>
                        {' / '}
                        <span style={{ color: '#FF5A78' }}>{disputeStats?.lossesAsChallenger ?? 0}L</span>
                      </span>
                    )}
                  </StatValue>
                </StatBox>
              </DisputeStatsContainer>
              <SubTabsWrapper>
                <SubTabButton
                  selected={!showResolvedDisputes}
                  onClick={() => setShowResolvedDisputes(false)}
                >
                  Active ({activeDisputes})
                </SubTabButton>
                <SubTabButton
                  selected={showResolvedDisputes}
                  onClick={() => setShowResolvedDisputes(true)}
                >
                  Resolved ({resolvedDisputes})
                </SubTabButton>
              </SubTabsWrapper>
              <Disputes
                totalItems={showResolvedDisputes ? resolvedDisputes : activeDisputes}
                address={address}
                chainFilters={chainFilters}
                isFilterChanging={isFilterChanging}
                setIsFilterChanging={setIsFilterChanging}
                showResolved={showResolvedDisputes}
              />
            </>
          )}
        </>
      ) : (
        <ConnectWalletContainer>
          <Title>Connect Your Wallet</Title>
          <Subtitle>To see your activity, connect your wallet first</Subtitle>
          <ConnectWallet />
        </ConnectWalletContainer>
      )}
      
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        chainFilters={chainFilters}
        onChainFiltersChange={setChainFilters}
        userAddress={address}
      />
    </Container>
  );
};

export default Activity;
