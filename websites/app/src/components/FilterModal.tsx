import React, { useCallback, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useSearchParams } from 'react-router-dom';
import { chains } from 'utils/chains';
import { useFocusOutside } from 'hooks/useFocusOutside';
import { ModalButton } from './ModalButtons';
import FiltersIcon from 'svgs/icons/filters.svg';
import SortIcon from 'svgs/icons/sort.svg';

import EthereumIcon from 'svgs/chains/ethereum.svg';
import SolanaIcon from 'svgs/chains/solana.svg';
import BaseIcon from 'svgs/chains/base.svg';
import CeloIcon from 'svgs/chains/celo.svg';
import ScrollIcon from 'svgs/chains/scroll.svg';
import FantomIcon from 'svgs/chains/fantom.svg';
import ZkSyncIcon from 'svgs/chains/zksync.svg';
import GnosisIcon from 'svgs/chains/gnosis.svg';
import PolygonIcon from 'svgs/chains/polygon.svg';
import OptimismIcon from 'svgs/chains/optimism.svg';
import ArbitrumIcon from 'svgs/chains/arbitrum.svg';
import AvalancheIcon from 'svgs/chains/avalanche.svg';
import BnbIcon from 'svgs/chains/bnb.svg';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
`;

const ModalWrapper = styled.div`
  position: relative;
  width: 90vw;
  max-width: 900px;
  max-height: 90vh;
  border-radius: 20px;
`;

const ModalContainer = styled.div`
  background: ${({ theme }) => theme.modalBackground};
  backdrop-filter: blur(50px);
  border-radius: 20px;
  border: 1px solid ${({ theme }) => theme.stroke};
  width: 100%;
  height: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  position: relative;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid ${({ theme }) => theme.stroke};
  padding-bottom: 20px;
`;

const ModalTitle = styled.h2`
  color: ${({ theme }) => theme.primaryText};
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryText};
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
  
  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  color: ${({ theme }) => theme.primaryText};
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  padding-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 16px;
    height: 16px;
    fill: ${({ theme }) => theme.primaryText};
  }
`;

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const FilterColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterGroupTitle = styled.h4`
  color: ${({ theme }) => theme.accent};
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  padding-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  svg {
    width: 14px;
    height: 14px;
    fill: ${({ theme }) => theme.accent};
  }
`;

const CheckboxGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const GroupHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.accent};
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0.7;

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
    opacity: 1;
  }
`;

const CheckboxItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  padding: 4px 0;
  transition: color 0.2s;

  &:hover {
    color: ${({ theme }) => theme.accent};

    .only-button {
      opacity: 1;
    }
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;
`;

const OnlyButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.accent};
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s;
  opacity: 0;

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
  }
`;

const StatusCircle = styled.div<{ status: string }>`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${({ status }) => {
    switch (status) {
      case 'Registered': return '#22c55e'; // green for included
      case 'RegistrationRequested': return '#eab308'; // yellow for registration requested
      case 'ClearingRequested': return '#f97316'; // orange for removal requested
      case 'Absent': return '#ef4444'; // red for removed
      case 'true': return '#ef4444'; // red for challenged
      case 'false': return '#22c55e'; // green for unchallenged
      default: return '#6b7280'; // gray for default
    }
  }};
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.accent};
`;

const NetworkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-top: 8px;
`;

const NetworkItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  padding: 6px 8px;
  border-radius: 8px;
  transition: all 0.2s;

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
    color: ${({ theme }) => theme.accent};

    .only-button {
      opacity: 1;
    }
  }
`;

const NetworkLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  flex: 1;

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`;

const SortSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const SortOptions = styled.div`
  display: flex;
  gap: 16px;
`;

const SortOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  cursor: pointer;
`;

const RadioButton = styled.input.attrs({ type: 'radio' })`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.accent};
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid ${({ theme }) => theme.stroke};
`;

const STATUS_LABELS = {
  'Registered': 'Included',
  'RegistrationRequested': 'Registration Requested',
  'ClearingRequested': 'Removal Requested',
  'Absent': 'Removed'
};

const REGISTRATION_STATUSES = Object.keys(STATUS_LABELS);

const CHALLENGE_STATUSES = [
  { value: 'true', label: 'Challenged' },
  { value: 'false', label: 'Unchallenged' }
];

// Chain icon mapping
const getChainIcon = (chainId: string) => {
  const iconMap = {
    '1': EthereumIcon,
    '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp': SolanaIcon,
    '8453': BaseIcon,
    '42220': CeloIcon,
    '534352': ScrollIcon,
    '250': FantomIcon,
    '324': ZkSyncIcon,
    '100': GnosisIcon,
    '137': PolygonIcon,
    '10': OptimismIcon,
    '42161': ArbitrumIcon,
    '43114': AvalancheIcon,
    '56': BnbIcon,
  };
  return iconMap[chainId] || null;
};

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainFilters: string[];
  onChainFiltersChange: (chains: string[]) => void;
  userAddress?: string;
}

