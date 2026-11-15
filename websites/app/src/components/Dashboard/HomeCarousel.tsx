import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { StatCard } from 'components/Dashboard/StatCard';
import { ChainRanking } from 'components/Dashboard/ChainRanking';
import { SubmissionsChart } from 'components/Dashboard/SubmissionsChart';
import { ActiveRewardsCarousel } from 'components/Dashboard/ActiveRewardsCarousel';
import { RegistryCard } from 'components/Dashboard/RegistryCard';
import ErrorState from 'components/ErrorState';
import AssetsVerifiedIcon from 'svgs/icons/assets-verified.svg';
import CuratorsIcon from 'svgs/icons/curators.svg';
import DisputesIcon from 'svgs/icons/law-balance.svg';
import Skeleton from 'react-loading-skeleton';

const CAROUSEL_INTERVAL = 8000;
/** A horizontal swipe shorter than this (px) is not a slide change. */
const SWIPE_MIN_DISTANCE = 40;

const SLIDES = [
  { label: 'Show statistics' },
  { label: 'Show active rewards' },
  { label: 'Show registries' },
] as const;

const SLIDE_COUNT = SLIDES.length;

const Container = styled.div`
  position: relative;
  width: 100%;
`;

const TrackWrapper = styled.div`
  overflow: hidden;
  /* clip, unlike hidden, cannot be scrolled: focusing a link on another slide must not shift the track. */
  overflow: clip;
  /* Vertical swipes scroll the page; horizontal ones change the slide. */
  touch-action: pan-y;
`;

const CarouselTrack = styled.div<{ $activeIndex: number }>`
  display: flex;
  /* Every slide takes the height of the tallest, so the page below never moves when the slide changes. */
  align-items: stretch;
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
  /* Room for the cards' 2px hover lift, which the track would otherwise cut off. */
  padding-top: 4px;
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

const StatisticsTitle = styled.h2`
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

const StatsError = styled.div`
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;

  ${landscapeStyle(
    () => css`
      border-radius: 16px;
    `
  )}
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

const Position3Title = styled.h2`
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

const Controls = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 4px 0;

  ${landscapeStyle(
    () => css`
      margin-top: 20px;
    `
  )}
`;

const Dots = styled.div`
  display: flex;
  align-items: center;
`;

const fillAnimation = keyframes`
  from { width: 0%; }
  to { width: 100%; }
`;

/** A 24px target around the small pill that is drawn. */
const DotButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 4px;
  border: none;
  border-radius: 9999px;
  background: transparent;
  cursor: pointer;
`;

const DotPill = styled.span<{ $active: boolean; $filled: boolean }>`
  display: block;
  width: ${({ $active }) => ($active ? '36px' : '10px')};
  height: 10px;
  border-radius: 9999px;
  /* 40% white: 3.7:1 on the black stage (the former #4A4A4A was 2.4:1). */
  background: ${({ $filled, theme }) => ($filled ? theme.carouselDotActive : `${theme.white}66`)};
  position: relative;
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s ease;

  ${DotButton}:hover & {
    background: ${({ $active, $filled, theme }) =>
      $filled ? theme.carouselDotActive : $active ? `${theme.white}66` : theme.carouselDotActive};
  }
`;

const DotFill = styled.span<{ $paused: boolean; $duration: number }>`
  position: absolute;
  inset: 0;
  width: 0;
  background: ${({ theme }) => theme.carouselDotActive};
  animation: ${fillAnimation} ${({ $duration }) => $duration}ms linear forwards;
  animation-play-state: ${({ $paused }) => ($paused ? 'paused' : 'running')};
`;

const PlayPauseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.secondaryText};
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    background: ${({ theme }) => theme.hoverBackground};
  }

  svg {
    width: 10px;
    height: 10px;
    display: block;
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

/** A value that could not be read: a dash on screen, "Not available" for screen readers (never a 0). */
const Unavailable: React.FC = () => (
  <span title="Not available right now">
    <span aria-hidden="true">—</span>
    <span className="visually-hidden">Not available</span>
  </span>
);

const usePrefersReducedMotion = () => {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener('change', update);
    return () => mql.removeEventListener('change', update);
  }, []);

  return reduced;
};

interface HomeCarouselProps {
  stats: any;
  isLoading: boolean;
  /** The statistics did not load (after retries). */
  isError?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
  chartData: Array<{ name: string; submissions: number }>;
}

