import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import ArrowRightIcon from 'svgs/icons/arrow.svg';

const Card = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding: 16px;
  background: transparent;
  box-shadow: ${({ theme }) => theme.shadowCard};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: ${({ theme }) => theme.glowBlue};
    border-color: ${({ theme }) => theme.secondaryBlue}4D;
  }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
`;

const Title = styled.h4`
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: ${({ theme }) => theme.primaryText};
  letter-spacing: -0.2px;
  line-height: 1.2;
`;

const MainValue = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${({ theme }) => theme.primaryText};
  margin-bottom: 4px;
  letter-spacing: -0.5px;
`;

const SecondaryValue = styled.div`
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  margin-bottom: 16px;
  opacity: 0.8;
`;

const OpenButton = styled(Link)`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: transparent;
  color: ${({ theme }) => theme.primaryText};
  border: 1px solid ${({ theme }) => theme.buttonSecondaryBorder};
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: auto;
  text-decoration: none;

  svg {
    width: 12px;
    height: 12px;

    path {
      fill: currentColor;
    }
  }

  &:hover {
    background: ${({ theme }) => theme.hoverBackground};
    border-color: ${({ theme }) => theme.primaryText};
  }

  &:active {
    background: ${({ theme }) => theme.activeBackground};
  }
`;

interface RegistryCardProps {
  icon?: React.ReactNode;
  title: string;
  mainValue: string | number | React.ReactNode;
  secondaryValue: string;
  registryKey: string;
  className?: string;
  style?: React.CSSProperties;
}

export const RegistryCard: React.FC<RegistryCardProps> = ({
  title,
  mainValue,
  secondaryValue,
  registryKey,
  className,
  style
}) => {
  const formattedMainValue = typeof mainValue === 'number' ? mainValue.toLocaleString() :
                         typeof mainValue === 'string' ? mainValue : mainValue;

  return (
    <Card className={className} style={style}>
      <Header>
        <Title>{title}</Title>
      </Header>
      <MainValue>{formattedMainValue}</MainValue>
      <SecondaryValue>{secondaryValue}</SecondaryValue>
      <OpenButton to={`/${registryKey}`}>
        Open
        <ArrowRightIcon />
      </OpenButton>
    </Card>
  );
};