import React from "react";
import styled, { css } from "styled-components";
import { useNavigate } from "react-router-dom";
import { landscapeStyle } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";
import { hoverShortTransitionTiming } from "styles/commonStyles";

import ActiveRewards from "svgs/icons/active-rewards.svg";
import CalendarIcon from "svgs/icons/calendar.svg";
import CoinIcon from "svgs/icons/coins.svg";
import ScrollTop from "components/ScrollTop";

const Container = styled.div`
  color: ${({ theme }) => theme.white};
  min-height: 100vh;
  padding: 32px 16px 64px;
  font-family: "Open Sans", sans-serif;
  background: ${({ theme }) => theme.lightBackground};

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

const Card = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  padding: 24px;
  justify-content: space-between;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transform: scale(1);
  ${hoverShortTransitionTiming}

  &:hover {
    transform: scale(1.02);
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.15);
  }

  ${landscapeStyle(
    () => css`
      width: 392px;
    `
  )}
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

const RewardCard = ({ title, description, onClick }) => (
  <Card onClick={onClick}>
    <TopSide>
      <NewBadge>NEW</NewBadge>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </TopSide>
    <BottomSide>
      <DetailRow>
        <CalendarIcon />
        <span>Deadline:</span>
        <StyledCalendarValue>{currentMonthDeadline}</StyledCalendarValue>
      </DetailRow>
      <Divider />
      <DetailRow>
        <CoinIcon />
        <span>Reward Pool:</span>
        <StyledRewardValue>100,000 PNK</StyledRewardValue>
      </DetailRow>
    </BottomSide>
  </Card>
);

const RewardsPage = () => {
  const navigate = useNavigate();

  const handleCardClick = (registryKey: string) => {
    navigate(`/registry?registry=${registryKey}&status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1`);
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
          <RewardCard 
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
