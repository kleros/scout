import React from "react";
import styled, { css } from "styled-components";
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import RewardCardContent from "components/Dashboard/RewardCardContent";

import ActiveRewards from "svgs/icons/rewards.svg";
import ScrollTop from "components/ScrollTop";
import { REWARDS_DATA, getCurrentMonthDeadline } from "components/Dashboard/rewardsConfig";

const Container = styled.div`
  color: ${({ theme }) => theme.white};
  padding: 32px 16px 64px;
  font-family: "Open Sans", sans-serif;
  background: ${({ theme }) => theme.lightBackground};
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;

  ${landscapeStyle(
    () => css`
      padding: 48px ${responsiveSize(0, 48)} 60px;
    `
  )}
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 40px;

  svg {
    min-width: 64px;
    min-height: 64px;
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

const CardsContainer = styled.div`
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
`;

const StyledRewardCard = styled(RewardCardContent)`
  ${landscapeStyle(
    () => css`
      width: 392px;
    `
  )}
`;

const currentMonthDeadline = getCurrentMonthDeadline();

const RewardsPage = () => {
  return (
    <Container>
      <ScrollTop />
      <Header>
        <ActiveRewards />
        <div>
          <Title>Active Rewards</Title>
          <Subtitle>Participate and earn rewards for your contributions</Subtitle>
        </div>
      </Header>
      <CardsContainer>
        {REWARDS_DATA.map(r => (
          <StyledRewardCard
            key={r.title}
            title={r.title}
            description={r.description}
            registryKey={r.registryKey}
            deadline={currentMonthDeadline}
          />
        ))}
      </CardsContainer>
    </Container>
  );
};

export default RewardsPage;
