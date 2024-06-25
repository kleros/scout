import React from 'react';
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'

interface StatBoxProps {
    borderLeft?: boolean;
    children: React.ReactNode;
}

const Section = styled.section`
  background-color: black;
  padding: 1.5rem;
  border-radius: 0.5rem;
  border: 1px solid #CD9DFF;
  width: 80%;
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
  font-weight: bold;
  margin-bottom: 1rem;
`;

const StatBox = styled.div<StatBoxProps>`
  text-align: center;
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
`;

const StatLabel = styled.p`
  font-size: 16px;
  color: white;
`;

const Divider = styled.hr`
  border-color: white;
  margin-bottom: 1.5rem;
`;

const Text = styled.p`
  font-size: 24px;
  color: white;
  margin-top: 0.5rem;
`;

const List = styled.ul`
  list-style-type: disc;
  list-style-position: inside;
  margin-top: 0.5rem;
  font-size: 24px;
  color: white;
`;

const FormulaBox = styled.div`
  background-color: #161616;
  padding: 1rem;
  margin-top: 1rem;
  border-radius: 0.5rem;
  border: 1px solid #5A2393;
  word-break: break-all;
  display: flex;
  font-size: 24px;
  font-family: "Oxanium", sans-serif;

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

const RewardSection: React.FC = () => (
    <Section>
        <Grid>
            <Title>Reward Pool & Avg. Rewards</Title>
            <StatBox borderLeft={true}>
                <StatNumber>$8000</StatNumber>
                <StatLabel>MONTHLY REWARD POOL</StatLabel>
            </StatBox>
            <StatBox>
                <StatNumber>618</StatNumber>
                <StatLabel>AVG. MONTHLY SUBMISSION</StatLabel>
            </StatBox>
            <StatBox>
                <StatNumber>$15</StatNumber>
                <StatLabel>AVG. REWARD PER SUBMISSION</StatLabel>
            </StatBox>
            <StatBox>
                <StatNumber>$40</StatNumber>
                <StatLabel>AVG. REWARD PER CHALLENGE</StatLabel>
            </StatBox>
        </Grid>
        <Divider />
        <div>
            <Title>Contribute to Kleros Scout and earn rewards!</Title>
            <Text>
                The reward pool consists of 300,000 PNK (~$5300 as of February 1, 2024) for submitters. Here is how the
                reward pool is allocated to the three registries across different chains.
            </Text>
            <List>
                <li>Tokens (100,000 PNK)</li>
                <li>Address Tags Registry (100,000 PNK)</li>
                <li>CDN Registry (100,000 PNK)</li>
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
                    reward per submission = (1/2*(reward_pool/total_submissions )) +
                    (1/2*(txns_with_contract*total_txns_with_all_contracts))
                </Formula>
            </FormulaBox>
            <Text>Points to note:</Text>
            <List>
                <li>There is a 1000 PNK cap on reward per submission.</li>
                <li>
                    Contracts from 10 chains qualify for rewards. They are: <br />
                    Ethereum Mainnet, Arbitrum One, Optimism, Binance Smart Chain, zkSync, Avalance C-Chain, Gnosis Chain, Celo, Base Mainnet, Fantom Opera.
                </li>
            </List>
        </div>
    </Section>
);

export default RewardSection;