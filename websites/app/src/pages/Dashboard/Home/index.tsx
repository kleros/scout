import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle';
import { responsiveSize } from 'styles/responsiveSize';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import { useDapplookerStats } from 'hooks/useDapplookerStats';
import { StatCard } from 'components/Dashboard/StatCard';
import { RegistryCard } from 'components/Dashboard/RegistryCard';
import { StatsChart } from 'components/Dashboard/StatsChart';
import { ChainRanking } from 'components/Dashboard/ChainRanking';
import { ActiveRewardsCarousel } from 'components/Dashboard/ActiveRewardsCarousel';
import { RecentActivity } from 'components/Dashboard/RecentActivity';
import { LatestDisputes } from 'components/Dashboard/LatestDisputes';

import SubmissionsIcon from 'svgs/icons/submissions.svg';
import AssetsVerifiedIcon from 'svgs/icons/assets-verified.svg';
import CuratorsIcon from 'svgs/icons/curators.svg';
import ScrollTop from 'components/ScrollTop';

const Container = styled.div`
  width: 100%;
  background-color: ${({ theme }) => theme.lightBackground};
  padding: 32px 16px 40px;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;
  min-height: 100vh;
  color: ${({ theme }) => theme.primaryText};
  font-family: "Inter", sans-serif;
  display: flex;
  flex-direction: column;

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

const Subtitle = styled.p`
  margin: 4px 0 0 0;
  color: ${({ theme }) => theme.secondaryText};
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  
  @media (min-width: 900px) and (max-width: 1200px) {
    /* Tablet: single column but larger gap */
    gap: 40px;
  }
  
  @media (min-width: 1201px) {
    /* Desktop: two columns */
    grid-template-columns: 1fr 400px;
    gap: 32px;
  }
`;

const LeftColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  min-width: 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  
  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(auto-fit, minmax(min(280px, 100%), 1fr));
      gap: 24px;
    `
  )}
`;

const RegistryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  
  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(4, 1fr);
      gap: 24px;
    `
  )}
`;

const ChartSection = styled.div`
  --index: 2;
`;

const BottomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
  --index: 3;
  
  ${landscapeStyle(
    () => css`
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    `
  )}
  
  /* Ensure children maintain stable dimensions */
  > * {
    min-width: 0;
    overflow: hidden;
  }
`;

const LoadingContainer = styled.div`
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  
  ${landscapeStyle(
    () => css`
      padding: 24px;
    `
  )}
`;

const SkeletonTitle = styled(Skeleton)`
  margin-bottom: 16px;
  margin-left: auto;
  margin-right: auto;
  
  ${landscapeStyle(
    () => css`
      margin-bottom: 24px;
    `
  )}
`;

