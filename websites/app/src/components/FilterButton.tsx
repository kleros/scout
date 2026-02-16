import React from 'react';
import styled from 'styled-components';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
import FiltersIcon from 'svgs/icons/filters.svg';

const Button = styled.button`
  ${hoverLongTransitionTiming}
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.subtleBackground};
  border-radius: 9999px;
  border: 1px solid ${({ theme }) => theme.stroke};
  padding: 8px 16px;
  height: 40px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  gap: 8px;
  white-space: nowrap;
  flex-shrink: 0;

  &:hover {
    background-color: ${({ theme }) => theme.hoverBackground};
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