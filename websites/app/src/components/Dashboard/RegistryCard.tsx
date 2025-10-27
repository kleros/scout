import React from 'react';
import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import ArrowRightIcon from 'svgs/icons/arrow.svg';

const Card = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  padding: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%);
  box-shadow: 0px 1px 2px 0px rgba(0, 0, 0, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(10px);
  position: relative;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0px 8px 24px rgba(125, 75, 255, 0.12);
    border-color: rgba(125, 75, 255, 0.3);
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

const OpenButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 16px;
  background: ${({ theme }) => theme.buttonWhite};
  color: ${({ theme }) => theme.black};
  border: none;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: auto;

  svg {
    width: 12px;
    height: 12px;

    path {
      fill: currentColor;
    }
  }

  &:hover {
    background: ${({ theme }) => theme.buttonWhiteHover};
  }

  &:active {
    background: ${({ theme }) => theme.buttonWhiteActive};
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
  icon,
  title,
  mainValue,
  secondaryValue,
  registryKey,
  className,
  style
}) => {
  const navigate = useNavigate();
  
  const handleOpenClick = () => {
    navigate(`/registry/${registryKey}?status=Registered&status=ClearingRequested&status=RegistrationRequested&disputed=false&disputed=true&page=1`);
  };

  const formattedMainValue = typeof mainValue === 'number' ? mainValue.toLocaleString() : 
                         typeof mainValue === 'string' ? mainValue : mainValue;

  return (
    <Card className={className} style={style}>
      <Header>
        <Title>{title}</Title>
      </Header>
      <MainValue>{formattedMainValue}</MainValue>
      <SecondaryValue>{secondaryValue}</SecondaryValue>
      <OpenButton onClick={handleOpenClick}>
        Open
        <ArrowRightIcon />
      </OpenButton>
    </Card>
  );
};