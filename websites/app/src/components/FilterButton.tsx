import React from 'react';
import styled from 'styled-components';
import { hoverLongTransitionTiming } from 'styles/commonStyles';
import FiltersIcon from 'svgs/icons/filters.svg';

const Button = styled.button<{ $active: boolean }>`
  ${hoverLongTransitionTiming}
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${({ theme }) => theme.subtleBackground};
  border-radius: 9999px;
  border: 1px solid ${({ $active, theme }) => ($active ? theme.secondaryBlue : theme.stroke)};
  padding: 8px 16px;
  height: 40px;
  color: ${({ $active, theme }) => ($active ? theme.primaryText : theme.secondaryText)};
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

const Count = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 9999px;
  background: ${({ theme }) => theme.secondaryBlue};
  color: ${({ theme }) => theme.black};
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
`;

interface FilterButtonProps {
  onClick: () => void;
  /** How many filter groups differ from their defaults; shown on the button when above 0. */
  activeCount?: number;
}

const FilterButton: React.FC<FilterButtonProps> = ({ onClick, activeCount = 0 }) => {
  const active = activeCount > 0;
  return (
    <Button type="button" onClick={onClick} aria-haspopup="dialog" $active={active}>
      <FiltersIcon />
      Filters
      {active ? (
        <>
          <Count aria-hidden="true">{activeCount}</Count>
          <span className="visually-hidden">
            {`, ${activeCount} ${activeCount === 1 ? 'filter' : 'filters'} applied`}
          </span>
        </>
      ) : null}
    </Button>
  );
};

export default FilterButton;
