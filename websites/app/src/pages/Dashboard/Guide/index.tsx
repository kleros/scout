import React from "react";
import styled from "styled-components";

const Container = styled.div`
  background: #0e111a;
  color: #ffffff;
  min-height: 100vh;
  padding: 32px;
  font-family: "Inter", sans-serif;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 32px;
`;

const HeaderIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #282d3d;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
`;

const Title = styled.h1`
  font-size: 24px;
  margin: 0;
`;

const Subtitle = styled.p`
  margin: 4px 0 0 0;
  color: #9fa5c0;
`;

const CardRow = styled.div`
  display: flex;
  gap: 24px;
  margin-top: 32px;
  margin-bottom: 48px;
`;

const InfoCard = styled.div`
  flex: 1;
  padding: 24px;
  background: #1e2230;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #34394e;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CardTitle = styled.h2`
  font-size: 18px;
  margin: 0;
`;

const CardDescription = styled.p`
  color: #c3c7d6;
  margin: 0;
`;

const Frame = styled.div`
  border: 2px solid #00aaff;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 48px;
`;

const SectionContainer = styled.div`
  margin-bottom: 32px;
`;

const SectionHeader = styled.h3`
  font-size: 20px;
  margin: 0 0 16px 0;
`;

const SectionSteps = styled.ol`
  margin: 0 0 16px 20px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StepItem = styled.li`
  line-height: 1.4;
`;

const AttentionBox = styled.div`
  background: #2d1e1e;
  color: #ffb84d;
  padding: 12px 16px;
  border-left: 4px solid #ffb84d;
  border-radius: 4px;
  margin-bottom: 16px;
`;

const Footer = styled.div`
  margin-top: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const FooterIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  background: #282d3d;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FooterLink = styled.a`
  color: #00aaff;
  text-decoration: none;
`;

const SubmittingEntry = () => (
  <SectionContainer>
    <SectionHeader>Submitting an Entry</SectionHeader>
    <SectionSteps>
      <StepItem>Go to Kleros Scout.</StepItem>
      <StepItem>Connect your crypto wallet.</StepItem>
      <StepItem>
        Click the dropdown menu “Lists” and select the correct registry (e.g.,
        “Tokens”).
      </StepItem>
      <StepItem>Check the policy and ensure you meet all requirements.</StepItem>
      <StepItem>Click “Submit Entry” and fill out the necessary info.</StepItem>
      <StepItem>
        Press “Submit” and confirm the transaction on your wallet to place the
        deposit.
      </StepItem>
    </SectionSteps>
    <AttentionBox>Attention: Non‑compliant submissions risk losing deposits.</AttentionBox>
    <p>
      If your submission passes verification, you’ll get your deposit back. Be
      sure to check if you also qualify for a reward.
    </p>
  </SectionContainer>
);

const ChallengingSubmission = () => (
  <SectionContainer>
    <SectionHeader>Challenging a Suspicious Submission</SectionHeader>
    <SectionSteps>
      <StepItem>Go to Kleros Scout.</StepItem>
      <StepItem>Connect your crypto wallet.</StepItem>
      <StepItem>Find a submission that looks inconsistent.</StepItem>
      <StepItem>Click “Details,” then “Challenge Entry.”</StepItem>
      <StepItem>Provide your evidence in the form (e.g., mismatch data).</StepItem>
      <StepItem>
        Press “Confirm” and accept the transaction on your wallet to place the
        deposit.
      </StepItem>
    </SectionSteps>
    <AttentionBox>Attention: Invalid challenges lose the deposit.</AttentionBox>
    <p>
      If your submission passes verification, you’ll get your deposit back. Be
      sure to check if you also qualify for a reward.
    </p>
  </SectionContainer>
);

const ChallengePhase = () => (
  <SectionContainer>
    <SectionHeader>Submission in Challenge Phase</SectionHeader>
    <SectionSteps>
      <StepItem>Go to the specific entry under dispute.</StepItem>
      <StepItem>Press “Details,” then “Submit Evidence.”</StepItem>
      <StepItem>Fill in the form with your supporting proofs.</StepItem>
      <StepItem>
        Complete the transaction to finalize your evidence submission.
      </StepItem>
    </SectionSteps>
  </SectionContainer>
);

const QuickGuidePage: React.FC = () => (
  <Container>
    <Header>
      <HeaderIcon />
      <div>
        <Title>Quick Guide</Title>
        <Subtitle>
          Keep the community safe, earn bounties, and have fun in Kleros Scout!
        </Subtitle>
      </div>
    </Header>

    <CardRow>
      <InfoCard>
        <CardIcon />
        <CardTitle>Bounties</CardTitle>
        <CardDescription>
          Find and challenge suspicious submissions. If you win the challenge,
          you’ll always earn a bounty!
        </CardDescription>
      </InfoCard>
      <InfoCard>
        <CardIcon />
        <CardTitle>Rewards</CardTitle>
        <CardDescription>
          Explore active reward plans and submit compliant entries to earn
          rewards.
        </CardDescription>
      </InfoCard>
    </CardRow>

    <Frame>
      <SubmittingEntry />
      <ChallengingSubmission />
      <ChallengePhase />
    </Frame>

    <Footer>
      <FooterIcon />
      <FooterLink href="#">Documentation</FooterLink>
    </Footer>
  </Container>
);

export default QuickGuidePage;
