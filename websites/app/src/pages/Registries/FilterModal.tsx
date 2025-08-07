import React, { useCallback, useMemo, useRef } from 'react';
import styled from 'styled-components';
import { useSearchParams } from 'react-router-dom';
import { chains } from 'utils/chains';
import { useFocusOutside } from 'hooks/useFocusOutside';

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

const ModalContainer = styled.div`
  background: #cd9eff1a;
  backdrop-filter: blur(50px);
  border: 2px solid #CD9DFF;
  border-radius: 16px;
  width: 90vw;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 32px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #CD9DFF40;
  padding-bottom: 20px;
`;

const ModalTitle = styled.h2`
  color: white;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: #CD9DFF;
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
  
  &:hover {
    color: white;
  }
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const SectionTitle = styled.h3`
  color: white;
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  padding-bottom: 4px;
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
  color: #CD9DFF;
  font-size: 14px;
  font-weight: 600;
  margin: 0;
  padding-bottom: 8px;
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
  color: white;
  font-size: 14px;
  cursor: pointer;
  padding: 4px 0;
  transition: color 0.2s;
  
  &:hover {
    color: #CD9DFF;
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: #CD9DFF;
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
  color: white;
  font-size: 14px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 8px;
  transition: all 0.2s;
  
  &:hover {
    background: #CD9DFF20;
    color: #CD9DFF;
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
  color: white;
  font-size: 14px;
  cursor: pointer;
`;

const RadioButton = styled.input.attrs({ type: 'radio' })`
  width: 16px;
  height: 16px;
  accent-color: #CD9DFF;
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #CD9DFF40;
`;

const Button = styled.button<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
  
  ${({ variant = 'secondary' }) => variant === 'primary' 
    ? `
      background: #CD9DFF;
      color: #1a1a2e;
      border-color: #CD9DFF;
      
      &:hover {
        background: #b88ae6;
        border-color: #b88ae6;
      }
    `
    : `
      background: transparent;
      color: #CD9DFF;
      border-color: #CD9DFF;
      
      &:hover {
        background: #CD9DFF20;
        color: white;
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

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainFilters: string[];
  onChainFiltersChange: (chains: string[]) => void;
}

const FilterModal: React.FC<FilterModalProps> = ({ 
  isOpen, 
  onClose, 
  chainFilters, 
  onChainFiltersChange 
}) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const modalRef = useRef<HTMLDivElement>(null);
  
  useFocusOutside(modalRef, () => onClose());

  const registrationStatuses = useMemo(() => searchParams.getAll('status'), [searchParams]);
  const disputedValues = useMemo(() => searchParams.getAll('disputed'), [searchParams]);
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
      return newParams;
    }, { replace: true });
  }, [setSearchParams, registrationStatuses]);

  const handleDisputedChange = useCallback((disputed: string) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      if (disputedValues.includes(disputed)) {
        newParams.delete('disputed', disputed);
      } else {
        newParams.append('disputed', disputed);
      }
      newParams.set('page', '1');
      return newParams;
    }, { replace: true });
  }, [setSearchParams, disputedValues]);

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
      return newParams;
    });
  }, [setSearchParams]);

  const availableChains = useMemo(() => {
    return chains.filter(chain => !chain.deprecated);
  }, []);

  if (!isOpen) return null;

  return (
    <ModalOverlay>
      <ModalContainer ref={modalRef}>
        <ModalHeader>
          <ModalTitle>Filters</ModalTitle>
          <CloseButton onClick={onClose}>×</CloseButton>
        </ModalHeader>

        <FilterSection>
          <SectionGrid>
            <FilterColumn>
              <FilterGroup>
                <FilterGroupTitle>Verification Status</FilterGroupTitle>
                <CheckboxGroup>
                  {REGISTRATION_STATUSES.map((status) => (
                    <CheckboxItem key={status}>
                      <Checkbox
                        checked={registrationStatuses.includes(status)}
                        onChange={() => handleStatusChange(status)}
                      />
                      {STATUS_LABELS[status]}
                    </CheckboxItem>
                  ))}
                </CheckboxGroup>
              </FilterGroup>
            </FilterColumn>

            <FilterColumn>
              <FilterGroup>
                <FilterGroupTitle>Challenge Status</FilterGroupTitle>
                <CheckboxGroup>
                  {CHALLENGE_STATUSES.map((challenge) => (
                    <CheckboxItem key={challenge.value}>
                      <Checkbox
                        checked={disputedValues.includes(challenge.value)}
                        onChange={() => handleDisputedChange(challenge.value)}
                      />
                      {challenge.label}
                    </CheckboxItem>
                  ))}
                </CheckboxGroup>
              </FilterGroup>
            </FilterColumn>
          </SectionGrid>
        </FilterSection>

        <FilterSection>
          <SectionTitle>Networks</SectionTitle>
          <NetworkGrid>
            {availableChains.map((chain) => (
              <NetworkItem key={chain.id}>
                <Checkbox
                  checked={chainFilters.includes(chain.id)}
                  onChange={() => handleNetworkChange(chain.id)}
                />
                {chain.name}
              </NetworkItem>
            ))}
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
          <SectionTitle>Sort by</SectionTitle>
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
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={onClose}>Apply</Button>
        </FooterButtons>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default FilterModal;