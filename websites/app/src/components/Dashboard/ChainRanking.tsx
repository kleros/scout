import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { fadeIn as fadeInUp } from 'styles/commonStyles';

import EthereumIcon from 'svgs/chains/ethereum.svg';
import PolygonIcon from 'svgs/chains/polygon.svg';
import ArbitrumIcon from 'svgs/chains/arbitrum.svg';
import OptimismIcon from 'svgs/chains/optimism.svg';
import BaseIcon from 'svgs/chains/base.svg';

const Container = styled.div`
  padding: 12px;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  background: transparent;
  box-shadow: ${({ theme }) => theme.shadowCard};
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  animation: ${fadeInUp} 0.6s ease-out;
  width: 100%;
  height: 100%;

  ${landscapeStyle(
    () => css`
      padding: 24px;
      border-radius: 16px;
    `
  )}

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.glowPurple};
  }
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.secondaryBlue};
  font-family: "Open Sans";
  font-size: 14px;
  font-style: italic;
  font-weight: 400;
  line-height: normal;
  margin: 0 0 12px 0;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      margin: 0 0 20px 0;
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
  padding: 12px 0;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};

  ${landscapeStyle(
    () => css`
      padding: 16px 0;
      font-size: 16px;
    `
  )}

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.hoverBackground};
  }
`;

const LeftSide = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;

  ${landscapeStyle(
    () => css`
      gap: 16px;
    `
  )}
`;

const RankPosition = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};
  min-width: 24px;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      min-width: 32px;
    `
  )}
`;

const ChainIcon = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;

  ${landscapeStyle(
    () => css`
      width: 32px;
      height: 32px;
    `
  )}

  svg {
    width: 100%;
    height: 100%;
  }
`;

const ItemCount = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${({ theme }) => theme.secondaryText};

  ${landscapeStyle(
    () => css`
      font-size: 16px;
    `
  )}
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