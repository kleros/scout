import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { StatCard } from 'components/Dashboard/StatCard';
import { ChainRanking } from 'components/Dashboard/ChainRanking';
import { SubmissionsChart } from 'components/Dashboard/SubmissionsChart';
import { ActiveRewardsCarousel } from 'components/Dashboard/ActiveRewardsCarousel';
import { RegistryCard } from 'components/Dashboard/RegistryCard';
import AssetsVerifiedIcon from 'svgs/icons/assets-verified.svg';
import CuratorsIcon from 'svgs/icons/curators.svg';
import DisputesIcon from 'svgs/icons/law-balance.svg';
import Skeleton from 'react-loading-skeleton';

const CAROUSEL_INTERVAL = 8000;

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const TrackWrapper = styled.div`
  overflow: hidden;
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1);
`;

const CarouselTrack = styled.div<{ $activeIndex: number }>`
  display: flex;
  align-items: flex-start;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform: translateX(-${({ $activeIndex }) => $activeIndex * 100}%);
  will-change: transform;

  ${landscapeStyle(
    () => css`
      transition: transform 0.5s ease-in-out;
    `
  )}
`;

const CarouselSlide = styled.div`
  min-width: 100%;
  width: 100%;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
`;

const Position1Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;

  ${landscapeStyle(
    () => css`
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) minmax(0, 1fr);
      align-items: stretch;
      gap: 24px;
    `
  )}
`;

const Position1Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const StatisticsTitle = styled.h3`
  color: ${({ theme }) => theme.secondaryBlue};
  font-family: "Open Sans";
  font-size: 14px;
  font-style: italic;
  font-weight: 400;
  line-height: normal;
  margin: 0 0 8px 0;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      margin: 0 0 12px 0;
    `
  )}
`;

const Position1Middle = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
`;

const Position1Right = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;
  min-width: 0;
`;

const Position2Container = styled.div`
  width: 100%;
`;

const Position3Container = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      max-width: 1400px;
      margin: 0 auto;
      gap: 24px;
    `
  )}
`;

const Position3Title = styled.h3`
  color: ${({ theme }) => theme.secondaryBlue};
  font-family: "Open Sans";
  font-size: 14px;
  font-style: italic;
  font-weight: 400;
  line-height: normal;
  margin: 0 0 12px 0;
  text-align: center;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      margin: 0 0 20px 0;
      grid-column: 1 / -1;
    `
  )}
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  padding: 8px 0;

  ${landscapeStyle(
    () => css`
      margin-top: 24px;
    `
  )}
`;

const Dot = styled.div<{ $active: boolean }>`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $active, theme }) => $active ? theme.carouselDotActive : theme.carouselDotInactive};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ theme }) => theme.carouselDotActive};
  }
`;

const LoadingContainer = styled.div`
  padding: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 12px;
  background: ${({ theme }) => theme.gradientCard};
  box-shadow: ${({ theme }) => theme.shadowCard};
  backdrop-filter: blur(10px);
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;

  ${landscapeStyle(
    () => css`
      padding: 20px;
      border-radius: 16px;
    `
  )}
`;

const SkeletonTitle = styled(Skeleton)`
  margin-bottom: 12px;
  margin-left: auto;
  margin-right: auto;

  ${landscapeStyle(
    () => css`
      margin-bottom: 20px;
    `
  )}
`;

const ChainRankingLoadingItem = styled.div<{ $isLast?: boolean }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: ${({ $isLast, theme }) => $isLast ? 'none' : `1px solid ${theme.divider}`};

  ${landscapeStyle(
    () => css`
      padding: 16px 0;
    `
  )}
`;

const ChainRankingLoadingLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  ${landscapeStyle(
    () => css`
      gap: 16px;
    `
  )}
