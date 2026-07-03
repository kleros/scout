import React, { useState } from "react";
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

const SCOUT_AGENT_ENTRY_URL = "https://scout-app.kleros.io/llms-full.txt";
const SCOUT_AGENT_PROMPT = `Read ${SCOUT_AGENT_ENTRY_URL} and follow it before interacting with Kleros Scout.`;

const Container = styled.div`
  color: ${({ theme }) => theme.primaryText};
  padding: 32px 16px 64px;
  font-family: "Manrope", sans-serif;
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

const AudienceSelector = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin: 0 0 32px;
`;

const SelectorLabel = styled.span`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
`;

const SelectorOptions = styled.div`
  display: flex;
  gap: 8px;
`;

const SelectorButton = styled.button<{ $isSelected: boolean }>`
  ${hoverShortTransitionTiming}
  min-width: 86px;
  min-height: 36px;
  padding: 8px 14px;
  border-radius: 7px;
  border: 1px solid ${({ $isSelected, theme }) => ($isSelected ? theme.primaryBlue : theme.stroke)};
  background: ${({ $isSelected, theme }) => ($isSelected ? `${theme.primaryBlue}1F` : "transparent")};
  color: ${({ $isSelected, theme }) => ($isSelected ? theme.primaryText : theme.secondaryText)};
  font: inherit;
  font-size: 14px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    border-color: ${({ theme }) => theme.primaryText};
  }
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
  box-shadow: ${({ theme }) => theme.shadowCard};

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
    box-shadow: ${({ theme }) => theme.shadowDropdown};
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

const copyTextToClipboard = async (text: string) => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall back below when clipboard permission is blocked.
  }

  let didCopy = false;
  const handleCopy = (event: ClipboardEvent) => {
    event.clipboardData?.setData("text/plain", text);
    event.preventDefault();
    didCopy = true;
  };

  document.addEventListener("copy", handleCopy);
  try {
    didCopy = document.execCommand("copy") || didCopy;
  } finally {
    document.removeEventListener("copy", handleCopy);
  }

  if (didCopy) return true;

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "-1000px";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    return document.execCommand("copy");
  } finally {
    document.body.removeChild(textArea);
  }
};

const AgentPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
`;

const AgentPromptCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 24px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
`;

const AgentPromptHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const AgentPromptTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.primaryBlue};
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
`;

const AgentPromptStep = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: 1px solid currentColor;
  border-radius: 50%;
  font-size: 12px;
`;

const AgentPromptMeta = styled.span`
  color: ${({ theme }) => theme.secondaryText};
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 13px;
`;

const AgentPromptRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 18px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  background: ${({ theme }) => theme.lightGrey};

  ${landscapeStyle(
    () => css`
      padding: 20px;
    `
  )}
`;

const AgentPromptText = styled.code`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${({ theme }) => theme.primaryText};
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 14px;
  line-height: 1.5;
  overflow-wrap: anywhere;
`;

const AgentPromptMarker = styled.span`
  color: ${({ theme }) => theme.primaryBlue};
  font-weight: 700;
`;

const AgentCopyButton = styled.button`
  ${hoverShortTransitionTiming}
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 7px;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-shrink: 0;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    border-color: ${({ theme }) => theme.primaryBlue};
    color: ${({ theme }) => theme.primaryBlue};
  }
`;

const CopyIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect x="5.5" y="2.5" width="8" height="10" rx="1.5" stroke="currentColor" />
    <path
      d="M3.5 5.5H3A1.5 1.5 0 0 0 1.5 7v6A1.5 1.5 0 0 0 3 14.5h5A1.5 1.5 0 0 0 9.5 13v-.5"
      stroke="currentColor"
      strokeLinecap="round"
    />
  </svg>
);

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

const AgentGuide = () => {
  const handleCopyAgentPrompt = async () => {
    await copyTextToClipboard(SCOUT_AGENT_PROMPT);
  };

  return (
    <AgentPanel>
      <AgentPromptCard>
        <AgentPromptHeader>
          <AgentPromptTitle>
            <AgentPromptStep>1</AgentPromptStep>
            Paste this into your agent
          </AgentPromptTitle>
          <AgentPromptMeta>One line · works in any agent</AgentPromptMeta>
        </AgentPromptHeader>

        <AgentPromptRow>
          <AgentPromptText>
            <AgentPromptMarker>&gt;</AgentPromptMarker>
            <span>{SCOUT_AGENT_PROMPT}</span>
          </AgentPromptText>
          <AgentCopyButton
            type="button"
            aria-label="Copy agent prompt"
            data-agent-instructions-url={SCOUT_AGENT_ENTRY_URL}
            data-agent-prompt={SCOUT_AGENT_PROMPT}
            onClick={handleCopyAgentPrompt}
          >
            <CopyIcon />
            Copy prompt
          </AgentCopyButton>
        </AgentPromptRow>
      </AgentPromptCard>
    </AgentPanel>
  );
};

const QuickGuidePage: React.FC = () => {
  const [audience, setAudience] = useState<'human' | 'agent'>('human');
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
          <Title>Guide & Skills</Title>
          <Subtitle>
            Keep the community safe, earn bounties, and have fun in Kleros Scout!
          </Subtitle>
        </div>
      </Header>

      <AudienceSelector aria-label="Choose guide audience">
        <SelectorLabel>I am:</SelectorLabel>
        <SelectorOptions>
          <SelectorButton
            type="button"
            $isSelected={audience === 'human'}
            onClick={() => setAudience('human')}
            aria-pressed={audience === 'human'}
          >
            Human
          </SelectorButton>
          <SelectorButton
            type="button"
            $isSelected={audience === 'agent'}
            onClick={() => setAudience('agent')}
            aria-pressed={audience === 'agent'}
          >
            Agent
          </SelectorButton>
        </SelectorOptions>
      </AudienceSelector>

      {audience === 'agent' ? (
        <AgentGuide />
      ) : (
        <>
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
        </>
      )}
    </Container>
  );
};

export default QuickGuidePage;
