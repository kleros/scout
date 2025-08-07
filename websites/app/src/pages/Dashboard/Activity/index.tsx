import React, { useState, useEffect, useMemo } from "react";
import styled, { css, createGlobalStyle } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";
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
import { Copiable } from "@kleros/ui-components-library";
import { ExternalLink } from "components/ExternalLink";
import { DEFAULT_CHAIN, getChain } from "consts/chains";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  min-height: 100vh;
  padding: 32px 32px 64px;
  font-family: "Inter", sans-serif;
  background: ${({ theme }) => theme.lightBackground};
  ${landscapeStyle(
    () => css`
      padding: 80px 0 100px 48px;
      width: calc(100vw - 200px);
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
  color: ${({ theme }) => theme.primaryBlue};
  font-size: 24px;
  font-weight: 600;
  
  &:hover {
    color: ${({ theme }) => theme.secondaryBlue};
    text-decoration: underline;
  }
`;

const TooltipGlobalStyle = createGlobalStyle`
  .dark-tooltip {
    background-color: ${({ theme }) => theme.darkBackground || '#1a1a2e'} !important;
    color: ${({ theme }) => theme.primaryText || 'white'} !important;
    border: 1px solid ${({ theme }) => theme.lightGrey || '#333'} !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
    font-size: 12px !important;
    padding: 6px 8px !important;
    border-radius: 4px !important;
    z-index: 1000 !important;
  }

  svg {
    min-height: 24px;
    min-width: 24px;
    margin-left: 6px;
  }
`;

const StyledCopiable = styled(Copiable)`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  
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
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  border: 1px solid ${({ theme }) => theme.lightGrey};
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
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

const PATHS = ["ongoing", "past"];

const Activity: React.FC = () => {
  const { isConnected, address: connectedAddress } = useAccount();
  const [searchParams] = useSearchParams();
  const userAddress = searchParams.get("userAddress");
  const address = (userAddress || connectedAddress || "").toLowerCase();
  const { data, isLoading } = useSubmitterStats(address);
  const stats = data?.submitter;
  
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
  const basePath = useMemo(() => location.pathname.replace(/\/(ongoing|past).*/, ""), [location.pathname]);
  const switchTab = (n: number) => {
    setCurrentTab(n);
    const params = new URLSearchParams(location.search);
    params.set("page", "1");
    navigate(`${basePath}/${tabs[n].path}?${params.toString()}`);
  };

  const shouldShowConnectWallet = !isConnected && !userAddress;

  const renderAddressLink = (address: string) => (
    <StyledCopiable 
      copiableContent={address} 
      info="Copy Address"
      tooltipProps={{
        place: "top",
        className: "dark-tooltip"
      }}
    >
      {addressExplorerLink ? (
        <StyledExternalLink to={addressExplorerLink} target="_blank" rel="noopener noreferrer">
          {shortenAddress(address)}
        </StyledExternalLink>
      ) : (
        shortenAddress(address)
      )}
    </StyledCopiable>
  );

  return (
    <Container>
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
              <Subtitle>Follow up your submissions, challenges, and other interactions with Scout.</Subtitle>
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
          {currentTab === 0 ? (
            <OngoingSubmissions totalItems={ongoingSubmissions} address={address} />
          ) : (
            <PastSubmissions totalItems={pastSubmissions} address={address} />
          )}
        </>
      ) : (
        <ConnectWalletContainer>
          <Title>Connect Your Wallet</Title>
          <Subtitle>To see your activity, connect your wallet first</Subtitle>
          <ConnectWallet />
        </ConnectWalletContainer>
      )}
    </Container>
  );
};

export default Activity;
