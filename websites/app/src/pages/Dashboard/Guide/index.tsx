import React from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from "styles/landscapeStyle";

import BookCircleIcon from "svgs/icons/book-circle.svg";
import BountiesIcon from "svgs/icons/bounties.svg";
import RewardsIcon from "svgs/icons/rewards.svg";
import DocumentationIcon from "svgs/icons/documentation.svg";
import WarningOutlineIcon from "svgs/icons/warning-outline.svg";

const Container = styled.div`
  color: ${({ theme }) => theme.white};
  min-height: 100vh;
  padding: 32px 32px 64px;
  font-family: "Inter", sans-serif;
  background: ${({ theme }) => theme.lightBackground};

  ${landscapeStyle(
    () => css`
      padding: 80px 0 100px 48px; 
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
  margin-top: 32px;
  margin-bottom: 48px;
  flex-wrap: wrap;
`;

const InfoCard = styled.div`
  display: flex;
  padding: 24px;
  align-items: center;
  max-width: 600px;
  background: ${({ theme }) => theme.lightGrey};
  border-radius: 12px;
  flex-direction: row;
  gap: 16px;

  svg {
    min-width: 64px;
    min-height: 64px;
    width: 64px;
    height: 64px;
    flex-shrink: 0;
  }
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
  margin-bottom: 48px;
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

const SubmittingEntry = () => (
  <SectionContainer>
    <SectionHeader>Submitting an Entry</SectionHeader>
    <SectionSteps>
      <StepItem>1. Go to Kleros Scout.</StepItem>
      <StepItem>2. Connect your crypto wallet.</StepItem>
      <StepItem>
        3. Click the dropdown menu “Lists” and select the correct registry (e.g.,
        “Tokens”).
      </StepItem>
      <StepItem>4. Check the policy and ensure you meet all requirements.</StepItem>
      <StepItem>5. Click “Submit Entry” and fill out the necessary info.</StepItem>
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
      <StepItem>4. Click “Details,” then “Challenge Entry.”</StepItem>
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
      <StepItem>1. Go to the specific entry under dispute.</StepItem>
      <StepItem>2. Press “Details,” then “Submit Evidence.”</StepItem>
      <StepItem>3. Fill in the form with your supporting proofs.</StepItem>
      <StepItem>
        4. Complete the transaction to finalize your evidence submission.
      </StepItem>
    </SectionSteps>
  </SectionContainer>
);

const QuickGuidePage: React.FC = () => (
  <Container>
    <Header>
      <BookCircleIcon />
      <div>
        <Title>Quick Guide</Title>
        <Subtitle>
          Keep the community safe, earn bounties, and have fun in Kleros Scout!
        </Subtitle>
      </div>
    </Header>

    <CardRow>
      <InfoCard>
        <BountiesIcon />
        <CardTitleAndDescription>
          <CardTitle>Bounties</CardTitle>
          <CardDescription>
            Find and challenge suspicious submissions. If you win the challenge,
            you’ll always earn a bounty!
          </CardDescription>
        </CardTitleAndDescription>
      </InfoCard>
      <InfoCard>
        <RewardsIcon />
        <CardTitleAndDescription>
          <CardTitle>Rewards</CardTitle>
          <CardDescription>
            Explore active reward plans and submit compliant entries to earn
            rewards.
          </CardDescription>
        </CardTitleAndDescription>
      </InfoCard>
    </CardRow>

    <Frame>
      <SubmittingEntry />
      <ChallengingSubmission />
      <ChallengePhase />
    </Frame>

    <InfoCard>
      <DocumentationIcon />
      <CardTitleAndDescription>
        <CardTitle>Documentation</CardTitle>
        <CardDescription>
          For more details check the full documentation.
        </CardDescription>
      </CardTitleAndDescription>
    </InfoCard>
  </Container>
);

export default QuickGuidePage;
