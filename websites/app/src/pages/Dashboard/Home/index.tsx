import React, { useEffect } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import { useDapplookerStats } from 'hooks/useDapplookerStats';
import { StatCard } from 'components/Dashboard/StatCard';
import { StatsChart } from 'components/Dashboard/StatsChart';
import { ChainRanking } from 'components/Dashboard/ChainRanking';
import { ActiveRewardsCarousel } from 'components/Dashboard/ActiveRewardsCarousel';
import { RecentActivity } from 'components/Dashboard/RecentActivity';
import { LatestDisputes } from 'components/Dashboard/LatestDisputes';

import HomeIcon from 'svgs/sidebar/home.svg';
import SubmissionsIcon from 'svgs/icons/submissions.svg';
import ActiveRewardsIcon from 'svgs/icons/active-rewards.svg';


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
`;

interface IHome {}

const Home: React.FC<IHome> = () => {
  const { data: stats, isLoading } = useDapplookerStats();

  // Success effect for data loading
  useEffect(() => {
    if (stats && stats.totalAssetsVerified > 0) {
      console.log('✅ Dashboard data loaded successfully!');
    }
  }, [stats]);

  // Transform chart data
  const chartData = stats?.submissionsVsDisputes ? 
    stats.submissionsVsDisputes.dates.map((date, index) => ({
      name: date,
      submissions: stats.submissionsVsDisputes.submissions[index],
      disputes: stats.submissionsVsDisputes.disputes[index],
    })) : [];

  const renderSkeletonContent = () => (
    <MainGrid>
      <LeftColumn>
        <StatsGrid>
          <StatCard
            icon={<SubmissionsIcon />}
            title="Total Assets Verified"
            mainValue={<Skeleton width={80} height={32} />}
            changeValue={<Skeleton width={120} height={16} />}
            changeLabel="(all time)"
          />
          
          <StatCard
            icon={<ActiveRewardsIcon />}
            title="Curators"
            mainValue={<Skeleton width={60} height={32} />}
            changeValue={<Skeleton width={100} height={16} />}
            changeLabel="(all time)"
          />
        </StatsGrid>
        
        <StatsGrid>
          <StatCard
            icon={<SubmissionsIcon />}
            title="Tokens"
            mainValue={<Skeleton width={70} height={32} />}
            changeValue={<Skeleton width={40} height={16} />}
            secondaryValue="Assets verified"
          />
          
          <StatCard
            icon={<SubmissionsIcon />}
            title="CDN"
            mainValue={<Skeleton width={70} height={32} />}
            changeValue={<Skeleton width={40} height={16} />}
            secondaryValue="Assets verified"
          />
          
          <StatCard
            icon={<SubmissionsIcon />}
            title="Single Tags"
            mainValue={<Skeleton width={70} height={32} />}
            changeValue={<Skeleton width={40} height={16} />}
            secondaryValue="Assets verified"
          />
          
          <StatCard
            icon={<SubmissionsIcon />}
            title="Tag Queries"
            mainValue={<Skeleton width={70} height={32} />}
            changeValue={<Skeleton width={40} height={16} />}
            secondaryValue="Assets verified"
          />
        </StatsGrid>
        
        <ChartSection>
          <div style={{ padding: '24px', border: `1px solid var(--theme-lightGrey)`, borderRadius: '12px', background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%)' }}>
            <Skeleton height={24} width={200} style={{ marginBottom: '16px' }} />
            <Skeleton height={200} />
          </div>
        </ChartSection>
        
        <BottomGrid>
          <div style={{ padding: '24px', border: `1px solid var(--theme-lightGrey)`, borderRadius: '12px', background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%)' }}>
            <Skeleton height={24} width={150} style={{ marginBottom: '16px' }} />
            <Skeleton height={120} />
          </div>
          
          <div style={{ padding: '24px', border: `1px solid var(--theme-lightGrey)`, borderRadius: '12px', background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%)' }}>
            <Skeleton height={24} width={150} style={{ marginBottom: '16px' }} />
            <Skeleton height={120} />
          </div>
        </BottomGrid>
      </LeftColumn>
      
      <RightColumn>
        <div style={{ padding: '24px', border: `1px solid var(--theme-lightGrey)`, borderRadius: '12px', background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%)', marginBottom: '32px' }}>
          <Skeleton height={24} width={150} style={{ marginBottom: '16px' }} />
          <Skeleton height={200} />
        </div>
        <div style={{ padding: '24px', border: `1px solid var(--theme-lightGrey)`, borderRadius: '12px', background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%)' }}>
          <Skeleton height={24} width={120} style={{ marginBottom: '16px' }} />
          <Skeleton height={150} />
        </div>
      </RightColumn>
    </MainGrid>
  );

  return (
    <Container>
      <Header>
        <HomeIcon />
        <div>
          <Title>Decentralized Asset Verification platform</Title>
          <Subtitle>Keep Web3 secure. Earn rewards by adding, checking, and challenging submissions.</Subtitle>
        </div>
      </Header>
      
      {isLoading ? renderSkeletonContent() : (
      <MainGrid>
        <LeftColumn>
          <StatsGrid>
            <StatCard
              icon={<SubmissionsIcon />}
              title="Total Assets Verified"
              mainValue={stats?.totalAssetsVerified || 0}
              changeValue={stats?.totalSubmissions || 0}
              changeLabel="(total submissions)"
              style={{ '--index': 0 } as React.CSSProperties}
            />
            
            <StatCard
              icon={<ActiveRewardsIcon />}
              title="Curators"
              mainValue={stats?.totalCurators || 0}
              changeValue={stats?.totalCurators || 0}
              changeLabel="(lifetime total)"
              style={{ '--index': 1 } as React.CSSProperties}
            />
          </StatsGrid>
          
          <StatsGrid>
            <StatCard
              icon={<SubmissionsIcon />}
              title="Tokens"
              mainValue={stats?.tokens?.assetsVerified || 0}
              changeValue={stats?.tokens?.assetsVerifiedChange || 0}
              secondaryValue="Assets verified"
              style={{ '--index': 0 } as React.CSSProperties}
            />
            
            <StatCard
              icon={<SubmissionsIcon />}
              title="CDN"
              mainValue={stats?.cdn?.assetsVerified || 0}
              changeValue={stats?.cdn?.assetsVerifiedChange || 0}
              secondaryValue="Assets verified"
              style={{ '--index': 1 } as React.CSSProperties}
            />
            
            <StatCard
              icon={<SubmissionsIcon />}
              title="Single Tags"
              mainValue={stats?.singleTags?.assetsVerified || 0}
              changeValue={stats?.singleTags?.assetsVerifiedChange || 0}
              secondaryValue="Assets verified"
              style={{ '--index': 2 } as React.CSSProperties}
            />
            
            <StatCard
              icon={<SubmissionsIcon />}
              title="Tag Queries"
              mainValue={stats?.tagQueries?.assetsVerified || 0}
              changeValue={stats?.tagQueries?.assetsVerifiedChange || 0}
              secondaryValue="Assets verified"
              style={{ '--index': 3 } as React.CSSProperties}
            />
          </StatsGrid>
          
          {chartData.length > 0 && (
            <ChartSection>
              <StatsChart 
                data={chartData} 
                title="Submissions vs. Disputes (Daily)"
              />
            </ChartSection>
          )}
          
          <BottomGrid>
            {stats?.chainRanking && (
              <div style={{ '--child-index': 0 } as React.CSSProperties}>
                <ChainRanking data={stats.chainRanking} />
              </div>
            )}
            
            <div style={{ '--child-index': 1 } as React.CSSProperties}>
              <LatestDisputes />
            </div>
          </BottomGrid>
        </LeftColumn>
        
        <RightColumn>
          <div style={{ '--index': 0 } as React.CSSProperties}>
            <ActiveRewardsCarousel />
          </div>
          <div style={{ '--index': 1 } as React.CSSProperties}>
            <RecentActivity />
          </div>
        </RightColumn>
      </MainGrid>
      )}
    </Container>
  );
};

export default Home;