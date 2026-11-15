import React, { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { Link } from "react-router-dom";
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from "styles/landscapeStyle";
import { responsiveSize } from "styles/responsiveSize";

import BookCircleIcon from "svgs/icons/book-circle.svg";
import BountiesIcon from "svgs/icons/bounties.svg";
import RewardsIcon from "svgs/icons/rewards.svg";
import DocumentationIcon from "svgs/icons/documentation.svg";
import WarningOutlineIcon from "svgs/icons/warning-outline.svg";
import { hoverShortTransitionTiming } from "styles/commonStyles";
import ScrollTop from "components/ScrollTop";
import { useDocumentTitle } from "hooks/useDocumentTitle";

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

// The cards are real links: reachable by keyboard, and they can be opened in a new tab.
const infoCardStyles = css`
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
  color: inherit;
  text-decoration: none;
  cursor: pointer;

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
    border-color: ${({ theme }) => theme.secondaryBlue};
    box-shadow: ${({ theme }) => theme.shadowDropdown};
  }
`;

const InfoCardLink = styled(Link)`
  ${infoCardStyles}
`;

const InfoCardExternalLink = styled.a`
  ${infoCardStyles}
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

// h2 right under the page's h1 (same look as before).
const SectionHeader = styled.h2`
  font-size: 16px;
  font-weight: 600;
  line-height: 24px;
  margin: 0 0 16px 0;
`;

// A real numbered list: screen readers announce "list, 6 items" and each step's number.
const SectionSteps = styled.ol`
  margin: 0 0 16px 0;
  padding: 0;
  list-style: decimal inside;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FooterText = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: ${({ theme }) => theme.tertiaryText};
`;

const StepItem = styled.li`
  font-size: 14px;
  line-height: 1.4;
  color: ${({ theme }) => theme.secondaryText};
`;

const InlineLink = styled(Link)`
  font-size: inherit;
  color: ${({ theme }) => theme.primaryBlue};
  text-decoration: underline;
  text-underline-offset: 2px;
`;

const AttentionContainer = styled.p`
  display: flex;
  color: ${({ theme }) => theme.tintYellow};
  font-size: 14px;
  line-height: 1.4;
  margin: 0 0 16px 0;
  gap: 8px;

  svg {
    min-width: 16px;
    min-height: 16px;
    width: 16px;
    height: 16px;
    flex-shrink: 0;
    margin-top: 1px;
  }
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
  margin: 0;
  line-height: 1.4;
  color: ${({ theme }) => theme.primaryBlue};
  font-family: ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;
  font-size: 13px;
  font-weight: 700;
  text-transform: uppercase;
`;

const AgentPromptIntro = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.5;
  color: ${({ theme }) => theme.secondaryText};
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

// The 240px basis lets the button wrap under the prompt on phones instead of squeezing it.
const AgentPromptText = styled.code`
  flex: 1 1 240px;
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

const CopyError = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 1.4;
  color: ${({ theme }) => theme.error};
`;

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

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

// The steps describe controls by what they do where their exact labels vary by registry
// ("Submit Token", "Submit Tag"...) or by status, and quote only the fixed ones.
const SIGN_IN_STEP =
  "Tick “I confirm that I have read the Policy.” If Scout asks you to sign in, sign the message in your wallet: it is free and sends no transaction.";

const SubmittingItem = () => (
  <SectionContainer>
    <SectionHeader>Submitting an item</SectionHeader>
    <SectionSteps>
      <StepItem>
        Connect your wallet with “Connect” at the top right (on a phone, in the
        menu). Scout runs on Gnosis Chain, and deposits are paid in xDAI.
      </StepItem>
      <StepItem>
        Open “Registries” in the header (on a phone, in the menu) and choose a
        registry, for example “Tokens”.
      </StepItem>
      <StepItem>
        Open the registry’s “Policy”, above the list, and check that your entry
        meets every rule.
      </StepItem>
      <StepItem>Click “Submit item” and fill in the form.</StepItem>
      <StepItem>{SIGN_IN_STEP}</StepItem>
      <StepItem>
        Press the submit button at the end of the form and confirm the transaction
        in your wallet. It places the deposit that the form shows.
      </StepItem>
    </SectionSteps>
    <AttentionContainer>
      <WarningOutlineIcon aria-hidden="true" />
      <span>
        Attention: if your entry breaks the policy and someone challenges it, you
        can lose your deposit.
      </span>
    </AttentionContainer>
    <FooterText>
      Your deposit comes back when the entry is accepted: after the challenge
      period with no challenge, or by winning a dispute. Check{" "}
      <InlineLink to="/rewards">Active Rewards</InlineLink> to see whether your
      entry also earns a reward.
    </FooterText>
  </SectionContainer>
);

const ChallengingSubmission = () => (
  <SectionContainer>
    <SectionHeader>Challenging a suspicious submission</SectionHeader>
    <SectionSteps>
      <StepItem>
        Connect your wallet with “Connect” at the top right (on a phone, in the
        menu).
      </StepItem>
      <StepItem>
        In a registry, find a pending submission (status “Registration
        Requested”) that breaks the registry’s policy, and open it. You can
        challenge it until its challenge period ends.
      </StepItem>
      <StepItem>Press the challenge button on the entry. It shows the deposit.</StepItem>
      <StepItem>
        Describe what is wrong, for example data that does not match the policy,
        and attach a file if it helps.
      </StepItem>
      <StepItem>{SIGN_IN_STEP}</StepItem>
      <StepItem>
        Press the challenge button at the bottom of the dialog and confirm the
        transaction in your wallet to place the deposit.
      </StepItem>
    </SectionSteps>
    <AttentionContainer>
      <WarningOutlineIcon aria-hidden="true" />
      <span>Attention: if the jurors rule for the submitter, you lose your deposit.</span>
    </AttentionContainer>
    <FooterText>
      If they rule for you, you get your deposit back plus a bounty: the
      submitter’s base deposit, shown next to the entry’s status.
    </FooterText>
  </SectionContainer>
);

const AddingEvidence = () => (
  <SectionContainer>
    <SectionHeader>Adding evidence to a dispute</SectionHeader>
    <SectionSteps>
      <StepItem>
        Connect your wallet, open the challenged entry and go to its “Evidence”
        tab.
      </StepItem>
      <StepItem>
        Fill in the evidence form: a title, a description of your proof and, if
        it helps, a file.
      </StepItem>
      <StepItem>
        Sign in if Scout asks, then submit the evidence and confirm the
        transaction in your wallet. Evidence needs no deposit, only the network
        fee.
      </StepItem>
    </SectionSteps>
  </SectionContainer>
);

type CopyState = "idle" | "copied" | "failed";

const AgentGuide = () => {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<number>();

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const handleCopyAgentPrompt = async () => {
    let copied = false;
    try {
      copied = await copyTextToClipboard(SCOUT_AGENT_PROMPT);
    } catch {
      copied = false;
    }
    window.clearTimeout(resetTimer.current);
    setCopyState(copied ? "copied" : "failed");
    // "Copied" stays long enough to be seen, then the button reads "Copy prompt" again.
    if (copied) resetTimer.current = window.setTimeout(() => setCopyState("idle"), 2000);
  };

  return (
    <AgentPanel>
      <AgentPromptCard>
        <AgentPromptHeader>
          <AgentPromptTitle as="h2">Give your AI agent the Scout skill</AgentPromptTitle>
          <AgentPromptMeta>One line · works in any agent</AgentPromptMeta>
        </AgentPromptHeader>
        <AgentPromptIntro>
          A skill is a set of instructions an AI agent reads before it acts. This
          line sends your agent to Scout’s agent guide, which has it load the
          Kleros Curate skill and Scout’s registry rules before it submits,
          challenges or analyzes registry entries.
        </AgentPromptIntro>

        <AgentPromptRow>
          <AgentPromptText>
            <AgentPromptMarker aria-hidden="true">&gt;</AgentPromptMarker>
            <span>{SCOUT_AGENT_PROMPT}</span>
          </AgentPromptText>
          <AgentCopyButton
            type="button"
            data-agent-instructions-url={SCOUT_AGENT_ENTRY_URL}
            data-agent-prompt={SCOUT_AGENT_PROMPT}
            onClick={handleCopyAgentPrompt}
          >
            {copyState === "copied" ? <CheckIcon /> : <CopyIcon />}
            {copyState === "copied" ? "Copied" : "Copy prompt"}
          </AgentCopyButton>
        </AgentPromptRow>
        <span className="visually-hidden" aria-live="polite">
          {copyState === "copied" ? "Prompt copied to the clipboard." : ""}
        </span>
        {copyState === "failed" && (
          <CopyError role="alert">
            The prompt could not be copied. Select the text and copy it instead.
          </CopyError>
        )}
      </AgentPromptCard>
    </AgentPanel>
  );
};

const QuickGuidePage: React.FC = () => {
  const [audience, setAudience] = useState<'human' | 'agent'>('human');
  useDocumentTitle("Guide & Skills");

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

      <AudienceSelector role="group" aria-label="Choose guide audience">
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
            <AddingEvidence />
          </Frame>

          <CardRow>
            {/* Tokens: the registry with the most pending submissions, each listed with its bounty. */}
            <InfoCardLink to="/tokens">
              <BountiesIcon aria-hidden="true" />
              <CardTitleAndDescription>
                <CardTitle>Bounties</CardTitle>
                <CardDescription>
                  Find and challenge suspicious submissions. If you win the challenge,
                  you'll always earn a bounty!
                </CardDescription>
              </CardTitleAndDescription>
            </InfoCardLink>
            <InfoCardLink to="/rewards">
              <RewardsIcon aria-hidden="true" />
              <CardTitleAndDescription>
                <CardTitle>Rewards</CardTitle>
                <CardDescription>
                  Explore active reward plans and submit compliant items to earn
                  rewards.
                </CardDescription>
              </CardTitleAndDescription>
            </InfoCardLink>
          </CardRow>

          <InfoCardExternalLink
            href="https://docs.kleros.io/products/scout"
            target="_blank"
            rel="noopener noreferrer"
          >
            <DocumentationIcon aria-hidden="true" />
            <CardTitleAndDescription>
              <CardTitle>Documentation</CardTitle>
              <CardDescription>
                For more details check the full documentation.
                <span className="visually-hidden"> (opens in a new tab)</span>
              </CardDescription>
            </CardTitleAndDescription>
          </InfoCardExternalLink>
        </>
      )}
    </Container>
  );
};

export default QuickGuidePage;
