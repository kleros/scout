import React from 'react';
import styled from 'styled-components';
import { hoverLongTransitionTiming } from 'styles/commonStyles';

const Button = styled.button`
  ${hoverLongTransitionTiming}
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #FFFFFF0D;
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding: 8px 16px;
  height: 40px;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  gap: 8px;
  white-space: nowrap;

  &:hover {
    background-color: #FFFFFF1D;
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
    <rect x="0" y="2" width="16" height="2" rx="1"/>
    <rect x="0" y="7" width="12" height="2" rx="1"/>
    <rect x="0" y="12" width="8" height="2" rx="1"/>
  </svg>
);

interface FilterButtonProps {
  onClick: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ onClick }) => {
  return (
    <Button onClick={onClick}>
      <FilterIcon />
      Filters
    </Button>
  );
};

export default FilterButton;