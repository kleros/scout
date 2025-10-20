import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { hoverShortTransitionTiming } from 'styles/commonStyles';

import CalendarIcon from 'svgs/icons/calendar.svg';
import CoinIcon from 'svgs/icons/coins.svg';

interface RewardData {
  title: string;
  description: string;
  registryKey?: string;
}

const CAROUSEL_INTERVAL = 7000;
const REWARD_POOL = '100,000 PNK';

const DOT_COLORS = {
  active: '#C5ABFF',
  inactive: '#0A0A0A',
} as const;

const Container = styled.div`
  margin-bottom: 12px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin: 0;
`;

const CarouselContainer = styled.div`
  position: relative;
  border-radius: 12px;
  height: 252px;
`;

const Card = styled.div<{ isActive: boolean; index: number }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  padding: 24px;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  cursor: ${({ isActive }) => isActive ? 'pointer' : 'default'};
  opacity: ${({ isActive }) => isActive ? 1 : 0};
  transform: scale(${({ isActive }) => isActive ? 1 : 0.95});
  transition: all 0.3s ease-in-out;
  z-index: ${({ isActive }) => isActive ? 2 : 1};
  pointer-events: ${({ isActive }) => isActive ? 'auto' : 'none'};
  ${hoverShortTransitionTiming}

  &:hover {
    ${({ isActive }) => isActive && css`
      border-color: ${({ theme }) => theme.primary};
      box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.15);
      transform: scale(1.02);
    `}
  }
`;

const NewBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 0px;
  background: linear-gradient(90deg, #7d4bff 0%, #485fff 100%);
  color: ${({ theme }) => theme.white};
  font-size: 14px;
  font-weight: 600;
  border-radius: 999px;
  padding: 6px 16px;
`;

const CardTitle = styled.h2`
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 8px 0;
  line-height: 1.5;
  color: ${({ theme }) => theme.primaryText};
`;

const CardDescription = styled.p`
  margin: 0 0 24px 0;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.secondaryText};

  svg {
    min-width: 16px;
    min-height: 16px;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    path {
      fill: ${({ theme }) => theme.primary};
    }
  }
`;

const TopSide = styled.div`
  display: flex;
  flex-direction: column;
`;

const BottomSide = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledCalendarValue = styled.label`
  margin-left: auto;
  color: ${({ theme }) => theme.secondaryPurple};
`;

const StyledRewardValue = styled.label`
  margin-left: auto;
  font-size: 24px;
  color: ${({ theme }) => theme.secondaryPurple};
  font-weight: 600;
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, #7d4bff 0%, #485fff 100%);
  margin-bottom: 12px;
`;

const DotsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
`;

const Dot = styled.div<{ active: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ active }) => active ? DOT_COLORS.active : DOT_COLORS.inactive};
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${DOT_COLORS.active};
  }
`;

const REWARDS_DATA: RewardData[] = [
  {
    title: "Token Collection Verification",
    description: "Verify the authenticity of new tokens and earn rewards",
    registryKey: "Tokens"
  },
  {
    title: "Address Tag Collection Verification",
    description: "Verify the authenticity of new contract address tags and earn rewards",
    registryKey: "Single_Tags"
  },
  {
    title: "Contract Domain Name Collection Verification",
    description: "Verify the authenticity of new contract domain name submissions and earn rewards",
    registryKey: "CDN"
  }
];

const getCurrentMonthDeadline = (): string => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toLocaleDateString("en-GB", { 
    day: "numeric", 
    month: "long", 
    year: "numeric" 
  });
};

export const ActiveRewardsCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const deadline = useMemo(() => getCurrentMonthDeadline(), []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % REWARDS_DATA.length);
    }, CAROUSEL_INTERVAL);
    
    intervalRef.current = interval;

    return () => clearInterval(interval);
  }, []);

  const handleCardClick = useCallback((registryKey: string) => {
    navigate(`/registry?registry=${registryKey}&status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1`);
  }, [navigate]);

  const handleDotClick = useCallback((index: number) => {
    setCurrentIndex(index);
    
    // Reset the timer by clearing current interval and starting a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    const newInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % REWARDS_DATA.length);
    }, CAROUSEL_INTERVAL);
    intervalRef.current = newInterval;
  }, []);

  return (
    <Container>
      <Header>
        <Title>Active Rewards</Title>
      </Header>
      <CarouselContainer>
        {REWARDS_DATA.map((reward, index) => (
          <Card
            key={index}
            isActive={index === currentIndex}
            index={index}
            onClick={() => handleCardClick(reward.registryKey || '')}
          >
            <TopSide>
              <NewBadge>NEW</NewBadge>
              <CardTitle>{reward.title}</CardTitle>
              <CardDescription>{reward.description}</CardDescription>
            </TopSide>
            <BottomSide>
              <DetailRow>
                <CalendarIcon />
                <span>Deadline:</span>
                <StyledCalendarValue>{deadline}</StyledCalendarValue>
              </DetailRow>
              <Divider />
              <DetailRow>
                <CoinIcon />
                <span>Reward Pool:</span>
                <StyledRewardValue>{REWARD_POOL}</StyledRewardValue>
              </DetailRow>
            </BottomSide>
          </Card>
        ))}
      </CarouselContainer>
      <DotsContainer>
        {REWARDS_DATA.map((_, index) => (
          <Dot
            key={index}
            active={index === currentIndex}
            onClick={() => handleDotClick(index)}
          />
        ))}
      </DotsContainer>
    </Container>
  );
};