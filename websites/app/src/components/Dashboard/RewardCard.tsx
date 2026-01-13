import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';
import { hoverShortTransitionTiming } from 'styles/commonStyles';
import { landscapeStyle } from 'styles/landscapeStyle';

export const RewardCard = styled(Link)`
  position: relative;
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding: 16px;
  justify-content: space-between;
  background: transparent;
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transform: scale(1);
  ${hoverShortTransitionTiming}
  min-height: 200px;
  width: 100%;
  min-width: 0;
  text-decoration: none;
  color: inherit;

  ${landscapeStyle(
    () => css`
      padding: 24px;
      min-height: 240px;
    `
  )}

  &:hover {
    transform: scale(1.02);
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.15);
  }
`;

export const RewardCardNewBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 8px;
  background: linear-gradient(270deg, #0E1E75 0%, #432D77 100%);
  color: var(--Secondary-blue, #7186FF);
  font-family: "Open Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  border-radius: 3px;
  padding: 6px 16px;
  z-index: 1;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10);
`;

export const RewardCardTitle = styled.h2`
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 6px 0;
  line-height: 1.5;
  color: ${({ theme }) => theme.primaryText};
  word-wrap: break-word;
  overflow-wrap: break-word;

  ${landscapeStyle(
    () => css`
      font-size: 16px;
      margin: 0 0 8px 0;
    `
  )}
`;

export const RewardCardDescription = styled.p`
  margin: 0 0 16px 0;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 13px;
  line-height: 1.4;
  word-wrap: break-word;
  overflow-wrap: break-word;

  ${landscapeStyle(
    () => css`
      margin: 0 0 24px 0;
      font-size: 14px;
    `
  )}
`;

export const RewardCardDetailRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 10px;
  color: ${({ theme }) => theme.secondaryBlue};

  ${landscapeStyle(
    () => css`
      font-size: 14px;
      margin-bottom: 12px;
    `
  )}

  svg {
    min-width: 16px;
    min-height: 16px;
    width: 16px;
    height: 16px;
    flex-shrink: 0;

    path {
      fill: ${({ theme }) => theme.secondaryBlue};
    }
  }
`;

export const RewardCardTopSection = styled.div`
  display: flex;
  flex-direction: column;
`;

export const RewardCardBottomSection = styled.div`
  display: flex;
  flex-direction: column;
`;
