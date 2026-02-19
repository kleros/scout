import React, { useCallback, useMemo, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useFilters, DateRangeOption, DATE_RANGE_PRESETS } from 'context/FilterContext';
import { landscapeStyle } from 'styles/landscapeStyle';
import { chains } from 'utils/chains';
import { useFocusOutside } from 'hooks/useFocusOutside';
import { ModalButton } from './ModalButtons';
import Checkbox from './Checkbox';
import RadioButton from './RadioButton';
import DateRangeCalendar from './DateRangeCalendar';
import FiltersIcon from 'svgs/icons/filters.svg';
import SortIcon from 'svgs/icons/sort.svg';
import CalendarIcon from 'svgs/icons/calendar.svg';
import { getChainIcon } from 'utils/chainIcons';
import {
  ModalOverlay,
  ModalWrapper,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
  FilterSection,
  FilterGroup,
  GroupHeader,
  FilterGroupTitle,
  ActionButton,
  CheckboxGroup,
  CheckboxItem,
  CheckboxLabel,
  OnlyButton,
  NetworkGrid,
  NetworkItem,
  NetworkLabel,
  FooterButtons,
  DateRangeOptions,
  DateRangeChip,
} from './ModalComponents';

const SortBySectionTitle = styled(FilterGroupTitle)`
  margin-bottom: 4px;
`

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;

  ${landscapeStyle(
    () => css`
      grid-template-columns: 1fr 1fr;
    `
  )}
`;

const FilterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StatusCircle = styled.div<{ status: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ status, theme }) => {
    switch (status) {
      case 'Registered': return theme.statusIncluded;
      case 'RegistrationRequested': return theme.statusRegistrationRequested;
      case 'ClearingRequested': return theme.statusClearingRequested;
      case 'Absent': return theme.statusAbsent;
      case 'true': return theme.statusChallenged;
      case 'false': return theme.statusIncluded;
      case 'previously-disputed': return theme.statusPreviouslyDisputed;
      default: return theme.statusGray;
    }
  }};
`;

const SortOptions = styled.div`
  display: flex;
  gap: 16px;
`;

const SortOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  cursor: pointer;
`;

const STATUS_LABELS: Record<string, string> = {
  'Registered': 'Included',
  'RegistrationRequested': 'Registration Requested',
  'ClearingRequested': 'Removal Requested',
  'Absent': 'Removed / Rejected',
};

const REGISTRATION_STATUSES = Object.keys(STATUS_LABELS);

const CHALLENGE_STATUSES = [
  { value: 'true', label: 'Challenged' },
  { value: 'false', label: 'Unchallenged' }
];

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainFilters: string[];
  onChainFiltersChange: (chains: string[]) => void;
  scope: 'registry' | 'profile';
}

const FilterModal: React.FC<FilterModalProps> = ({
  isOpen,
  onClose,
  chainFilters,
  onChainFiltersChange,
  scope,
}) => {
  const filters = useFilters(scope);
  const modalRef = useRef<HTMLDivElement>(null);

  useFocusOutside(modalRef, () => onClose());

  const handleStatusChange = useCallback((status: string) => {
    filters.toggleStatus(status);
  }, [filters]);

  const handleDisputedChange = useCallback((disputed: string) => {
    filters.toggleDisputed(disputed);
  }, [filters]);

  const handleNetworkChange = useCallback((networkId: string) => {
    const newChainFilters = chainFilters.includes(networkId)
      ? chainFilters.filter(id => id !== networkId)
      : [...chainFilters, networkId];
    onChainFiltersChange(newChainFilters);
  }, [chainFilters, onChainFiltersChange]);

  const handleOrderDirectionChange = useCallback((direction: string) => {
    filters.setOrderDirection(direction);
  }, [filters]);

  const handleStatusOnly = useCallback((selectedStatus: string) => {
    filters.setStatus([selectedStatus]);
  }, [filters]);

  const handleStatusAll = useCallback(() => {
    filters.setStatus(REGISTRATION_STATUSES);
  }, [filters]);

  const handleDisputedOnly = useCallback((selectedDisputed: string) => {
    filters.setChallengeFilters([selectedDisputed], false);
  }, [filters]);

  const handleDisputedAll = useCallback(() => {
    filters.setChallengeFilters(CHALLENGE_STATUSES.map(c => c.value), false);
  }, [filters]);

  const handlePreviouslyDisputedOnly = useCallback(() => {
    filters.setChallengeFilters(['false'], true);
  }, [filters]);

  const handleNetworkOnly = useCallback((selectedNetworkId: string) => {
    onChainFiltersChange([selectedNetworkId]);
  }, [onChainFiltersChange]);

  const handleDateRangeChange = useCallback((range: DateRangeOption) => {
    filters.setDateRange(range);
  }, [filters]);

  const handleCustomDateChange = useCallback((from: string | null, to: string | null) => {
    filters.setCustomDateRange(from, to);
  }, [filters]);

  const availableChains = useMemo(() => {
    return chains.filter(chain => !chain.deprecated);
  }, []);

  const handleNetworkAll = useCallback(() => {
    const allChainIds = [...availableChains.map(chain => chain.id), 'unknown'];
    onChainFiltersChange(allChainIds);
  }, [onChainFiltersChange, availableChains]);

  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalWrapper>
        <ModalContainer ref={modalRef}>
        <ModalHeader>
          <ModalTitle>Filters</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <FilterSection>
          <SectionGrid>
            <FilterColumn>
              <FilterGroup>
                <GroupHeader>
                  <FilterGroupTitle>
                    <FiltersIcon />
                    Verification Status
                  </FilterGroupTitle>
                  <ActionButton onClick={handleStatusAll}>
                    All
                  </ActionButton>
                </GroupHeader>
                <CheckboxGroup>
                  {REGISTRATION_STATUSES.map((status) => (
                    <CheckboxItem key={status}>
                      <CheckboxLabel>
                        <Checkbox
                          checked={filters.status.includes(status)}
                          onChange={() => handleStatusChange(status)}
                        />
                        <StatusCircle status={status} />
                        {STATUS_LABELS[status]}
                      </CheckboxLabel>
                      <OnlyButton
                        className="only-button"
                        onClick={() => handleStatusOnly(status)}
                        type="button"
                      >
                        Only
                      </OnlyButton>
                    </CheckboxItem>
                  ))}
                </CheckboxGroup>
              </FilterGroup>
            </FilterColumn>

            <FilterColumn>
              <FilterGroup>
                <GroupHeader>
                  <FilterGroupTitle>
                    <FiltersIcon />
                    Challenge Status
                  </FilterGroupTitle>
                  <ActionButton onClick={handleDisputedAll}>
                    All
                  </ActionButton>
                </GroupHeader>
                <CheckboxGroup>
                  {CHALLENGE_STATUSES.map((challenge) => {
                    const isLockedOn = challenge.value === 'false' && filters.hasEverBeenDisputed;
                    return (
                      <CheckboxItem key={challenge.value}>
                        <CheckboxLabel style={isLockedOn ? { opacity: 0.5 } : undefined}>
                          <Checkbox
                            checked={filters.disputed.includes(challenge.value)}
                            onChange={() => handleDisputedChange(challenge.value)}
                            disabled={isLockedOn}
                          />
                          <StatusCircle status={challenge.value} />
                          {challenge.label}
                        </CheckboxLabel>
                        {!isLockedOn && (
                          <OnlyButton
                            className="only-button"
                            onClick={() => handleDisputedOnly(challenge.value)}
                            type="button"
                          >
                            Only
                          </OnlyButton>
                        )}
                      </CheckboxItem>
                    );
                  })}
                  <CheckboxItem>
                    <CheckboxLabel>
                      <Checkbox
                        checked={filters.hasEverBeenDisputed}
                        onChange={() => filters.toggleHasEverBeenDisputed()}
                      />
                      <StatusCircle status="previously-disputed" />
                      Previously Challenged
                    </CheckboxLabel>
                    <OnlyButton
                      className="only-button"
                      onClick={() => handlePreviouslyDisputedOnly()}
                      type="button"
                    >
                      Only
                    </OnlyButton>
                  </CheckboxItem>
                </CheckboxGroup>
              </FilterGroup>

              <FilterGroup style={{ marginTop: '8px' }}>
                <SortBySectionTitle>
                  <SortIcon />
                  Sort by
                </SortBySectionTitle>
                <SortOptions>
                  <SortOption>
                    <RadioButton
                      name="sort"
                      value="desc"
                      checked={filters.orderDirection === 'desc'}
                      onChange={() => handleOrderDirectionChange('desc')}
                    />
                    Newest
                  </SortOption>
                  <SortOption>
                    <RadioButton
                      name="sort"
                      value="asc"
                      checked={filters.orderDirection === 'asc'}
                      onChange={() => handleOrderDirectionChange('asc')}
                    />
                    Oldest
                  </SortOption>
                </SortOptions>
              </FilterGroup>
            </FilterColumn>
          </SectionGrid>
        </FilterSection>

        <FilterSection>
          <GroupHeader>
            <FilterGroupTitle>
              <CalendarIcon />
              Date Range
            </FilterGroupTitle>
            {filters.dateRange !== 'all' && (
              <ActionButton onClick={() => filters.setDateRange('all')}>
                Reset
              </ActionButton>
            )}
          </GroupHeader>
          <DateRangeOptions>
            {DATE_RANGE_PRESETS.map((preset) => (
              <DateRangeChip
                key={preset.value}
                $isSelected={filters.dateRange === preset.value}
                onClick={() => handleDateRangeChange(preset.value)}
              >
                {preset.label}
              </DateRangeChip>
            ))}
          </DateRangeOptions>
          {filters.dateRange === 'custom' && (
            <DateRangeCalendar
              from={filters.customDateFrom}
              to={filters.customDateTo}
              onChange={handleCustomDateChange}
            />
          )}
        </FilterSection>

        <FilterSection>
          <GroupHeader>
            <FilterGroupTitle>
              <FiltersIcon />
              Networks
            </FilterGroupTitle>
            <ActionButton onClick={handleNetworkAll}>
              All
            </ActionButton>
          </GroupHeader>
          <NetworkGrid>
            {availableChains.map((chain) => {
              const ChainIcon = getChainIcon(chain.id);
              return (
                <NetworkItem key={chain.id}>
                  <NetworkLabel>
                    <Checkbox
                      checked={chainFilters.includes(chain.id)}
                      onChange={() => handleNetworkChange(chain.id)}
                    />
                    {ChainIcon && <ChainIcon />}
                    {chain.name}
                  </NetworkLabel>
                  <OnlyButton
                    className="only-button"
                    onClick={() => handleNetworkOnly(chain.id)}
                    type="button"
                  >
                    Only
                  </OnlyButton>
                </NetworkItem>
              );
            })}
            <NetworkItem>
              <NetworkLabel>
                <Checkbox
                  checked={chainFilters.includes('unknown')}
                  onChange={() => handleNetworkChange('unknown')}
                />
                Unknown chains
              </NetworkLabel>
              <OnlyButton
                className="only-button"
                onClick={() => handleNetworkOnly('unknown')}
                type="button"
              >
                Only
              </OnlyButton>
            </NetworkItem>
          </NetworkGrid>
        </FilterSection>

        <FooterButtons>
          <ModalButton variant="secondary" onClick={onClose}>Close</ModalButton>
        </FooterButtons>
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  );
};

export default FilterModal;
