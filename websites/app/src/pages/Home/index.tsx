import React, { useEffect, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle';
import { responsiveSize } from 'styles/responsiveSize';
import 'react-loading-skeleton/dist/skeleton.css';

import { useDapplookerStats } from 'hooks/useDapplookerStats';
import HeroGlobe from 'components/Home/HeroGlobe';
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
  padding: 24px 16px 40px;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  color: ${({ theme }) => theme.primaryText};
  font-family: "Open Sans", sans-serif;
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      padding: 34px ${responsiveSize(0, 48)} 60px;
    `
  )}
`;

const HeaderSection = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
  overflow: hidden;
  padding: 24px 20px;
  border-radius: 32px;
  background: #000;

  ${landscapeStyle(
    () => css`
      gap: 16px;
      padding: 32px ${responsiveSize(0, 56)} 32px;
      border-radius: 40px;
    `
  )}
`;

const Title = styled.h1`
  color: #f7f9ff;
  text-align: center;
  font-family: "Open Sans";
  font-size: clamp(15px, 4vw, 46px);
  font-style: normal;
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.03em;
  margin: 0;
  max-width: 100%;
  white-space: nowrap;
`;

const CounterStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
`

const CounterValue = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  color: #ffffff;
  font-family: "Open Sans", sans-serif;
  font-size: clamp(48px, 8.5vw, 96px);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums lining-nums;
  text-shadow: 0 8px 18px rgba(32, 41, 64, 0.2);
  margin: 0;
`

const CounterSubtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.78);
  font-family: "Open Sans", sans-serif;
  font-size: 16px;
  font-weight: 400;
  letter-spacing: 0;
`

const CounterMeta = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`

const VerifiedMark = styled.span`
  display: inline-flex;
  width: 16px;
  height: 16px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  border: 1px solid rgba(43, 214, 117, 0.7);
  color: #2fd671;
  box-shadow: 0 0 0 1px rgba(47, 214, 113, 0.12) inset;

  svg {
    width: 10px;
    height: 10px;
    display: block;
  }
`

const Description = styled.p`
  color: rgba(235, 240, 255, 0.82);
  text-align: center;
  font-family: "Open Sans";
  font-size: 16px;
  font-style: normal;
  font-weight: 400;
  line-height: 1.7;
  margin: 0;
  max-width: 720px;
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
  margin-top: 0;
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.16);

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
    transform: translateY(-1px);
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
    transform: translateY(0);
  }
`;

const SearchSection = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 16px;
  margin-bottom: 36px;
  width: 100%;

  ${landscapeStyle(
    () => css`
      margin-top: 16px;
      margin-bottom: 44px;
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
  color: ${({ theme }) => theme.secondaryBlue};
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

const BASE_VERIFIED_CONTRACTS = 732_972;
const COUNTER_FORMATTER = new Intl.NumberFormat('en-US');

const Home: React.FC<IHome> = () => {
  const { data: stats, isLoading } = useDapplookerStats();
  const totalVerifiedContracts = BASE_VERIFIED_CONTRACTS + (stats?.totalSubmissions || 0);
  const animatedCountRef = useRef(0);
  const counterValueRef = useRef<HTMLSpanElement>(null);

  const chartData = useMemo(() => {
    if (!stats?.submissionsVsDisputes) return [];

    return stats.submissionsVsDisputes.dates.map((date, index) => ({
      name: date,
      submissions: stats.submissionsVsDisputes.submissions[index],
    }));
  }, [stats]);

  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  useEffect(() => {
    const renderCounterValue = (value: number) => {
      if (!counterValueRef.current) return;
      counterValueRef.current.textContent = `${COUNTER_FORMATTER.format(value)}+`;
    };

    if (typeof window === 'undefined') {
      animatedCountRef.current = totalVerifiedContracts;
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (mediaQuery.matches) {
      animatedCountRef.current = totalVerifiedContracts;
      renderCounterValue(totalVerifiedContracts);
      return;
    }

    const startValue = animatedCountRef.current;
    const delta = totalVerifiedContracts - startValue;

    if (!delta) {
      renderCounterValue(totalVerifiedContracts);
      return;
    }

    const duration = 1800;
    const startTime = performance.now();
    let frameId = 0;

    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 4);
      const rawValue = startValue + delta * easedProgress;
      const nextValue =
        delta >= 0
          ? Math.min(totalVerifiedContracts, Math.floor(rawValue))
          : Math.max(totalVerifiedContracts, Math.ceil(rawValue));

      if (nextValue !== animatedCountRef.current) {
        animatedCountRef.current = nextValue;
        renderCounterValue(nextValue);
      }

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      } else {
        animatedCountRef.current = totalVerifiedContracts;
        renderCounterValue(totalVerifiedContracts);
      }
    };

    renderCounterValue(startValue);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [totalVerifiedContracts]);

  const handleSubmitNowClick = () => {
    setIsSubmissionModalOpen(true);
  };

  return (
    <Container>
      <ScrollTop />

      <HeaderSection>
        <Title>The Largest Decentralized Database</Title>
        <CounterStack>
          <CounterValue>
            <span ref={counterValueRef}>{`${COUNTER_FORMATTER.format(animatedCountRef.current)}+`}</span>
          </CounterValue>
          <CounterMeta>
            <CounterSubtitle>verified contracts</CounterSubtitle>
            <VerifiedMark aria-hidden="true">
              <svg viewBox="0 0 16 16" fill="none">
                <path
                  d="M4.2 8.15L6.85 10.8L11.8 5.85"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </VerifiedMark>
          </CounterMeta>
        </CounterStack>
        <HeroGlobe />
        <Description>
          With one submission, smart contracts will be verified and assigned a trusted project name.
          Partners will display this information on their dashboards and wallets making every interaction
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
