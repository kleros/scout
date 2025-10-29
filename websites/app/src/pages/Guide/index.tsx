import React from "react";
import styled, { css } from "styled-components";
import { useNavigate } from "react-router-dom";
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";

import BookCircleIcon from "svgs/icons/book-circle.svg";
import BountiesIcon from "svgs/icons/bounties.svg";
import RewardsIcon from "svgs/icons/rewards.svg";
import DocumentationIcon from "svgs/icons/documentation.svg";
import WarningOutlineIcon from "svgs/icons/warning-outline.svg";
import { hoverShortTransitionTiming } from "styles/commonStyles";
import ScrollTop from "components/ScrollTop";

const Container = styled.div`
  color: ${({ theme }) => theme.primaryText};
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
  margin-bottom: 32px;
  gap: 16px;

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

const CardRow = styled.div`
  display: flex;
  flex-direction: row;
  gap: 16px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const InfoCard = styled.div`
  display: flex;
  padding: 24px;
  align-items: center;
  max-width: 600px;
  background: transparent;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  flex-direction: row;
  gap: 16px;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);

  svg {
    min-width: 64px;
    min-height: 64px;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }

  ${hoverShortTransitionTiming}

  &:hover {
    transform: scale(1.02);
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.15);
  }
`;

const ClickableInfoCard = styled(InfoCard)`
  cursor: pointer;
`;

const CardTitleAndDescription = styled.div`
  display: flex;
  flex-direction: column;
`;

const CardTitle = styled.h2`
  font-size: 16px;
  margin: 0;
  color: ${({ theme }) => theme.secondaryText};
`;

const CardDescription = styled.p`
  color: ${({ theme }) => theme.tertiaryText};
  margin: 0;
  font-size: 14px;
`;

const Frame = styled.div`
  margin-bottom: 16px;
`;

const SectionContainer = styled.div`
  margin-bottom: 32px;
`;

const SectionHeader = styled.h3`
  font-size: 16px;
  margin: 0 0 16px 0;
`;

const SectionSteps = styled.ol`
  margin: 0 0 16px 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FooterText = styled.label`
  color: ${({ theme }) => theme.tertiaryText};
`;

const StepItem = styled.label`
  line-height: 1.2;
  color: ${({ theme }) => theme.secondaryText};
`;

const AttentionContainer = styled.div`
  display: flex;
  color: ${({ theme }) => theme.tintYellow};
  font-size: 14px;
  margin-bottom: 16px;
  gap: 8px;

  svg {
    min-width: 16px;
    min-height: 16px;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const AttentionLabel = styled.label`
  color: ${({ theme }) => theme.tintYellow};
`;

const SubmittingItem = () => (
  <SectionContainer>
    <SectionHeader>Submitting an Item</SectionHeader>
    <SectionSteps>
      <StepItem>1. Go to Kleros Scout.</StepItem>
      <StepItem>2. Connect your crypto wallet.</StepItem>
      <StepItem>
        3. Click the dropdown menu “Lists” and select the correct registry (e.g.,
        “Tokens”).
      </StepItem>
      <StepItem>4. Check the policy and ensure you meet all requirements.</StepItem>
      <StepItem>5. Click “Submit Item and fill out the necessary info.</StepItem>
      <StepItem>
        6. Press “Submit” and confirm the transaction on your wallet to place the
        deposit.
      </StepItem>
    </SectionSteps>
    <AttentionContainer>
      <WarningOutlineIcon />
      <AttentionLabel>Attention: Non‑compliant submissions risk losing deposits.</AttentionLabel>
    </AttentionContainer>
    <FooterText>
      If your submission passes verification, you’ll get your deposit back. Be
      sure to check if you also qualify for a reward.
    </FooterText>
  </SectionContainer>
);

const ChallengingSubmission = () => (
  <SectionContainer>
    <SectionHeader>Challenging a Suspicious Submission</SectionHeader>
    <SectionSteps>
      <StepItem>1. Go to Kleros Scout.</StepItem>
      <StepItem>2. Connect your crypto wallet.</StepItem>
      <StepItem>3. Find a submission that looks inconsistent.</StepItem>
      <StepItem>4. Click "Details," then "Challenge Item."</StepItem>
      <StepItem>5. Provide your evidence in the form (e.g., mismatch data).</StepItem>
      <StepItem>
        6. Press “Confirm” and accept the transaction on your wallet to place the
        deposit.
      </StepItem>
    </SectionSteps>
    <AttentionContainer>
      <WarningOutlineIcon />
      <AttentionLabel>Attention: Non‑compliant submissions risk losing deposits.</AttentionLabel>
    </AttentionContainer>
    <FooterText>
      If your submission passes verification, you’ll get your deposit back. Be
      sure to check if you also qualify for a reward.
    </FooterText>
  </SectionContainer>
);

const ChallengePhase = () => (
  <SectionContainer>
    <SectionHeader>Submission in Challenge Phase</SectionHeader>
    <SectionSteps>
      <StepItem>1. Go to the specific item under dispute.</StepItem>
      <StepItem>2. Press “Details,” then “Submit Evidence.”</StepItem>
      <StepItem>3. Fill in the form with your supporting proofs.</StepItem>
      <StepItem>
        4. Complete the transaction to finalize your evidence submission.
      </StepItem>
    </SectionSteps>
  </SectionContainer>
);

const QuickGuidePage: React.FC = () => {
  const navigate = useNavigate();

  const handleRewardsClick = () => {
    navigate('/rewards');
  };

  return (
    <Container>
      <ScrollTop />
      <Header>
        <BookCircleIcon />
        <div>
          <Title>Quick Guide</Title>
          <Subtitle>
            Keep the community safe, earn bounties, and have fun in Kleros Scout!
          </Subtitle>
        </div>
      </Header>

      <Frame>
        <SubmittingItem />
        <ChallengingSubmission />
        <ChallengePhase />
      </Frame>

      <CardRow>
        <ClickableInfoCard onClick={handleRewardsClick}>
          <BountiesIcon />
          <CardTitleAndDescription>
            <CardTitle>Bounties</CardTitle>
            <CardDescription>
              Find and challenge suspicious submissions. If you win the challenge,
              you'll always earn a bounty!
            </CardDescription>
          </CardTitleAndDescription>
        </ClickableInfoCard>
        <ClickableInfoCard onClick={handleRewardsClick}>
          <RewardsIcon />
          <CardTitleAndDescription>
            <CardTitle>Rewards</CardTitle>
            <CardDescription>
              Explore active reward plans and submit compliant items to earn
              rewards.
            </CardDescription>
          </CardTitleAndDescription>
        </ClickableInfoCard>
      </CardRow>

      <ClickableInfoCard onClick={() => window.open('https://docs.kleros.io/products/curate/kleros-scout', '_blank')}>
        <DocumentationIcon />
        <CardTitleAndDescription>
          <CardTitle>Documentation</CardTitle>
          <CardDescription>
            For more details check the full documentation.
          </CardDescription>
        </CardTitleAndDescription>
      </ClickableInfoCard>
    </Container>
  );
};

export default QuickGuidePage;
