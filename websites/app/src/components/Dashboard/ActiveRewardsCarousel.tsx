import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import {
  RewardCardDetailRow,
  RewardCardDivider,
  RewardCardCalendarValue,
  RewardCardRewardValue
} from './RewardCard';
import RewardCardContent from './RewardCardContent';
import { REWARDS_DATA, getCurrentMonthDeadline } from './rewardsConfig';

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
  color: ${({ theme }) => theme.secondaryBlue};
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

const StyledRewardCard = styled(RewardCardContent)`
  ${RewardCardDetailRow} {
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
  }

  ${RewardCardCalendarValue} {
    font-size: 12px;
    white-space: nowrap;
    flex-shrink: 0;

    ${landscapeStyle(
      () => css`
        font-size: 14px;
      `
    )}
  }

  ${RewardCardRewardValue} {
    font-size: 16px;
    white-space: nowrap;
    flex-shrink: 0;

    ${landscapeStyle(
      () => css`
        font-size: 24px;
      `
    )}
  }

  ${RewardCardDivider} {
    margin-bottom: 10px;

    ${landscapeStyle(
      () => css`
        margin-bottom: 12px;
      `
    )}
  }
`;

export const ActiveRewardsCarousel: React.FC = () => {
  const deadline = useMemo(() => getCurrentMonthDeadline(), []);

  return (
    <Container>
      <Header>
        <Title>Active Rewards</Title>
      </Header>
      <CardsGrid>
        {REWARDS_DATA.map((reward) => (
          <StyledRewardCard
            key={reward.registryKey}
            title={reward.title}
            description={reward.description}
            registryKey={reward.registryKey}
            deadline={deadline}
          />
        ))}
      </CardsGrid>
    </Container>
  );
};
