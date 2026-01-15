import React from 'react';
import styled from 'styled-components';
import { Link } from 'react-router-dom';
import { shortenAddress } from 'utils/shortenAddress';
import ArrowIcon from 'assets/svgs/icons/arrow.svg';

const StyledSubmittedByLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: inherit;
  text-decoration: none;
  transition: all 0.2s ease;
  border-radius: 4px;
  padding: 2px 4px;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    
    svg {
      transform: translateX(2px);
    }
  }
  
  svg {
    width: 14px;
    height: 14px;
    transition: transform 0.2s ease;
    opacity: 0.7;
    
    path {
      fill: currentColor;
    }
  }
`;

interface SubmittedByLinkProps {
  address: string;
  className?: string;
}

const SubmittedByLink: React.FC<SubmittedByLinkProps> = ({ address, className }) => {
  const shortenedAddress = shortenAddress(address);
  
  return (
    <StyledSubmittedByLink
      to={`/profile?userAddress=${address}`}
      className={className}
    >
      {shortenedAddress}
      <ArrowIcon />
    </StyledSubmittedByLink>
  );
};

export default SubmittedByLink;