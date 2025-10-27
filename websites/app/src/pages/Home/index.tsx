import React, { useMemo } from 'react';
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
import ScrollTop from 'components/ScrollTop';

const Container = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.lightBackground};
  padding: 32px 16px 40px;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  min-height: 100vh;
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
  margin-bottom: 48px;
  width: 100%;

  ${landscapeStyle(
    () => css`
      margin-bottom: 64px;
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
  const { data: stats, isLoading } = useDapplookerStats();
  const navigate = useNavigate();

  const chartData = useMemo(() => {
    if (!stats?.submissionsVsDisputes) return [];

    return stats.submissionsVsDisputes.dates.map((date, index) => ({
      name: date,
      submissions: stats.submissionsVsDisputes.submissions[index],
    }));
  }, [stats]);

  const handleSubmitNowClick = () => {
    navigate('/registry/Tokens?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1');
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

      <CarouselSection>
        <HomeCarousel stats={stats} isLoading={isLoading} chartData={chartData} />
      </CarouselSection>

      <BottomGrid>
        <HomeRecentActivity />
        <HomeLatestDisputes />
      </BottomGrid>
    </Container>
  );
};

export default Home;