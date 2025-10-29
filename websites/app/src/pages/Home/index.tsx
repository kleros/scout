import React, { useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle';
import { responsiveSize } from 'styles/responsiveSize';
import 'react-loading-skeleton/dist/skeleton.css';

import { useDapplookerStats } from 'hooks/useDapplookerStats';
import { GlobalSearch } from 'components/Dashboard/GlobalSearch';
import { HomeCarousel } from 'components/Dashboard/HomeCarousel';
import { HomeRecentActivity } from 'components/Dashboard/HomeRecentActivity';
import { HomeLatestDisputes } from 'components/Dashboard/HomeLatestDisputes';
import { SubmissionSelectionModal } from 'components/SubmissionSelectionModal';
import ScrollTop from 'components/ScrollTop';

import EtherscanLogo from 'assets/pngs/partners/etherscan.png';
import LedgerLogo from 'assets/pngs/partners/ledger.png';
import MetamaskLogo from 'assets/pngs/partners/metamask.png';
import OtterscanLogo from 'assets/pngs/partners/otterscan.png';
import BlockscoutLogo from 'assets/pngs/partners/blockscout.png';

const Container = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.lightBackground};
  padding: 32px 16px 40px;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  color: ${({ theme }) => theme.primaryText};
  font-family: "Open Sans", sans-serif;
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      padding: 48px ${responsiveSize(0, 48)} 60px;
    `
  )}
`;

const HeaderSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
`;

const Title = styled.h1`
  color: var(--Primary-text, #FFF);
  text-align: center;
  font-family: "Open Sans";
  font-size: 24px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  margin: 0;
`;

const Description = styled.p`
  color: var(--Secondary-text, #BEBEC5);
  text-align: center;
  font-family: "Open Sans";
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  margin: 8px 0 0 0;
  max-width: 800px;
`;

const SubmitButton = styled.button`
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  border: none;
  border-radius: 9999px;
  padding: 10px 20px;
  font-size: 14px;
  font-family: "Open Sans", sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 24px;

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
  }
`;

const SearchSection = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 32px;
  margin-bottom: 32px;
  width: 100%;

  ${landscapeStyle(
    () => css`
      margin-bottom: 48px;
    `
  )}
`;

const TrustedBySection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  margin-bottom: 48px;
  padding-bottom: 24px;
  width: 100%;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      gap: 24px;
      margin-bottom: 64px;
      padding-bottom: 32px;
      flex-wrap: wrap;
    `
  )}
`;

const TrustedByText = styled.h3`
  color: var(--Secondary-blue, #7186FF);
  font-family: "Open Sans";
  font-size: 14px;
  font-style: italic;
  font-weight: 400;
  line-height: normal;
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
    `
  )}
`;

const LogosContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 24px 48px;
  flex-wrap: wrap;
  justify-content: center;
  flex-shrink: 1;

  ${landscapeStyle(
    () => css`
      gap: 72px;
      flex-wrap: nowrap;
      flex-shrink: 0;
    `
  )}
`;

const PartnerLogo = styled.img<{ $smaller?: boolean; $bigger?: boolean }>`
  height: ${({ $smaller, $bigger }) => ($smaller ? '20px' : $bigger ? '30px' : '24px')};
  width: auto;
  object-fit: contain;
  opacity: 0.8;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 1;
  }

  ${landscapeStyle(
    () => css`
      height: ${({ $smaller, $bigger }) => ($smaller ? '24px' : $bigger ? '34px' : '28px')};
    `
  )}
`;

const CarouselSection = styled.div`
  margin-bottom: 48px;

  ${landscapeStyle(
    () => css`
      margin-bottom: 64px;
    `
  )}
`;

const BottomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;

  ${landscapeStyle(
    () => css`
      grid-template-columns: 65fr 35fr;
      gap: 32px;
    `
  )}
`;

interface IHome {}

const Home: React.FC<IHome> = () => {
  const [timeframeDays, setTimeframeDays] = useState(30);
  const { data: stats, isLoading } = useDapplookerStats(timeframeDays);
  const navigate = useNavigate();

  const chartData = useMemo(() => {
    if (!stats?.submissionsVsDisputes) return [];

    return stats.submissionsVsDisputes.dates.map((date, index) => ({
      name: date,
      submissions: stats.submissionsVsDisputes.submissions[index],
    }));
  }, [stats]);

  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  const handleSubmitNowClick = () => {
    setIsSubmissionModalOpen(true);
  };

  const handleTimeframeChange = (days: number) => {
    setTimeframeDays(days);
  };

  return (
    <Container>
      <ScrollTop />

      <HeaderSection>
        <Title>Join The Largest Decentralized Database</Title>
        <Description>
          With one submission, smart contracts will be verified and assigned a trusted project name.
          Partners will display these information on their dashboards and wallets making every interaction
          safer for users and solving blind signing issues.
        </Description>
        <SubmitButton onClick={handleSubmitNowClick}>
          Submit Now
        </SubmitButton>
      </HeaderSection>

      <SearchSection>
        <GlobalSearch />
      </SearchSection>

      <TrustedBySection>
        <TrustedByText>Trusted by</TrustedByText>
        <LogosContainer>
          <PartnerLogo src={EtherscanLogo} alt="Etherscan" />
          <PartnerLogo src={BlockscoutLogo} alt="Blockscout" $smaller />
          <PartnerLogo src={OtterscanLogo} alt="Otterscan" />
          <PartnerLogo src={MetamaskLogo} alt="MetaMask" $bigger />
          <PartnerLogo src={LedgerLogo} alt="Ledger" />
        </LogosContainer>
        <TrustedByText>& Many More</TrustedByText>
      </TrustedBySection>

      <CarouselSection>
        <HomeCarousel
          stats={stats}
          isLoading={isLoading}
          chartData={chartData}
          selectedTimeframe={timeframeDays}
          onTimeframeChange={handleTimeframeChange}
        />
      </CarouselSection>

      <BottomGrid>
        <HomeRecentActivity />
        <HomeLatestDisputes />
      </BottomGrid>

      <SubmissionSelectionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
      />
    </Container>
  );
};

export default Home;