import React, { useCallback, useId, useMemo, useRef } from 'react';
import styled, { css } from 'styled-components';
import { useFilters, DateRangeOption, DATE_RANGE_PRESETS, ALL_NETWORK_FILTERS, getActiveFilterCount } from 'context/FilterContext';
import { landscapeStyle } from 'styles/landscapeStyle';
import { chains } from 'utils/chains';
import { useFocusOutside } from 'hooks/useFocusOutside';
import { useLockOverlayScroll } from 'hooks/useLockOverlayScroll';
import { useDialog } from 'hooks/useDialog';
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
  min-height: 24px;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 14px;
  cursor: pointer;
`;

const ResetButton = styled(ModalButton)`
  margin-right: auto;
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

/** The registry lists order and filter by resolution time when only resolved statuses are shown. */
const RESOLVED_STATUSES = ['Registered', 'Absent'];

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
  const { ref: modalRef, dialogProps } = useDialog<HTMLDivElement>(isOpen, onClose);
  const idPrefix = useId().replace(/:/g, '');
  const ids = {
    title: `${idPrefix}-title`,
    status: `${idPrefix}-status`,
    challenge: `${idPrefix}-challenge`,
    sort: `${idPrefix}-sort`,
    date: `${idPrefix}-date`,
    networks: `${idPrefix}-networks`,
  };

  useFocusOutside(modalRef, onClose);
  useLockOverlayScroll(isOpen);

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
    onChainFiltersChange(ALL_NETWORK_FILTERS);
  }, [onChainFiltersChange]);

  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const handleReset = useCallback(() => {
    filters.resetFilters();
    onChainFiltersChange(ALL_NETWORK_FILTERS);
    // The Reset button goes away with nothing left to reset: keep focus in the footer.
    closeButtonRef.current?.focus();
  }, [filters, onChainFiltersChange]);

  if (!isOpen) return null;

  // Say which date the sort and the date range use (useItemsQuery picks it the same way).
  const usesResolutionDate =
    scope === 'registry' &&
    filters.status.length > 0 &&
    filters.status.every((s) => RESOLVED_STATUSES.includes(s));
  const dateKind = usesResolutionDate ? 'resolution' : 'submission';
  const hasChangedFilters =
    getActiveFilterCount(filters, chainFilters) > 0 || filters.orderDirection !== 'desc';

  return (
    <ModalOverlay>
      <ModalWrapper>
        <ModalContainer {...dialogProps} aria-labelledby={ids.title}>
        <ModalHeader>
          <ModalTitle id={ids.title}>Filters</ModalTitle>
          <CloseButton aria-label="Close filters" onClick={onClose}>
            <span aria-hidden="true">×</span>
          </CloseButton>
        </ModalHeader>

        <FilterSection>
          <SectionGrid>
            <FilterColumn>
              <FilterGroup>
                <GroupHeader>
                  <FilterGroupTitle as="h3" id={ids.status}>
                    <FiltersIcon />
                    Verification status
                  </FilterGroupTitle>
                  <ActionButton aria-label="All verification statuses" onClick={handleStatusAll}>
                    All
                  </ActionButton>
                </GroupHeader>
                <CheckboxGroup role="group" aria-labelledby={ids.status}>
                  {REGISTRATION_STATUSES.map((status) => (
                    <CheckboxItem key={status}>
                      <CheckboxLabel>
                        <Checkbox
                          checked={filters.status.includes(status)}
                          onChange={() => handleStatusChange(status)}
                        />
                        <StatusCircle status={status} aria-hidden="true" />
                        {STATUS_LABELS[status]}
                      </CheckboxLabel>
                      <OnlyButton
                        className="only-button"
                        onClick={() => handleStatusOnly(status)}
                        type="button"
                        aria-label={`Only ${STATUS_LABELS[status]}`}
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
                  <FilterGroupTitle as="h3" id={ids.challenge}>
                    <FiltersIcon />
                    Challenge status
                  </FilterGroupTitle>
                  <ActionButton aria-label="All challenge statuses" onClick={handleDisputedAll}>
                    All
                  </ActionButton>
                </GroupHeader>
                <CheckboxGroup role="group" aria-labelledby={ids.challenge}>
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
                          <StatusCircle status={challenge.value} aria-hidden="true" />
                          {challenge.label}
                        </CheckboxLabel>
                        {!isLockedOn && (
                          <OnlyButton
                            className="only-button"
                            onClick={() => handleDisputedOnly(challenge.value)}
                            type="button"
                            aria-label={`Only ${challenge.label}`}
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
                      <StatusCircle status="previously-disputed" aria-hidden="true" />
                      Previously Challenged
                    </CheckboxLabel>
                    <OnlyButton
                      className="only-button"
                      onClick={() => handlePreviouslyDisputedOnly()}
                      type="button"
                      aria-label="Only Previously Challenged"
                    >
                      Only
                    </OnlyButton>
                  </CheckboxItem>
                </CheckboxGroup>
              </FilterGroup>

              <FilterGroup style={{ marginTop: '8px' }}>
                <SortBySectionTitle as="h3" id={ids.sort}>
                  <SortIcon />
                  {`Sort by ${dateKind} date`}
                </SortBySectionTitle>
                <SortOptions role="radiogroup" aria-labelledby={ids.sort}>
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
            <FilterGroupTitle as="h3" id={ids.date}>
              <CalendarIcon />
              {usesResolutionDate ? 'Resolution date' : 'Submission date'}
            </FilterGroupTitle>
            {filters.dateRange !== 'all' && (
              <ActionButton aria-label="Reset date range" onClick={() => filters.setDateRange('all')}>
                Reset
              </ActionButton>
            )}
          </GroupHeader>
          <DateRangeOptions role="group" aria-labelledby={ids.date}>
            {DATE_RANGE_PRESETS.map((preset) => (
              <DateRangeChip
                key={preset.value}
                type="button"
                aria-pressed={filters.dateRange === preset.value}
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
            <FilterGroupTitle as="h3" id={ids.networks}>
              <FiltersIcon />
              Networks
            </FilterGroupTitle>
            <ActionButton aria-label="All networks" onClick={handleNetworkAll}>
              All
            </ActionButton>
          </GroupHeader>
          <NetworkGrid role="group" aria-labelledby={ids.networks}>
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
                    aria-label={`Only ${chain.name}`}
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
                aria-label="Only Unknown chains"
              >
                Only
              </OnlyButton>
            </NetworkItem>
          </NetworkGrid>
        </FilterSection>

        <FooterButtons>
          {hasChangedFilters && (
            <ResetButton type="button" variant="secondary" onClick={handleReset}>
              Reset filters
            </ResetButton>
          )}
          <ModalButton ref={closeButtonRef} type="button" variant="secondary" onClick={onClose}>Close</ModalButton>
        </FooterButtons>
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  );
};

export default FilterModal;
