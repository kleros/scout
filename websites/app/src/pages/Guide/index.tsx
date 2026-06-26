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

const KLEROS_CURATE_SKILL_URL =
  "https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/SKILL.md";
const SCOUT_REGISTRIES_SKILL_URL =
  "https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/scout-registries.md";
const LIGHT_CURATE_SKILL_URL =
  "https://raw.githubusercontent.com/kleros/kleros-skills/master/kleros-curate/references/light-curate.md";

const AGENT_QUICKSTART_COMMANDS = `curl -fsSL ${KLEROS_CURATE_SKILL_URL}
curl -fsSL ${SCOUT_REGISTRIES_SKILL_URL}
curl -fsSL ${LIGHT_CURATE_SKILL_URL}`;

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

const AgentPanel = styled.section`
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
`;

const AgentIntro = styled.div`
  padding: 20px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  background: ${({ theme }) => theme.lightGrey};
`;

const AgentTitle = styled.h2`
  margin: 0 0 8px;
  font-size: 20px;
  color: ${({ theme }) => theme.primaryText};
`;

const AgentDescription = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.secondaryText};
  line-height: 1.45;
`;

const AgentTerminal = styled.div`
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  background: #050505;
  overflow: hidden;
`;

const AgentTerminalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
  color: ${({ theme }) => theme.secondaryText};
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 12px;
`;

const AgentStatus = styled.span`
  color: ${({ theme }) => theme.success};
`;

const AgentEndpointList = styled.div`
  display: flex;
  flex-direction: column;
`;

const AgentEndpoint = styled.a`
  ${hoverShortTransitionTiming}
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  padding: 16px;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
  color: ${({ theme }) => theme.primaryText};
  text-decoration: none;
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 14px;

  &:last-child {
    border-bottom: 0;
  }

  &:hover {
    background: ${({ theme }) => theme.whiteLowOpacitySubtle};
  }

  ${landscapeStyle(
    () => css`
      grid-template-columns: 210px 1fr;
      gap: 16px;
    `
  )}
`;

const AgentEndpointLabel = styled.span`
  color: ${({ theme }) => theme.primaryBlue};
`;

const AgentEndpointUrl = styled.span`
  color: ${({ theme }) => theme.secondaryText};
  overflow-wrap: anywhere;
`;

const AgentCommandBlock = styled.pre`
  margin: 0;
  padding: 16px;
  color: ${({ theme }) => theme.secondaryText};
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.55;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

const AgentPromptBlock = styled.textarea`
  width: 100%;
  min-height: 128px;
  resize: vertical;
  padding: 16px;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  background: #050505;
  color: ${({ theme }) => theme.primaryText};
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
  outline: none;

  &:focus {
    border-color: ${({ theme }) => theme.primaryBlue};
  }
`;

const AgentChecklist = styled.ul`
  margin: 12px 0 0;
  padding-left: 20px;
  color: ${({ theme }) => theme.secondaryText};
  line-height: 1.45;
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

const AgentGuide = () => (
  <AgentPanel>
    <AgentIntro>
      <AgentTitle>Agent quickstart</AgentTitle>
      <AgentDescription>
        Fetch the canonical Kleros Curate skill first, then the Scout registry and
        Light Curate references before acting on Scout data.
      </AgentDescription>
      <AgentPromptBlock
        readOnly
        aria-label="Agent quickstart commands"
        value={AGENT_QUICKSTART_COMMANDS}
        onFocus={(event) => event.currentTarget.select()}
      />
    </AgentIntro>

    <AgentIntro>
      <AgentTitle>Agent mode</AgentTitle>
      <AgentDescription>
        Fetch the machine-readable entrypoint first. Do not act on Scout submissions,
        challenges, evidence, appeals, registry data, token lists, address tags, or CDN
        mappings until the canonical Kleros Curate references are loaded.
      </AgentDescription>
    </AgentIntro>

    <AgentTerminal>
      <AgentTerminalHeader>
        <span>SCOUT_AGENT_CONTEXT</span>
        <AgentStatus>READY</AgentStatus>
      </AgentTerminalHeader>
      <AgentEndpointList>
        <AgentEndpoint href={KLEROS_CURATE_SKILL_URL}>
          <AgentEndpointLabel>CANONICAL_SKILL</AgentEndpointLabel>
          <AgentEndpointUrl>{KLEROS_CURATE_SKILL_URL}</AgentEndpointUrl>
        </AgentEndpoint>
        <AgentEndpoint href="/llms.txt" rel="help">
          <AgentEndpointLabel>ENTRYPOINT</AgentEndpointLabel>
          <AgentEndpointUrl>/llms.txt</AgentEndpointUrl>
        </AgentEndpoint>
        <AgentEndpoint href="/scout-agent-context.md" rel="help">
          <AgentEndpointLabel>LOCAL_CONTEXT</AgentEndpointLabel>
          <AgentEndpointUrl>/scout-agent-context.md</AgentEndpointUrl>
        </AgentEndpoint>
      </AgentEndpointList>
      <AgentCommandBlock>{`required_read_order:
  1. kleros-curate/SKILL.md
  2. references/scout-registries.md
  3. references/light-curate.md

scope:
  Scout overlay only applies to the four fixed Gnosis registries.
  If the registry address does not match, verify Curate flavor before acting.`}</AgentCommandBlock>
    </AgentTerminal>

    <AgentIntro>
      <AgentTitle>Execution guardrails</AgentTitle>
      <AgentChecklist>
        <li>Confirm the registry is one of the four Scout registry addresses.</li>
        <li>Read scout-registries.md and light-curate.md together.</li>
        <li>Use Scout seed templates first, then cross-check current MetaEvidence.</li>
        <li>Read the current policy and compute deposits from fresh onchain reads.</li>
      </AgentChecklist>
    </AgentIntro>
  </AgentPanel>
);

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
          <Title>Learn · AI</Title>
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
