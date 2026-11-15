import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { fadeIn as fadeInUp } from 'styles/commonStyles';
import { getChainIcon } from 'utils/chainIcons';
import { chains } from 'utils/chains';

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
  font-size: 14px;
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
  /* In a narrow card the count moves under the name rather than squeezing the name out. */
  flex-wrap: wrap;
  row-gap: 4px;
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
  flex: 1 1 150px;
  min-width: 0;
`;

const ChainName = styled.span`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
`;

const NoIcon = styled.span`
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.stroke};
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
  flex-shrink: 0;
  margin-left: auto;
  padding-left: 8px;
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  color: ${({ theme }) => theme.secondaryText};

  ${landscapeStyle(
    () => css`
      font-size: 16px;
    `
  )}
`;

/** "Ethereum", "Base", "Arbitrum One": the chain list's name without a trailing "Mainnet". */
export const getChainDisplayName = (chainId: string): string => {
  const chain = chains.find((c) => c.id === chainId);
  return chain ? chain.name.replace(/ Mainnet$/, '') : `Chain ${chainId}`;
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
  /** Chain reference as in the chains list: "1", "137", "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp"... */
  chainId: string;
  items: number;
}

interface ChainRankingProps {
  data: ChainData[];
}

export const ChainRanking: React.FC<ChainRankingProps> = ({ data }) => {
  const rankedData = useMemo(() =>
    data.map(item => ({
      ...item,
      name: getChainDisplayName(item.chainId),
      Icon: getChainIcon(item.chainId),
      ordinal: `${item.rank}${getOrdinalSuffix(item.rank)}`,
      formattedItems: `${item.items.toLocaleString()} ${item.items === 1 ? 'item' : 'items'}`
    })),
    [data]
  );

  return (
    <Container>
      <Title>Chain Ranking (Last 30 Days)</Title>
      <RankingList>
        {rankedData.map((item) => (
          <RankingItem key={item.chainId} title={`${item.name}: ${item.formattedItems}`}>
            <LeftSide>
              <RankPosition>{item.ordinal}</RankPosition>
              <ChainIcon aria-hidden="true">
                {item.Icon ? <item.Icon focusable="false" /> : <NoIcon />}
              </ChainIcon>
              <ChainName>{item.name}</ChainName>
            </LeftSide>
            <ItemCount>{item.formattedItems}</ItemCount>
          </RankingItem>
        ))}
      </RankingList>
    </Container>
  );
};