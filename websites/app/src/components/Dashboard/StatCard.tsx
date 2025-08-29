import React, { useMemo } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { landscapeStyle } from 'styles/landscapeStyle';

const shimmer = keyframes`
  0% {
    background-position: -468px 0;
  }
  100% {
    background-position: 468px 0;
  }
`;

const Card = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  padding: clamp(16px, 3vw, 24px);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(153, 153, 153, 0.08) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0px 8px 32px rgba(125, 75, 255, 0.15);
    border-color: rgba(125, 75, 255, 0.3);
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
      rgba(125, 75, 255, 0.1),
      transparent
    );
    animation: ${shimmer} 2s infinite;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover::before {
    opacity: 1;
  }
  
  ${landscapeStyle(
    () => css`
      min-width: clamp(250px, 30vw, 300px);
    `
  )}

  @media (max-width: 768px) {
    min-width: unset;
    padding: 16px;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: clamp(12px, 2vw, 16px);
  margin-bottom: clamp(12px, 2vh, 16px);

  svg {
    min-width: clamp(40px, 6vw, 48px);
    min-height: clamp(40px, 6vw, 48px);
    width: clamp(40px, 6vw, 48px);
    height: clamp(40px, 6vw, 48px);
    flex-shrink: 0;
    
    path, circle {
      fill: ${({ theme }) => theme.primary};
    }
  }
`;

const Title = styled.h3`
  font-size: clamp(14px, 2.5vw, 16px);
  font-weight: 600;
  margin: 0;
  color: ${({ theme }) => theme.primaryText};
  letter-spacing: -0.2px;
  line-height: 1.2;

  @media (max-width: 768px) {
    font-size: 14px;
  }
`;

const MainValue = styled.div`
  font-size: clamp(24px, 4vw, 32px);
  font-weight: 700;
  color: ${({ theme }) => theme.primaryText};
  margin-bottom: clamp(6px, 1vh, 8px);
  letter-spacing: -1px;
  transition: all 0.3s ease;

  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const ChangeIndicator = styled.div<{ positive?: boolean }>`
  display: flex;
  align-items: center;
  font-size: clamp(12px, 2vw, 14px);
  color: ${({ theme, positive }) => 
    positive ? theme.successText || SUCCESS_COLOR : theme.secondaryText};
  font-weight: 500;
  transition: all 0.3s ease;
  
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

  @media (max-width: 768px) {
    font-size: 12px;
  }
`;

const SecondaryValue = styled.div`
  font-size: clamp(12px, 2vw, 14px);
  color: ${({ theme }) => theme.secondaryText};
  margin-top: clamp(6px, 1vh, 8px);
  opacity: 0.8;
  transition: opacity 0.3s ease;

  @media (max-width: 768px) {
    font-size: 12px;
  }
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
const SUCCESS_COLOR = '#22c55e';

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