import React, { useCallback, useMemo, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useSearchParams } from 'react-router-dom'
import { relevantNetworks } from 'utils/fetchItems'
import DownDirectionIcon from 'tsx:svgs/icons/down-direction.svg'
import { useFocusOutside } from 'hooks/useFocusOutside'

const FilterContainer = styled.div`
  display: flex;
  flex-direction: row;
  gap: 12px;
`

const DropdownContainer = styled.div`
  display: flex;
  flex-direction: column;
`

const FilterDropdownButton = styled.div<{ open: boolean }>`
  display: flex;
  font-family: 'Oxanium', sans-serif;
  font-size: 18px;
  font-weight: 600;
  align-items: center;
  padding: 0 4px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: linear-gradient(145deg, #7e57c2, #482c85);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`

const FilterDropdownIconWrapper = styled.div<{ open: boolean }>`
  display: flex;
  margin-left: 8px;
  padding-bottom: 4px;
  align-self: center;
  align-items: center;
  transform: ${({ open }) => (open ? 'rotate(-180deg);' : 'rotate(0deg)')};
`

const FilterOptionContainer = styled.div`
  display: flex;
  flex-direction: column;
  background-color: #801fdc;
  margin-top: 30px;
  position: absolute;
  border-radius: 8px;
  z-index: 10;
`

// when selected, has a border, bold and more opacity
const FilterOption = styled.div<{ selected: boolean }>`
  text-align: center;
  font-family: 'Oxanium', sans-serif;
  font-size: 16px;
  padding: 6px;
  font-weight: ${({ selected }) => (selected ? 'bold' : 'normal')};
  opacity: ${({ selected }) => (selected ? '100%' : '60%')};
  cursor: pointer;
  &:hover {
    background: linear-gradient(145deg, #7e57c2, #482c85);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`

// renders right of the dropdown filter
const RemovableFilterContainer = styled.div`
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 8px;
`

const RemovableFilter = styled.div`
  display: flex;
  background-color: #380c65;
  font-family: 'Oxanium', sans-serif;
  font-size: 16px;
  font-weight: 400;
  align-items: center;
  padding: 0 4px;
  border-radius: 6px;
  cursor: pointer;

  &:hover {
    background: linear-gradient(145deg, #7e57c2, #482c85);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
`

const STATUS_LABELS = {
  'Registered': 'Registered',
  'RegistrationRequested': 'Registration Requested',
  'ClearingRequested': 'Removal Requested',
  'Absent': 'Removed'
};

const REGISTRATION_STATUSES = Object.keys(STATUS_LABELS);

const CHALLENGE_STATUSES = [
  { value: 'true', label: 'Challenged' },
  { value: 'false', label: 'Unchallenged' }
];

const useFilterState = (paramName: string): [string[], (value: string) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const values = useMemo(() => searchParams.getAll(paramName), [searchParams, paramName]);

  const toggleValue = useCallback((value: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (values.includes(value)) {
        newParams.delete(paramName, value);
      } else {
        newParams.append(paramName, value);
      }
      newParams.set('page', '1');
      return newParams;
    }, { replace: true });
  }, [setSearchParams, values, paramName]);

  return [values, toggleValue];
};

interface FilterDropdownProps {
  label: string;
  options: Array<{ value: string; label: string }>;
  selectedValues: string[];
  onToggle: (value: string) => void;
}

const FilterDropdown: React.FC<FilterDropdownProps> = React.memo(({ label, options, selectedValues, onToggle }) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useFocusOutside(dropdownRef, () => setOpen(false));

  return (
    <FilterContainer>
      <DropdownContainer ref={dropdownRef}>
        <FilterDropdownButton open={open} onClick={() => setOpen(!open)}>
          {label}
          <FilterDropdownIconWrapper open={open}>
            <DownDirectionIcon />
          </FilterDropdownIconWrapper>
        </FilterDropdownButton>
        {open && (
          <FilterOptionContainer>
            {options.map((option) => (
              <FilterOption
                key={option.value}
                selected={selectedValues.includes(option.value)}
                onClick={() => onToggle(option.value)}
              >
                {option.label}
              </FilterOption>
            ))}
          </FilterOptionContainer>
        )}
      </DropdownContainer>
      <RemovableFilterContainer>
        {selectedValues.length === options.length || selectedValues.length === 0 ? (
          <RemovableFilter>All {label}</RemovableFilter>
        ) : (
          selectedValues.map(value => (
            <RemovableFilter key={value} onClick={() => onToggle(value)}>
              {options.find(o => o.value === value)?.label} ✕
            </RemovableFilter>
          ))
        )}
      </RemovableFilterContainer>
    </FilterContainer>
  );
});

const RegistrationStatus: React.FC = React.memo(() => {
  const [statuses, toggleStatus] = useFilterState('status');
  const options = REGISTRATION_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] }));
  return <FilterDropdown label="Registration Status" options={options} selectedValues={statuses} onToggle={toggleStatus} />;
});

const ChallengeStatus: React.FC = React.memo(() => {
  const [disputedValues, toggleDisputed] = useFilterState('disputed');
  return <FilterDropdown label="Challenge Status" options={CHALLENGE_STATUSES} selectedValues={disputedValues} onToggle={toggleDisputed} />;
});

const Networks: React.FC = React.memo(() => {
  const [networks, toggleNetwork] = useFilterState('network');
  const options = relevantNetworks.map(n => ({ value: String(n.chainId), label: n.name }));
  return <FilterDropdown label="Networks" options={options} selectedValues={networks} onToggle={toggleNetwork} />;
});

const Ordering: React.FC = React.memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  const direction = searchParams.get('orderDirection');

  const toggleDirection = useCallback(() => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('orderDirection', direction === 'desc' ? 'asc' : 'desc');
      newParams.set('page', '1');
      return newParams;
    });
  }, [setSearchParams, direction]);

  return (
    <FilterContainer>
      <DropdownContainer>
        <FilterDropdownButton open={direction === 'desc'} onClick={toggleDirection}>
          {direction === 'desc' ? 'Newest' : 'Oldest'}
          <FilterDropdownIconWrapper open={direction === 'asc'}>
            <DownDirectionIcon />
          </FilterDropdownIconWrapper>
        </FilterDropdownButton>
      </DropdownContainer>
    </FilterContainer>
  );
});

const Container = styled.div`
  display: flex;
  flex-wrap: wrap;
  width: 84vw;
  gap: 20px;
  margin-bottom: ${responsiveSize(24, 28)};

  ${landscapeStyle(
    () => css`
      width: 80%;
    `
  )}
`

const Filters: React.FC = () => {
  return (
    <Container>
      <RegistrationStatus />
      <ChallengeStatus />
      <Networks />
      <Ordering />
    </Container>
  )
}

export default Filters
