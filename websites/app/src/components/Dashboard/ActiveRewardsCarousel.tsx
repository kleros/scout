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
  width: 100%;

  @media (min-width: 640px) {
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
  }

  ${landscapeStyle(
    () => css`
      grid-template-columns: repeat(3, 1fr);
      max-width: 1200px;
      margin: 0 auto;
      gap: 24px;
    `
  )}
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  padding: 16px;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transform: scale(1);
  ${hoverShortTransitionTiming}
  position: relative;
  min-height: 200px;
  width: 100%;
  min-width: 0;

  ${landscapeStyle(
    () => css`
      padding: 24px;
      min-height: 240px;
    `
  )}

  &:hover {
    transform: scale(1.02);
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.15);
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
  z-index: 1;
`;

const CardTitle = styled.h2`
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 6px 0;
  line-height: 1.5;
  color: ${({ theme }) => theme.primaryText};
  word-wrap: break-word;
  overflow-wrap: break-word;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      margin: 0 0 8px 0;
    `
  )}
`;

const CardDescription = styled.p`
  margin: 0 0 16px 0;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;

  ${landscapeStyle(
    () => css`
      margin: 0 0 24px 0;
      font-size: 14px;
    `
  )}
`;

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  row-gap: 4px;
  font-size: 13px;
  margin-bottom: 10px;
  color: ${({ theme }) => theme.secondaryText};
  width: 100%;
  min-width: 0;

  ${landscapeStyle(
    () => css`
      font-size: 14px;
      margin-bottom: 12px;
      gap: 8px;
    `
  )}

  svg {
    min-width: 14px;
    min-height: 14px;
    width: 14px;
    height: 14px;
    flex-shrink: 0;

    ${landscapeStyle(
      () => css`
        min-width: 16px;
        min-height: 16px;
        width: 16px;
        height: 16px;
      `
    )}

    path {
      fill: ${({ theme }) => theme.primary};
    }
  }

  span {
    white-space: nowrap;
    flex-shrink: 0;
  }
`;

const TopSide = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
`;

const BottomSide = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
  width: 100%;
`;

const StyledCalendarValue = styled.label`
  margin-left: auto;
  color: ${({ theme }) => theme.secondaryPurple};
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;

  ${landscapeStyle(
    () => css`
      font-size: 14px;
    `
  )}
`;

const StyledRewardValue = styled.label`
  margin-left: auto;
  font-size: 16px;
  color: ${({ theme }) => theme.secondaryPurple};
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;

  ${landscapeStyle(
    () => css`
      font-size: 24px;
    `
  )}
`;

const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, #7d4bff 0%, #485fff 100%);
  margin-bottom: 10px;

  ${landscapeStyle(
    () => css`
      margin-bottom: 12px;
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