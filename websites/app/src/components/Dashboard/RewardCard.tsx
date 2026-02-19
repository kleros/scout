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
  box-shadow: ${({ theme }) => theme.shadowCard};
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
    box-shadow: ${({ theme }) => theme.shadowDropdown};
  }
`;

export const RewardCardNewBadge = styled.div`
  position: absolute;
  top: -12px;
  right: 8px;
  background: ${({ theme }) => theme.gradientBadge};
  color: ${({ theme }) => theme.secondaryBlue};
  font-family: "Open Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 600;
  line-height: normal;
  border-radius: 3px;
  padding: 6px 16px;
  z-index: 1;
  box-shadow: ${({ theme }) => theme.shadowTooltip};
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

export const RewardCardDivider = styled.div`
  height: 1px;
  background: ${({ theme }) => theme.gradientDivider};
  margin-bottom: 12px;
`;

export const RewardCardCalendarValue = styled.label`
  margin-left: auto;
  color: ${({ theme }) => theme.secondaryPurple};
`;

export const RewardCardRewardValue = styled.label`
  margin-left: auto;
  font-size: 24px;
  color: ${({ theme }) => theme.secondaryPurple};
  font-weight: 600;
`;
