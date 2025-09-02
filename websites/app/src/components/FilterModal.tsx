import React, { useCallback, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useSearchParams } from 'react-router-dom';
import { chains } from 'utils/chains';
import { useFocusOutside } from 'hooks/useFocusOutside';
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
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 50;
`;

const ModalWrapper = styled.div`
  position: relative;
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  border-radius: 20px;

  &:before {
    content: '';
    position: absolute;
    inset: 0;
    padding: 1px;
    border-radius: 20px;
    background: linear-gradient(180deg, #7186FF90 0%, #BEBEC590 100%);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
            mask-composite: exclude;
    pointer-events: none;
  }
`;

const ModalContainer = styled.div`
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(153, 153, 153, 0.08) 100%
  );
  backdrop-filter: blur(50px);
  border-radius: 20px;
  border: 1px solid rgba(113, 134, 255, 0.3);
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
  border-bottom: 1px solid rgba(113, 134, 255, 0.3);
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

const CheckboxItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.2s;
  
  &:hover {
    color: ${({ theme }) => theme.accent};
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

const NetworkItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${({ theme }) => theme.primaryText};
  font-size: 14px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: ${({ theme }) => theme.lightGrey};
    color: ${({ theme }) => theme.accent};
  }
  
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
  border-top: 1px solid rgba(113, 134, 255, 0.3);
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
  
  ${({ variant = 'secondary', theme }) => variant === 'primary' 
    ? `
      background: ${theme.accent};
      color: ${theme.lightBackground};
      border-color: ${theme.accent};
      
      &:hover {
        background: ${theme.primary};
        border-color: ${theme.primary};
      }
    `
    : `
      background: transparent;
      color: ${theme.accent};
      border-color: ${theme.accent};
      
      &:hover {
        background: ${theme.lightGrey};
        color: ${theme.primaryText};
      }
    `
  }
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
    const statuses = searchParams.getAll('status');
    // For Activity page with userAddress, default to all statuses if none selected
    // For Registries page without userAddress, use what's in URL or empty array
    return userAddress && statuses.length === 0 ? REGISTRATION_STATUSES : statuses;
  }, [searchParams, userAddress]);

  const disputedValues = useMemo(() => {
    const disputed = searchParams.getAll('disputed');
    // For Activity page with userAddress, default to all values if none selected
    // For Registries page without userAddress, use what's in URL or empty array
    return userAddress && disputed.length === 0 ? ['true', 'false'] : disputed;
  }, [searchParams, userAddress]);

  const orderDirection = useMemo(() => searchParams.get('orderDirection') || 'desc', [searchParams]);

  const handleStatusChange = useCallback((status: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (registrationStatuses.includes(status)) {
        newParams.delete('status', status);
      } else {
        newParams.append('status', status);
      }
      newParams.set('page', '1');
      // Maintain userAddress filter if present
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, registrationStatuses, userAddress]);

  const handleDisputedChange = useCallback((disputed: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (disputedValues.includes(disputed)) {
        newParams.delete('disputed', disputed);
      } else {
        newParams.append('disputed', disputed);
      }
      newParams.set('page', '1');
      // Maintain userAddress filter if present
      if (userAddress) {
        newParams.set('userAddress', userAddress);
      }
      return newParams;
    }, { replace: true });
  }, [setSearchParams, disputedValues, userAddress]);

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

  const availableChains = useMemo(() => {
    return chains.filter(chain => !chain.deprecated);
  }, []);

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
                <FilterGroupTitle>
                  <FiltersIcon />
                  Verification Status
                </FilterGroupTitle>
                <CheckboxGroup>
                  {REGISTRATION_STATUSES.map((status) => (
                    <CheckboxItem key={status}>
                      <Checkbox
                        checked={registrationStatuses.includes(status)}
                        onChange={() => handleStatusChange(status)}
                      />
                      <StatusCircle status={status} />
                      {STATUS_LABELS[status]}
                    </CheckboxItem>
                  ))}
                </CheckboxGroup>
              </FilterGroup>
            </FilterColumn>

            <FilterColumn>
              <FilterGroup>
                <FilterGroupTitle>
                  <FiltersIcon />
                  Challenge Status
                </FilterGroupTitle>
                <CheckboxGroup>
                  {CHALLENGE_STATUSES.map((challenge) => (
                    <CheckboxItem key={challenge.value}>
                      <Checkbox
                        checked={disputedValues.includes(challenge.value)}
                        onChange={() => handleDisputedChange(challenge.value)}
                      />
                      <StatusCircle status={challenge.value} />
                      {challenge.label}
                    </CheckboxItem>
                  ))}
                </CheckboxGroup>
              </FilterGroup>
            </FilterColumn>
          </SectionGrid>
        </FilterSection>

        <FilterSection>
          <SectionTitle>
            <FiltersIcon />
            Networks
          </SectionTitle>
          <NetworkGrid>
            {availableChains.map((chain) => {
              const ChainIcon = getChainIcon(chain.id);
              return (
                <NetworkItem key={chain.id}>
                  <Checkbox
                    checked={chainFilters.includes(chain.id)}
                    onChange={() => handleNetworkChange(chain.id)}
                  />
                  {ChainIcon && <ChainIcon />}
                  {chain.name}
                </NetworkItem>
              );
            })}
            <NetworkItem>
              <Checkbox
                checked={chainFilters.includes('unknown')}
                onChange={() => handleNetworkChange('unknown')}
              />
              Unknown chains
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
          <Button onClick={onClose}>Close</Button>
        </FooterButtons>
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  );
};

export default FilterModal;