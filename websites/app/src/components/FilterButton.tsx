import React from 'react';
import styled from 'styled-components';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
import FiltersIcon from 'svgs/icons/filters.svg';

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
  font-size: 16px;
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

interface FilterButtonProps {
  onClick: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ onClick }) => {
  return (
    <Button onClick={onClick}>
      <FiltersIcon />
      Filters
    </Button>
  );
};

export default FilterButton;