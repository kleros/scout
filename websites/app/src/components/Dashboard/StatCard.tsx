import React, { useMemo } from 'react';
import styled, { css } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';
import { shimmer } from 'styles/commonStyles';

const Card = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding: 10px 12px;
  background: transparent;
  box-shadow: ${({ theme }) => theme.shadowCard};
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  margin-bottom: 8px;

  ${landscapeStyle(
    () => css`
      padding: 14px 16px;
      border-radius: 12px;
      margin-bottom: 8px;
    `
  )}

  &:last-child {
    margin-bottom: 0;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.glowPurple};
    border-color: ${({ theme }) => theme.primaryPurple}4D;
  }

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent,
      ${({ theme }) => theme.primaryPurple}1A,
      transparent
    );
    animation: ${shimmer} 2s infinite;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;

  ${landscapeStyle(
    () => css`
      gap: 10px;
      margin-bottom: 8px;
    `
  )}

  svg {
    min-width: 24px;
    min-height: 24px;
    width: 24px;
    height: 24px;
    flex-shrink: 0;

    ${landscapeStyle(
      () => css`
        min-width: 32px;
        min-height: 32px;
        width: 32px;
        height: 32px;
      `
    )}

    path, circle {
      fill: ${({ theme }) => theme.primary};
    }
  }
`;

const Title = styled.h3`
  color: ${({ theme }) => theme.secondaryText};
  font-family: "Open Sans";
  font-size: 14px;
  font-style: normal;
  font-weight: 400;
  line-height: normal;
  margin: 0;
`;

const MainValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ theme }) => theme.primaryText};
  margin-bottom: 2px;
  letter-spacing: -0.5px;
  transition: all 0.3s ease;

  ${landscapeStyle(
    () => css`
      font-size: 24px;
      margin-bottom: 4px;
    `
  )}
`;

const ChangeIndicator = styled.div<{ positive?: boolean }>`
  display: flex;
  align-items: center;
  font-size: 12px;
  color: ${({ theme, positive }) =>
    positive ? theme.success : theme.secondaryText};
  font-weight: 500;
  transition: all 0.3s ease;
  
  ${landscapeStyle(
    () => css`
      font-size: 14px;
    `
  )}
  
  &::before {
    content: '▲';
    margin-right: 4px;
    font-size: 10px;
    transition: transform 0.3s ease;
    ${({ positive }) => !positive && css`
      content: '▼';
      transform: rotate(180deg);
    `}
  }

  &:hover {
    transform: scale(1.05);
  }
`;

const SecondaryValue = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  margin-top: 4px;
  opacity: 0.8;
  transition: opacity 0.3s ease;

  ${landscapeStyle(
    () => css`
      font-size: 13px;
      margin-top: 4px;
    `
  )}
`;

interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  mainValue: string | number | React.ReactNode;
  changeValue?: number | React.ReactNode;
  changeLabel?: string;
  secondaryValue?: string;
  className?: string;
  style?: React.CSSProperties;
}

const DEFAULT_CHANGE_LABEL = '(all time)';

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  title,
  mainValue,
  changeValue,
  changeLabel = DEFAULT_CHANGE_LABEL,
  secondaryValue,
  className,
  style
}) => {
  const formattedMainValue = useMemo(() => {
    if (typeof mainValue === 'number' || typeof mainValue === 'string') {
      return mainValue.toLocaleString();
    }
    return mainValue;
  }, [mainValue]);

  const changeDisplay = useMemo(() => {
    if (changeValue === undefined) return null;
    
    const isPositive = typeof changeValue === 'number' ? changeValue >= 0 : true;
    const displayValue = typeof changeValue === 'number' 
      ? `${Math.abs(changeValue).toLocaleString()} ${changeLabel}`
      : changeValue;
    
    return { isPositive, displayValue };
  }, [changeValue, changeLabel]);

  return (
    <Card className={className} style={style}>
      <Header>
        {icon}
        <Title>{title}</Title>
      </Header>
      <MainValue>
        {formattedMainValue}
      </MainValue>
      {changeDisplay && (
        <ChangeIndicator positive={changeDisplay.isPositive}>
          {changeDisplay.displayValue}
        </ChangeIndicator>
      )}
      {secondaryValue && (
        <SecondaryValue>{secondaryValue}</SecondaryValue>
      )}
    </Card>
  );
};