export const HomeCarousel: React.FC<HomeCarouselProps> = ({
  stats,
  isLoading,
  isError = false,
  onRetry,
  isRetrying = false,
  chartData,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [isStopped, setIsStopped] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  // Slides change by themselves only for people who did not ask the system to reduce motion.
  const autoAdvance = !prefersReducedMotion;
  const isPaused = isHovered || hasFocusWithin || isStopped;

  const handleFillEnd = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % SLIDE_COUNT);
  }, []);

  const showSlide = useCallback((index: number) => {
    setActiveIndex((index + SLIDE_COUNT) % SLIDE_COUNT);
  }, []);

  // The track is clipped, not scrolled; undo any scroll a browser without overflow: clip applies
  // when a link on another slide takes focus.
  const handleTrackScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (event.currentTarget.scrollLeft !== 0) event.currentTarget.scrollLeft = 0;
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse') return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) < SWIPE_MIN_DISTANCE || Math.abs(dx) <= Math.abs(dy)) return;
    showSlide(activeIndex + (dx < 0 ? 1 : -1));
  };

  const handleBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHasFocusWithin(false);
  };

  const registryValue = (value: number | undefined) =>
    isLoading ? <Skeleton width={60} height={32} /> : isError ? <Unavailable /> : (value || 0);

  return (
    <Container
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setHasFocusWithin(true)}
      onBlur={handleBlur}
    >
      <TrackWrapper
        onScroll={handleTrackScroll}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { swipeStart.current = null; }}
      >
      <CarouselTrack $activeIndex={activeIndex}>
        {/* Position 1: Metrics (left), Chart (middle), Chain Ranking (right) */}
        {/* Each slide follows keyboard focus, so the focused link is always the one on screen. */}
        <CarouselSlide onFocus={() => setActiveIndex(0)}>
          {isError ? (
            <>
              <StatisticsTitle>Statistics</StatisticsTitle>
              <StatsError>
                <ErrorState
                  title="The statistics did not load."
                  message="The Scout data service did not answer. Check your connection and try again."
                  onRetry={onRetry}
                  retrying={isRetrying}
                />
              </StatsError>
            </>
          ) : (
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
                mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.totalCurators ?? <Unavailable />)}
              />
              <StatCard
                icon={<DisputesIcon />}
                title="Total Solved Disputes"
                mainValue={isLoading ? <Skeleton width={60} height={32} /> : (stats?.totalSolvedDisputes ?? <Unavailable />)}
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
          )}
        </CarouselSlide>

        {/* Position 2: 3 Active Rewards cards horizontal */}
        <CarouselSlide onFocus={() => setActiveIndex(1)}>
          <Position2Container>
            <ActiveRewardsCarousel />
          </Position2Container>
        </CarouselSlide>

        {/* Position 3: Registry Stats */}
        <CarouselSlide onFocus={() => setActiveIndex(2)}>
          <Position3Container>
            <Position3Title>Verified Submissions per Registry</Position3Title>
            <RegistryCard
              title="Tokens"
              mainValue={registryValue(stats?.tokens?.assetsVerified)}
              secondaryValue="Verified submissions"
              registryKey="tokens"
            />
            <RegistryCard
              title="Single Tags"
              mainValue={registryValue(stats?.singleTags?.assetsVerified)}
              secondaryValue="Verified submissions"
              registryKey="single-tags"
            />
            <RegistryCard
              title="Tag Queries"
              mainValue={registryValue(stats?.tagQueries?.assetsVerified)}
              secondaryValue="Verified submissions"
              registryKey="tags-queries"
            />
            <RegistryCard
              title="Contract Domain Name"
              mainValue={registryValue(stats?.cdn?.assetsVerified)}
              secondaryValue="Verified submissions"
              registryKey="cdn"
            />
          </Position3Container>
        </CarouselSlide>
      </CarouselTrack>
      </TrackWrapper>

      <Controls>
        {autoAdvance ? (
          // Auto-advancing content needs a way to stop it (hover and focus also pause it).
          <PlayPauseButton
            type="button"
            aria-label={isStopped ? 'Play slideshow' : 'Pause slideshow'}
            onClick={() => setIsStopped((stopped) => !stopped)}
          >
            {isStopped ? (
              <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
                <path d="M2 1 L9 5 L2 9 Z" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 10 10" aria-hidden="true" focusable="false">
                <rect x="1.5" y="1" width="2.5" height="8" rx="0.5" fill="currentColor" />
                <rect x="6" y="1" width="2.5" height="8" rx="0.5" fill="currentColor" />
              </svg>
            )}
          </PlayPauseButton>
        ) : null}
        <Dots>
          {SLIDES.map((slide, index) => {
            const isActive = activeIndex === index;
            return (
              <DotButton
                key={slide.label}
                type="button"
                aria-label={slide.label}
                aria-current={isActive ? 'true' : undefined}
                onClick={() => showSlide(index)}
              >
                {/* Without auto-advance the active pill is simply filled. */}
                <DotPill $active={isActive} $filled={isActive && !autoAdvance}>
                  {isActive && autoAdvance ? (
                    <DotFill
                      key={activeIndex}
                      $paused={isPaused}
                      $duration={CAROUSEL_INTERVAL}
                      onAnimationEnd={handleFillEnd}
                    />
                  ) : null}
                </DotPill>
              </DotButton>
            );
          })}
        </Dots>
      </Controls>
    </Container>
  );
};
