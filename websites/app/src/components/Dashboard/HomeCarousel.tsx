import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
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
  font-size: 14px;
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
  font-size: 14px;
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
  align-items: center;
  gap: 8px;
  margin-top: 16px;
  padding: 8px 0;

  ${landscapeStyle(
    () => css`
      margin-top: 24px;
    `
  )}
`;

const fillAnimation = keyframes`
  from { width: 0%; }
  to { width: 100%; }
`;

const Dot = styled.button<{ $active: boolean }>`
  width: ${({ $active }) => ($active ? '36px' : '10px')};
  height: 10px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.carouselDotInactive};
  border: none;
  padding: 0;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;

  &:hover {
    background: ${({ $active, theme }) =>
      $active ? theme.carouselDotInactive : theme.carouselDotActive};
  }
`;

const DotFill = styled.div<{ $paused: boolean; $duration: number }>`
  position: absolute;
  inset: 0;
  width: 0;
  background: ${({ theme }) => theme.carouselDotActive};
  animation: ${fillAnimation} ${({ $duration }) => $duration}ms linear forwards;
  animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
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

const SLIDE_COUNT = 3;

export const HomeCarousel: React.FC<HomeCarouselProps> = ({ stats, isLoading, chartData }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [trackHeight, setTrackHeight] = useState<number | undefined>(undefined);
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

  const handleFillEnd = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % SLIDE_COUNT);
  }, []);

  const handleDotClick = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

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
                title="Total Submissions"
                mainValue={isLoading ? <Skeleton width={80} height={32} /> : (stats?.totalSubmissions || 0)}
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
            <Position3Title>Verified Submissions per Registry</Position3Title>
            <RegistryCard
              title="Tokens"
              mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.tokens?.assetsVerified || 0)}
              secondaryValue="Verified submissions"
              registryKey="tokens"
            />
            <RegistryCard
              title="Single Tags"
              mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.singleTags?.assetsVerified || 0)}
              secondaryValue="Verified submissions"
              registryKey="single-tags"
            />
            <RegistryCard
              title="Query Tags"
              mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.tagQueries?.assetsVerified || 0)}
              secondaryValue="Verified submissions"
              registryKey="tags-queries"
            />
            <RegistryCard
              title="Contract Domains"
              mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.cdn?.assetsVerified || 0)}
              secondaryValue="Verified submissions"
              registryKey="cdn"
            />
          </Position3Container>
        </CarouselSlide>
      </CarouselTrack>
      </TrackWrapper>

      <DotsContainer>
        {Array.from({ length: SLIDE_COUNT }).map((_, index) => {
          const isActive = activeIndex === index;
          return (
            <Dot
              key={index}
              $active={isActive}
              aria-label={`Go to slide ${index + 1}`}
              aria-current={isActive}
              onClick={() => handleDotClick(index)}
            >
              {isActive ? (
                <DotFill
                  key={activeIndex}
                  $paused={isPaused}
                  $duration={CAROUSEL_INTERVAL}
                  onAnimationEnd={handleFillEnd}
                />
              ) : null}
            </Dot>
          );
        })}
      </DotsContainer>
    </Container>
  );
};
