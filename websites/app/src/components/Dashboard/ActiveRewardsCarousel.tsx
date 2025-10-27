import React, { useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import { landscapeStyle } from 'styles/landscapeStyle';

import CalendarIcon from 'svgs/icons/calendar.svg';
import CoinIcon from 'svgs/icons/coins.svg';

interface RewardData {
  title: string;
  description: string;
  registryKey?: string;
}

const REWARD_POOL = '100,000 PNK';

const Container = styled.div`
  width: 100%;
`;

const Header = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 12px;

  ${landscapeStyle(
    () => css`
      margin-bottom: 16px;
    `
  )}
`;

const Title = styled.h3`
  color: var(--Secondary-blue, #7186FF);
  font-family: "Open Sans";
  font-size: 14px;
  font-style: italic;
  font-weight: 400;
  line-height: normal;
  margin: 0;
  text-align: center;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
    `
  )}
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;

  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(3, 1fr);
      max-width: 1200px;
      margin: 0 auto;
      gap: 16px;
    `
  )}
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  padding: 12px;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  ${hoverShortTransitionTiming}
  position: relative;
  min-height: 180px;

  ${landscapeStyle(
    () => css`
      padding: 18px;
      min-height: 220px;
    `
  )}

  &:hover {
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.15);
    transform: translateY(-4px);
  }
`;

const NewBadge = styled.div`
  position: absolute;
  top: -8px;
  right: 0px;
  background: linear-gradient(90deg, #7d4bff 0%, #485fff 100%);
  color: ${({ theme }) => theme.white};
  font-size: 10px;
  font-weight: 600;
  border-radius: 999px;
  padding: 3px 10px;

  ${landscapeStyle(
    () => css`
      font-size: 12px;
      padding: 4px 12px;
      top: -10px;
    `
  )}
`;

const CardTitle = styled.h2`
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 4px 0;
  line-height: 1.3;
  color: ${({ theme }) => theme.primaryText};

  ${landscapeStyle(
    () => css`
      font-size: 14px;
      margin: 0 0 6px 0;
    `
  )}
`;

const CardDescription = styled.p`
  margin: 0 0 12px 0;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;
  line-height: 1.3;

  ${landscapeStyle(
    () => css`
      margin: 0 0 16px 0;
      font-size: 13px;
    `
  )}
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
  margin-bottom: 6px;
  color: ${({ theme }) => theme.secondaryText};

  ${landscapeStyle(
    () => css`
      font-size: 13px;
      margin-bottom: 10px;
    `
  )}

  svg {
    min-width: 12px;
    min-height: 12px;
    width: 12px;
    height: 12px;
    flex-shrink: 0;

    ${landscapeStyle(
      () => css`
        min-width: 14px;
        min-height: 14px;
        width: 14px;
        height: 14px;
      `
    )}

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
  font-size: 10px;

  ${landscapeStyle(
    () => css`
      font-size: 13px;
    `
  )}
`;

const StyledRewardValue = styled.label`
  margin-left: auto;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryPurple};
  font-weight: 600;

  ${landscapeStyle(
    () => css`
      font-size: 18px;
    `
  )}
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, #7d4bff 0%, #485fff 100%);
  margin-bottom: 6px;

  ${landscapeStyle(
    () => css`
      margin-bottom: 10px;
    `
  )}
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
  const navigate = useNavigate();
  const deadline = useMemo(() => getCurrentMonthDeadline(), []);

  const handleCardClick = useCallback((registryKey: string) => {
    navigate(`/registry/${registryKey}?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1`);
  }, [navigate]);

  return (
    <Container>
      <Header>
        <Title>Active Rewards</Title>
      </Header>
      <CardsGrid>
        {REWARDS_DATA.map((reward, index) => (
          <Card
            key={index}
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
      </CardsGrid>
    </Container>
  );
};