`;

interface HomeCarouselProps {
  stats: any;
  isLoading: boolean;
  chartData: Array<{ name: string; submissions: number }>;
}

export const HomeCarousel: React.FC<HomeCarouselProps> = ({ stats, isLoading, chartData }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trackHeight, setTrackHeight] = useState<number | undefined>(undefined);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Measure active slide height and animate the wrapper
  useEffect(() => {
    const activeSlide = slideRefs.current[activeIndex];
    if (!activeSlide) return;

    const updateHeight = () => {
      setTrackHeight(activeSlide.scrollHeight);
    };

    updateHeight();

    const observer = new ResizeObserver(updateHeight);
    observer.observe(activeSlide);
    return () => observer.disconnect();
  }, [activeIndex, isLoading, stats]);

  const startCarousel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % 3);
    }, CAROUSEL_INTERVAL);
  }, []);

  const stopCarousel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isPaused) {
      startCarousel();
    } else {
      stopCarousel();
    }
    return () => {
      stopCarousel();
    };
  }, [isPaused, startCarousel, stopCarousel]);

  const handleDotClick = useCallback((index: number) => {
    setActiveIndex(index);
    setIsPaused(false);
    startCarousel(); // Reset timer when user manually changes
  }, [startCarousel]);

  const handleMouseEnter = useCallback(() => {
    setIsPaused(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPaused(false);
  }, []);

  return (
    <Container onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <TrackWrapper style={{ height: trackHeight !== undefined ? `${trackHeight}px` : 'auto' }}>
      <CarouselTrack $activeIndex={activeIndex}>
        {/* Position 1: Metrics (left), Chart (middle), Chain Ranking (right) */}
        <CarouselSlide ref={(el) => { slideRefs.current[0] = el; }}>
          <Position1Container>
            <Position1Left>
              <StatisticsTitle>Statistics</StatisticsTitle>
              <StatCard
                icon={<AssetsVerifiedIcon />}
                title="Total Assets Verified"
                mainValue={isLoading ? <Skeleton width={80} height={32} /> : (stats?.totalAssetsVerified || 0)}
              />
              <StatCard
                icon={<CuratorsIcon />}
                title="Curators"
                mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.totalCurators || 0)}
              />
              <StatCard
                icon={<DisputesIcon />}
                title="Total Solved Disputes"
                mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.totalSolvedDisputes || 0)}
              />
            </Position1Left>

            <Position1Middle>
              {!isLoading && chartData.length > 0 ? (
                <SubmissionsChart data={chartData} />
              ) : (
                <LoadingContainer>
                  <SkeletonTitle height={16} width={150} />
                  <Skeleton height={200} style={{ flex: 1 }} />
                </LoadingContainer>
              )}
            </Position1Middle>

            <Position1Right>
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
            </Position1Right>
          </Position1Container>
        </CarouselSlide>

        {/* Position 2: 3 Active Rewards cards horizontal */}
        <CarouselSlide ref={(el) => { slideRefs.current[1] = el; }}>
          <Position2Container>
            <ActiveRewardsCarousel />
          </Position2Container>
        </CarouselSlide>

        {/* Position 3: Registry Stats */}
        <CarouselSlide ref={(el) => { slideRefs.current[2] = el; }}>
          <Position3Container>
            <Position3Title>Items Verified per Registry</Position3Title>
            <RegistryCard
              title="Tokens"
              mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.tokens?.assetsVerified || 0)}
              secondaryValue="Verified items"
              registryKey="tokens"
            />
            <RegistryCard
              title="Single Tags"
              mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.singleTags?.assetsVerified || 0)}
              secondaryValue="Verified items"
              registryKey="single-tags"
            />
            <RegistryCard
              title="Query Tags"
              mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.tagQueries?.assetsVerified || 0)}
              secondaryValue="Verified items"
              registryKey="tags-queries"
            />
            <RegistryCard
              title="Contract Domains"
              mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.cdn?.assetsVerified || 0)}
              secondaryValue="Verified items"
              registryKey="cdn"
            />
          </Position3Container>
        </CarouselSlide>
      </CarouselTrack>
      </TrackWrapper>

      <DotsContainer>
        <Dot $active={activeIndex === 0} onClick={() => handleDotClick(0)} />
        <Dot $active={activeIndex === 1} onClick={() => handleDotClick(1)} />
        <Dot $active={activeIndex === 2} onClick={() => handleDotClick(2)} />
      </DotsContainer>
    </Container>
  );
};
