import React, { useMemo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';

import EthereumIcon from 'svgs/chains/ethereum.svg';
import PolygonIcon from 'svgs/chains/polygon.svg';
import ArbitrumIcon from 'svgs/chains/arbitrum.svg';
import OptimismIcon from 'svgs/chains/optimism.svg';
import BaseIcon from 'svgs/chains/base.svg';

const fadeInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Container = styled.div`
  padding: 16px;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${fadeInUp} 0.6s ease-out;
  
  ${landscapeStyle(
    () => css`
      padding: 24px;
    `
  )}
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0px 8px 32px rgba(125, 75, 255, 0.1);
  }
`;

const Title = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
  margin: 0 0 16px 0;
  letter-spacing: -0.3px;
  background: linear-gradient(135deg, #7d4bff 0%, #485fff 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;

  ${landscapeStyle(
    () => css`
      font-size: 18px;
      margin-bottom: 24px;
    `
  )}
`;

const RankingList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0;
`;

const RankingItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 0;
  font-size: 16px;
  color: ${({ theme }) => theme.secondaryText};
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
`;

const LeftSide = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const RankPosition = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};
  min-width: 32px;
`;

const ChainIcon = styled.div`
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  
  svg {
    width: 100%;
    height: 100%;
  }
`;

const ItemCount = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};
`;

type ChainName = 'ethereum' | 'polygon' | 'arbitrum' | 'optimism' | 'base';

const CHAIN_ICONS = {
  ethereum: <EthereumIcon />,
  polygon: <PolygonIcon />,
  arbitrum: <ArbitrumIcon />,
  optimism: <OptimismIcon />,
  base: <BaseIcon />,
} as const;

const getChainIcon = (chainName: string) => {
  return CHAIN_ICONS[chainName as ChainName] || CHAIN_ICONS.ethereum;
};

const getOrdinalSuffix = (rank: number): string => {
  if (rank >= 11 && rank <= 13) return 'th';
  const lastDigit = rank % 10;
  switch (lastDigit) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

interface ChainData {
  rank: number;
  chain: string;
  items: number;
}

interface ChainRankingProps {
  data: ChainData[];
}

export const ChainRanking: React.FC<ChainRankingProps> = ({ data }) => {
  const rankedData = useMemo(() => 
    data.map(item => ({
      ...item,
      ordinal: `${item.rank}${getOrdinalSuffix(item.rank)}`,
      formattedItems: `${item.items.toLocaleString()} items`
    })),
    [data]
  );

  return (
    <Container>
      <Title>Chain Ranking (Last 30 Days)</Title>
      <RankingList>
        {rankedData.map((item) => (
          <RankingItem key={item.chain}>
            <LeftSide>
              <RankPosition>{item.ordinal}</RankPosition>
              <ChainIcon>
                {getChainIcon(item.chain)}
              </ChainIcon>
            </LeftSide>
            <ItemCount>{item.formattedItems}</ItemCount>
          </RankingItem>
        ))}
      </RankingList>
    </Container>
  );
};