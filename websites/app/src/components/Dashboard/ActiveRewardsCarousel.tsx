import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import {
  RewardCard,
  RewardCardNewBadge,
  RewardCardTitle,
  RewardCardDescription,
  RewardCardDetailRow,
  RewardCardTopSection,
  RewardCardBottomSection
} from './RewardCard';

import CalendarIcon from 'svgs/icons/calendar.svg';
import CoinIcon from 'svgs/icons/coins.svg';

interface RewardData {
  title: string;
  description: string;
  registryKey?: string;
}

const SUBMISSION_REWARD = '93,000 PNK';
const REMOVAL_REWARD = '7,000 PNK';

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

// Using shared RewardCard components from ./RewardCard.tsx

const DetailRow = styled(RewardCardDetailRow)`
  flex-wrap: wrap;
  gap: 6px;
  row-gap: 4px;
  font-size: 13px;
  width: 100%;
  min-width: 0;

  ${landscapeStyle(
    () => css`
      font-size: 14px;
      gap: 8px;
    `
  )}

  svg {
    min-width: 14px;
    min-height: 14px;
    width: 14px;
    height: 14px;

    ${landscapeStyle(
      () => css`
        min-width: 16px;
        min-height: 16px;
        width: 16px;
        height: 16px;
      `
    )}
  }

  span {
    white-space: nowrap;
    flex-shrink: 0;
  }
`;

// Using shared RewardCardTopSection and RewardCardBottomSection from ./RewardCard.tsx

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

const getRegistryUrl = (registryKey: string) =>
  `/registry/${registryKey}?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1`;

export const ActiveRewardsCarousel: React.FC = () => {
  const deadline = useMemo(() => getCurrentMonthDeadline(), []);

  return (
    <Container>
      <Header>
        <Title>Active Rewards</Title>
      </Header>
      <CardsGrid>
        {REWARDS_DATA.map((reward, index) => (
          <RewardCard
            key={index}
            to={getRegistryUrl(reward.registryKey || '')}
          >
            <RewardCardTopSection>
              <RewardCardNewBadge>NEW</RewardCardNewBadge>
              <RewardCardTitle>{reward.title}</RewardCardTitle>
              <RewardCardDescription>{reward.description}</RewardCardDescription>
            </RewardCardTopSection>
            <RewardCardBottomSection>
              <DetailRow>
                <CalendarIcon />
                <span>Deadline:</span>
                <StyledCalendarValue>{deadline}</StyledCalendarValue>
              </DetailRow>
              <Divider />
              <DetailRow>
                <CoinIcon />
                <span>Submissions:</span>
                <StyledRewardValue>{SUBMISSION_REWARD}</StyledRewardValue>
              </DetailRow>
              <DetailRow>
                <CoinIcon />
                <span>Removals:</span>
                <StyledRewardValue>{REMOVAL_REWARD}</StyledRewardValue>
              </DetailRow>
            </RewardCardBottomSection>
          </RewardCard>
        ))}
      </CardsGrid>
    </Container>
  );
};