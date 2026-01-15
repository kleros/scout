import React from "react";
import styled, { css } from "styled-components";
import { useNavigate } from "react-router-dom";
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import {
  RewardCard,
  RewardCardNewBadge,
  RewardCardTitle,
  RewardCardDescription,
  RewardCardDetailRow,
  RewardCardTopSection,
  RewardCardBottomSection
} from "components/Dashboard/RewardCard";

import ActiveRewards from "svgs/icons/rewards.svg";
import CalendarIcon from "svgs/icons/calendar.svg";
import CoinIcon from "svgs/icons/coins.svg";
import ScrollTop from "components/ScrollTop";

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

// Using shared components from components/Dashboard/RewardCard.tsx

const StyledRewardCard = styled(RewardCard)`
  ${landscapeStyle(
    () => css`
      width: 392px;
    `
  )}
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

const rewards = [
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

const getCurrentMonthDeadline = () => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return lastDay.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
};

const currentMonthDeadline = getCurrentMonthDeadline();

const RewardCardComponent = ({ title, description, onClick }) => (
  <StyledRewardCard onClick={onClick}>
    <RewardCardTopSection>
      <RewardCardNewBadge>NEW</RewardCardNewBadge>
      <RewardCardTitle>{title}</RewardCardTitle>
      <RewardCardDescription>{description}</RewardCardDescription>
    </RewardCardTopSection>
    <RewardCardBottomSection>
      <RewardCardDetailRow>
        <CalendarIcon />
        <span>Deadline:</span>
        <StyledCalendarValue>{currentMonthDeadline}</StyledCalendarValue>
      </RewardCardDetailRow>
      <Divider />
      <RewardCardDetailRow>
        <CoinIcon />
        <span>Submissions:</span>
        <StyledRewardValue>93,000 PNK</StyledRewardValue>
      </RewardCardDetailRow>
      <RewardCardDetailRow>
        <CoinIcon />
        <span>Removals:</span>
        <StyledRewardValue>7,000 PNK</StyledRewardValue>
      </RewardCardDetailRow>
    </RewardCardBottomSection>
  </StyledRewardCard>
);

const RewardsPage = () => {
  const navigate = useNavigate();

  const handleCardClick = (registryKey: string) => {
    navigate(`/registry/${registryKey}?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1`);
  };

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
        {rewards.map(r => (
          <RewardCardComponent
            key={r.title}
            title={r.title}
            description={r.description}
            onClick={() => handleCardClick(r.registryKey)}
          />
        ))}
      </CardsContainer>
    </Container>
  );
};

export default RewardsPage;