const ChainRankingLoadingItem = styled.div<{ $isLast?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: ${({ $isLast }) => $isLast ? 'none' : '1px solid rgba(255, 255, 255, 0.1)'};
`;

const ChainRankingLoadingLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const ChartSkeleton = styled(Skeleton)`
  height: 250px;
  
  ${landscapeStyle(
    () => css`
      height: 300px;
    `
  )}
`;

const IndexedWrapper = styled.div<{ $index: number }>`
  --index: ${({ $index }) => $index};
`;

const ChildIndexedWrapper = styled.div<{ $childIndex: number }>`
  --child-index: ${({ $childIndex }) => $childIndex};
`;

interface IHome {}

const Home: React.FC<IHome> = () => {
  const { data: stats, isLoading } = useDapplookerStats();

  const chartData = useMemo(() => {
    if (!stats?.submissionsVsDisputes) return [];
    
    return stats.submissionsVsDisputes.dates.map((date, index) => ({
      name: date,
      submissions: stats.submissionsVsDisputes.submissions[index],
      disputes: stats.submissionsVsDisputes.disputes[index],
    }));
  }, [stats]);

  return (
    <Container>
      <ScrollTop />
      <Header>
        <div>
          <Title>Decentralized Asset Verification platform</Title>
          <Subtitle>Keep Web3 secure. Earn rewards by adding, checking, and challenging submissions.</Subtitle>
        </div>
      </Header>
      
      <MainGrid>
        <LeftColumn>
          <StatsGrid>
            <IndexedWrapper $index={0}>
              <StatCard
                icon={<AssetsVerifiedIcon />}
                title="Total Assets Verified"
                mainValue={isLoading ? <Skeleton width={80} height={32} /> : (stats?.totalAssetsVerified || 0)}
              />
            </IndexedWrapper>
            
            <IndexedWrapper $index={1}>
              <StatCard
                icon={<CuratorsIcon />}
                title="Curators"
                mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.totalCurators || 0)}
              />
            </IndexedWrapper>
          </StatsGrid>
          
          <RegistryGrid>
            <IndexedWrapper $index={0}>
              <RegistryCard
                icon={<SubmissionsIcon />}
                title="Tokens"
                mainValue={isLoading ? <Skeleton width={70} height={24} /> : (stats?.tokens?.assetsVerified || 0)}
                secondaryValue="Assets Verified"
                registryKey="Tokens"
              />
            </IndexedWrapper>
            
            <IndexedWrapper $index={1}>
              <RegistryCard
                icon={<SubmissionsIcon />}
                title="CDN"
                mainValue={isLoading ? <Skeleton width={70} height={24} /> : (stats?.cdn?.assetsVerified || 0)}
                secondaryValue="Assets Verified"
                registryKey="CDN"
              />
            </IndexedWrapper>
            
            <IndexedWrapper $index={2}>
              <RegistryCard
                icon={<SubmissionsIcon />}
                title="Single Tags"
                mainValue={isLoading ? <Skeleton width={70} height={24} /> : (stats?.singleTags?.assetsVerified || 0)}
                secondaryValue="Assets Verified"
                registryKey="Single_Tags"
              />
            </IndexedWrapper>
            
            <IndexedWrapper $index={3}>
              <RegistryCard
                icon={<SubmissionsIcon />}
                title="Tag Queries"
                mainValue={isLoading ? <Skeleton width={70} height={24} /> : (stats?.tagQueries?.assetsVerified || 0)}
                secondaryValue="Assets Verified"
                registryKey="Tags_Queries"
              />
            </IndexedWrapper>
          </RegistryGrid>
          
          <ChartSection>
            {!isLoading && chartData.length > 0 ? (
              <StatsChart 
                data={chartData} 
                title="Submissions vs. Disputes (Daily)"
              />
            ) : (
              <LoadingContainer>
                <SkeletonTitle height={16} width={250} />
                <ChartSkeleton />
              </LoadingContainer>
            )}
          </ChartSection>
          
          <BottomGrid>
            <ChildIndexedWrapper $childIndex={0}>
              {!isLoading && stats?.chainRanking ? (
                <ChainRanking data={stats.chainRanking} />
              ) : (
                <LoadingContainer>
                  <SkeletonTitle height={16} width={200} />
                  {[...Array(5)].map((_, i) => (
                    <ChainRankingLoadingItem key={i} $isLast={i === 4}>
                      <ChainRankingLoadingLeft>
                        <Skeleton width={32} height={16} />
                        <Skeleton circle width={32} height={32} />
                      </ChainRankingLoadingLeft>
                      <Skeleton width={80} height={16} />
                    </ChainRankingLoadingItem>
                  ))}
                </LoadingContainer>
              )}
            </ChildIndexedWrapper>
            
            <ChildIndexedWrapper $childIndex={1}>
              <LatestDisputes />
            </ChildIndexedWrapper>
          </BottomGrid>
        </LeftColumn>
        
        <RightColumn>
          <IndexedWrapper $index={0}>
            <ActiveRewardsCarousel />
          </IndexedWrapper>
          <IndexedWrapper $index={1}>
            <RecentActivity />
          </IndexedWrapper>
        </RightColumn>
      </MainGrid>
    </Container>
  );
};

export default Home;