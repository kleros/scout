import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
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
      width: calc(100vw - 120px);
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
  
  ${landscapeStyle(
    () => css`
      grid-template-columns: 2fr 1fr;
      gap: 32px;
    `
  )}
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
  
  /* Ensure children maintain equal width */
  > * {
    min-width: 0;
    width: 100%;
    overflow: hidden;
  }
`;

const LoadingContainer = styled.div`
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
`;

const SkeletonTitle = styled(Skeleton)`
  margin-bottom: 24px;
  margin-left: auto;
  margin-right: auto;
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
                <SkeletonTitle height={24} width={250} />
                <Skeleton height={300} />
              </LoadingContainer>
            )}
          </ChartSection>
          
          <BottomGrid>
            <ChildIndexedWrapper $childIndex={0}>
              {!isLoading && stats?.chainRanking ? (
                <ChainRanking data={stats.chainRanking} />
              ) : (
                <LoadingContainer>
                  <Skeleton height={18} width={200} style={{ marginBottom: '24px' }} />
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