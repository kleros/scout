import React, { useState, useEffect, useMemo } from "react";
import styled, { css, createGlobalStyle } from "styled-components";
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAccount } from "wagmi";
import ActivityIcon from "svgs/icons/activity.svg";
import SubmissionsIcon from "svgs/icons/submissions.svg";
import { useSubmitterStats } from "hooks/useSubmitterStats";
import { commify } from "utils/commify";
import { shortenAddress } from "utils/shortenAddress";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import ConnectWallet from "components/ConnectWallet";
import OngoingSubmissions from "./OngoingSubmissions";
import PastSubmissions from "./PastSubmissions";
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
  min-height: 100vh;
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
  color: ${({ theme, selected }) => (selected ? theme.primaryText : theme.secondaryText)};
  border-bottom: 3px solid ${({ theme, selected }) => (selected ? theme.primaryText : "transparent")};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`;

const CardRow = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  gap: 24px;
  padding: 24px;
  border-radius: 12px;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.stroke};
  svg {
    min-width: 64px;
    min-height: 64px;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
`;

const StatInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const StatLabel = styled.label`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 16px;
`;

const StatValue = styled.span`
  font-size: 32px;
  font-weight: 600;
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

const PATHS = ["ongoing", "past"];

const REGISTRATION_STATUSES = ['Registered', 'RegistrationRequested', 'ClearingRequested'];
const CHALLENGE_STATUSES = ['true', 'false'];

const Activity: React.FC = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [searchParams, setSearchParams] = useSearchParams();
  const userAddress = searchParams.get("userAddress");
  const address = (userAddress || connectedAddress || "").toLowerCase();
  const { data, isLoading } = useSubmitterStats(address);
  const stats = data?.submitter;
  
  // Filter modal state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
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
    ],
    [isLoading, ongoingSubmissions, pastSubmissions]
  );
  const basePath = useMemo(() => location.pathname.split(/\/(ongoing|past)\b/)[0], [location.pathname]);
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
                {isConnected && userAddress && userAddress.toLowerCase() === connectedAddress?.toLowerCase() 
                  ? "Follow up your submissions, challenges, and other interactions with Scout."
                  : "Follow up on submissions, challenges, and other interactions with Scout."}
              </Subtitle>
            </div>
          </Header>
          <CardRow>
            <StatCard>
              <SubmissionsIcon />
              <StatInfo>
                <StatLabel>Total Submissions</StatLabel>
                <StatValue>{isLoading ? <Skeleton width={70} height={40} /> : commify(totalSubmissions)}</StatValue>
              </StatInfo>
            </StatCard>
          </CardRow>
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
          {currentTab === 0 ? (
            <OngoingSubmissions totalItems={ongoingSubmissions} address={address} chainFilters={chainFilters} />
          ) : (
            <PastSubmissions totalItems={pastSubmissions} address={address} chainFilters={chainFilters} />
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