const FilterModal: React.FC<FilterModalProps> = ({ 
  isOpen, 
  onClose, 
  chainFilters, 
  onChainFiltersChange,
  userAddress
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const modalRef = useRef<HTMLDivElement>(null);
  
  useFocusOutside(modalRef, () => onClose());

  const registrationStatuses = useMemo(() => {
    return searchParams.getAll('status');
  }, [searchParams]);

  const disputedValues = useMemo(() => {
    return searchParams.getAll('disputed');
  }, [searchParams]);

  const orderDirection = useMemo(() => searchParams.get('orderDirection') || 'desc', [searchParams]);

  const handleStatusChange = useCallback((status: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      const currentStatuses = newParams.getAll('status');
      
      if (currentStatuses.includes(status)) {
        // Remove this status - rebuild the list without it
        newParams.delete('status');
        currentStatuses.filter(s => s !== status).forEach(s => newParams.append('status', s));
      } else {
        // Add this status
        newParams.append('status', status);
      }
      
      newParams.set('page', '1');
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, userAddress]);

  const handleDisputedChange = useCallback((disputed: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      const currentDisputed = newParams.getAll('disputed');
      
      if (currentDisputed.includes(disputed)) {
        // Remove this disputed value - rebuild the list without it
        newParams.delete('disputed');
        currentDisputed.filter(d => d !== disputed).forEach(d => newParams.append('disputed', d));
      } else {
        // Add this disputed value
        newParams.append('disputed', disputed);
      }
      
      newParams.set('page', '1');
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, userAddress]);

  const handleNetworkChange = useCallback((networkId: string) => {
    const newChainFilters = chainFilters.includes(networkId)
      ? chainFilters.filter(id => id !== networkId)
      : [...chainFilters, networkId];
    onChainFiltersChange(newChainFilters);
  }, [chainFilters, onChainFiltersChange]);

  const handleOrderDirectionChange = useCallback((direction: string) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.set('orderDirection', direction);
      newParams.set('page', '1');
      // Maintain userAddress filter if present
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    });
  }, [setSearchParams, userAddress]);

  const handleStatusOnly = useCallback((selectedStatus: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('status');
      newParams.append('status', selectedStatus);
      newParams.set('page', '1');
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, userAddress]);

  const handleStatusAll = useCallback(() => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('status');
      REGISTRATION_STATUSES.forEach(status => newParams.append('status', status));
      newParams.set('page', '1');
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, userAddress]);

  const handleDisputedOnly = useCallback((selectedDisputed: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('disputed');
      newParams.append('disputed', selectedDisputed);
      newParams.set('page', '1');
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, userAddress]);

  const handleDisputedAll = useCallback(() => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('disputed');
      CHALLENGE_STATUSES.forEach(challenge => newParams.append('disputed', challenge.value));
      newParams.set('page', '1');
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, userAddress]);

  const handleNetworkOnly = useCallback((selectedNetworkId: string) => {
    onChainFiltersChange([selectedNetworkId]);
  }, [onChainFiltersChange]);

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
                          checked={registrationStatuses.includes(status)}
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
                  {CHALLENGE_STATUSES.map((challenge) => (
                    <CheckboxItem key={challenge.value}>
                      <CheckboxLabel>
                        <Checkbox
                          checked={disputedValues.includes(challenge.value)}
                          onChange={() => handleDisputedChange(challenge.value)}
                        />
                        <StatusCircle status={challenge.value} />
                        {challenge.label}
                      </CheckboxLabel>
                      <OnlyButton
                        className="only-button"
                        onClick={() => handleDisputedOnly(challenge.value)}
                        type="button"
                      >
                        Only
                      </OnlyButton>
                    </CheckboxItem>
                  ))}
                </CheckboxGroup>
              </FilterGroup>
            </FilterColumn>
          </SectionGrid>
        </FilterSection>

        <FilterSection>
          <GroupHeader>
            <SectionTitle>
              <FiltersIcon />
              Networks
            </SectionTitle>
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

        <SortSection>
          <SectionTitle>
            <SortIcon />
            Sort by
          </SectionTitle>
          <SortOptions>
            <SortOption>
              <RadioButton
                name="sort"
                value="desc"
                checked={orderDirection === 'desc'}
                onChange={() => handleOrderDirectionChange('desc')}
              />
              Newest
            </SortOption>
            <SortOption>
              <RadioButton
                name="sort"
                value="asc"
                checked={orderDirection === 'asc'}
                onChange={() => handleOrderDirectionChange('asc')}
              />
              Oldest
            </SortOption>
          </SortOptions>
        </SortSection>

        <FooterButtons>
          <ModalButton variant="secondary" onClick={onClose}>Close</ModalButton>
        </FooterButtons>
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  );
};

export default FilterModal;