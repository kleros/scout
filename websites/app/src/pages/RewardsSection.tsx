import React from 'react';
import styled, { css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { landscapeStyle } from 'styles/landscapeStyle';
import { hoverShortTransitionTiming } from 'styles/commonStyles';

interface StatBoxProps {
  borderLeft?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}

const Section = styled.section`
  background-color: black;
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #CD9DFF;
  width: 80%;
  font-size: 20px;
  font-family: "Open Sans", sans-serif;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(1, minmax(0px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  
  ${landscapeStyle(
  () => css`
      grid-template-columns: repeat(5, minmax(0px, 1fr));
    `
)}
`;

const Title = styled.h2`
  font-size: 2rem;
  font-weight: 500;
  font-family: "Open Sans", sans-serif;
`;

const StatBox = styled.div<StatBoxProps>`
  text-align: center;
  cursor: ${props => props.onClick ? 'pointer' : 'default'};
  transform: scale(1);
  ${hoverShortTransitionTiming}
  
  &:hover {
    transform: ${props => props.onClick ? 'scale(1.02)' : 'scale(1)'};
  }
  
  ${landscapeStyle(
    () => css`
      ${props => props.borderLeft && 'border-left: 1px solid #fff;'}
    `
  )}
`;

const StatNumber = styled.p`
  font-size: 40px;
  font-weight: bold;
  color: #9C46FF;
  margin-bottom: 0;
  font-family: "Open Sans", sans-serif;
`;

const StatLabel = styled.p`
  font-size: 16px;
  color: white;
`;

const Divider = styled.hr`
  border-color: white;
`;

const Text = styled.p`
  color: white;
`;

const List = styled.ul`
  list-style-type: disc;
  list-style-position: inside;
  color: white;
`;

const ClickableListItem = styled.li`
  cursor: pointer;
  ${hoverShortTransitionTiming}
  
  &:hover {
    transform: scale(1.02);
    color: #9C46FF;
  }
`;

const FormulaBox = styled.div`
  background-color: #000000;
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #5A2393;
  word-break: break-all;
  display: flex;

  ${landscapeStyle(
    () => css`
      word-break: normal;
    `
  )}

`;

const FormulaText = styled.p`
  color: #CD9DFF;
  padding: 0 1rem;
  border-right: 1px solid white;
`;

const Formula = styled.p`
  color: #E87B35;
  padding: 0 1rem;
`;

const FormulaSpan = styled.span`
  color: #fff;
`;

const RewardSection: React.FC = () => {
  const navigate = useNavigate();

  const navigateToTokens = () => {
    navigate('/registry/Tokens?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1');
  };

  const navigateToAddressTags = () => {
    navigate('/registry/Single_Tags?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1');
  };

  const navigateToCDN = () => {
    navigate('/registry/CDN?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1');
  };

  const navigateToRewards = () => {
    navigate('/registry/Tokens?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1');
  };

  return (
    <Section>
      <Grid>
        <Title>Reward Pool & Avg. Rewards</Title>
        <StatBox borderLeft={true} onClick={navigateToRewards}>
          <StatNumber>300k PNK</StatNumber>
          <StatLabel>MONTHLY REWARD POOL</StatLabel>
        </StatBox>
        <StatBox onClick={navigateToRewards}>
          <StatNumber>618</StatNumber>
          <StatLabel>AVG. MONTHLY SUBMISSIONS</StatLabel>
        </StatBox>
        <StatBox onClick={navigateToRewards}>
          <StatNumber>$12</StatNumber>
          <StatLabel>AVG. REWARD PER SUBMISSION</StatLabel>
        </StatBox>
        <StatBox onClick={navigateToRewards}>
          <StatNumber>$40</StatNumber>
          <StatLabel>AVG. REWARD PER CHALLENGE</StatLabel>
        </StatBox>
      </Grid>
      <Divider />
      <div>
        <Title>Contribute to Kleros Scout and earn rewards!</Title>
        <Text>
          The reward pool consists of 300,000 PNK (~$4300 as of March 23rd, 2025). Here is how the
          reward pool is allocated to the three registries across different chains.
        </Text>
        <List>
          <ClickableListItem onClick={navigateToTokens}>Tokens (93,000 PNK for submissions, 7,000 PNK for removals)</ClickableListItem>
          <ClickableListItem onClick={navigateToAddressTags}>Address Tags Registry (93,000 PNK for submissions, 7,000 PNK for removals)</ClickableListItem>
          <ClickableListItem onClick={navigateToCDN}>CDN Registry (93,000 PNK for submissions, 7,000 PNK for removals)</ClickableListItem>
        </List>
      </div>
      <Divider />
      <div>
        <Title>Rewards Calculation</Title>
        <Text>The reward pool was created to incentivise two actions:</Text>
        <List>
          <li>Efforts/submissions towards more widely-used contract addresses,</li>
          <li>Increased number of submissions.</li>
        </List>
        <FormulaBox>
          <FormulaText>The calculation of rewards will look like this</FormulaText>
          <Formula>
            reward per submission<FormulaSpan> = </FormulaSpan>
            reward_pool<FormulaSpan> * ((1 / (2 * </FormulaSpan>total_submissions<FormulaSpan>)) + (</FormulaSpan>
            txns_with_contract<FormulaSpan> / (2 * </FormulaSpan>total_txns_with_all_contracts<FormulaSpan>)))</FormulaSpan>
          </Formula>
        </FormulaBox>
        <Text>Points to note:</Text>
        <List>
          <li>There is a 1000 PNK cap on reward per submission.</li>
          <li>
            Contracts from 8 chains qualify for rewards. They are: <br />
            Solana, Base Mainnet, Scroll, zkSync, Avalance C-Chain, Gnosis Chain, Celo, Fantom.
          </li>
          <li>For the latest news about incentives, check our{" "}
            <a href="https://blog.kleros.io/" target="_blank" rel="noopener noreferrer">Blog</a> or{" "}
            <a href="https://t.me/KlerosCurate" target="_blank" rel="noopener noreferrer">Telegram channel</a></li>
        </List>
      </div>
    </Section>
  );
};

export default RewardSection;
