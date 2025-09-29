import React, { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from 'styles/landscapeStyle';
import { useExportItems, ExportFilters } from "hooks/queries/useExportItems";
import { json2csv } from "json-2-csv";
import { revRegistryMap } from "utils/fetchItems";
import { chains } from "utils/chains";
import ExportIcon from "svgs/icons/export.svg";

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

  ${landscapeStyle(
    () => css`
      width: 60%;
      max-width: 700px;
    `
  )}
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

const ModalSubtitle = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  margin-top: 4px;
  line-height: 1.4;
`;

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
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

const FilterGroup = styled.div`
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

const NetworkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 8px;
  margin-top: 8px;
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


const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 16px;
  height: 16px;
  accent-color: ${({ theme }) => theme.accent};
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

const DateInput = styled.input`
  background: rgba(26, 11, 46, 0.3);
  border: 1px solid rgba(126, 87, 194, 0.3);
  border-radius: 8px;
  color: ${({ theme }) => theme.secondaryText};
  padding: 12px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: rgba(113, 134, 255, 0.6);
    color: ${({ theme }) => theme.primaryText};
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
  }
`;

const FooterButtons = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid rgba(113, 134, 255, 0.3);
`;

const CancelButton = styled.button`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
  background: transparent;
  color: ${({ theme }) => theme.accent};
  border-color: ${({ theme }) => theme.accent};

  &:hover {
    background: ${({ theme }) => theme.lightGrey};
    color: ${({ theme }) => theme.primaryText};
  }
`;

const ExportButton = styled.button<{ disabled: boolean }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #7186FF 0%, #9B59B6 100%);
  color: white;
  border: none;
  box-shadow: 0 4px 16px rgba(113, 134, 255, 0.3);
  opacity: ${({ disabled }) => disabled ? 0.7 : 1};
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};

  &:hover {
    box-shadow: ${({ disabled }) => disabled ? '0 4px 16px rgba(113, 134, 255, 0.3)' : '0 6px 20px rgba(113, 134, 255, 0.4)'};
    filter: ${({ disabled }) => disabled ? 'none' : 'brightness(1.05)'};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`;



const STATUS_OPTIONS = [
  { value: 'Registered', label: 'Registered' },
  { value: 'RegistrationRequested', label: 'Registration Requested' },
  { value: 'ClearingRequested', label: 'Removal Requested' },
  { value: 'Absent', label: 'Removed' }
];

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

const NETWORK_OPTIONS = chains
  .filter((chain) => !chain.deprecated)
  .map((chain) => ({ value: chain.id, label: chain.name }));

interface ExportModalProps {
  registryAddress: string;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ registryAddress, onClose }) => {
  const [hasClickedExport, setHasClickedExport] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const ref = useRef<HTMLAnchorElement>(null);

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>(['Registered']);
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([]);
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const exportFilters: ExportFilters = {
    registryId: registryAddress,
    status: selectedStatuses,
    network: selectedNetworks.length > 0 ? selectedNetworks : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  };

  const { data: items, refetch, isRefetching } = useExportItems(exportFilters);

  const handleStatusChange = (status: string, checked: boolean) => {
    if (checked) {
      setSelectedStatuses(prev => [...prev, status]);
    } else {
      setSelectedStatuses(prev => prev.filter(s => s !== status));
    }
  };

  const handleNetworkChange = (network: string, checked: boolean) => {
    if (checked) {
      setSelectedNetworks(prev => [...prev, network]);
    } else {
      setSelectedNetworks(prev => prev.filter(n => n !== network));
    }
  };

  const handleNetworkOnly = (selectedNetwork: string) => {
    setSelectedNetworks([selectedNetwork]);
  };

  const handleNetworkAll = () => {
    setSelectedNetworks([]);
  };

  const handleStatusOnly = (selectedStatus: string) => {
    setSelectedStatuses([selectedStatus]);
  };

  const handleStatusAll = () => {
    setSelectedStatuses(['Registered', 'RegistrationRequested', 'ClearingRequested', 'Absent']);
  };

  const handleExport = () => {
    setIsButtonLoading(true);
    setHasClickedExport(true);
    refetch();
  };

  useEffect(() => {
    if (!items || !ref.current || !hasClickedExport) return;

    try {
      const flattenedItems = items.map((item) => {
        const row: any = {
          id: item.id,
          status: item.status,
          disputed: item.disputed,
          submissionTime: new Date(parseInt(item.latestRequestSubmissionTime) * 1000).toISOString(),
          registryAddress: item.registryAddress,
          itemID: item.itemID,
        };

        if (item.metadata?.props) {
          item.metadata.props.forEach((prop) => {
            row[`${prop.label} (${prop.description})`] = prop.value;
          });
        }

        if (item.metadata) {
          row.key0 = item.metadata.key0;
          row.key1 = item.metadata.key1;
          row.key2 = item.metadata.key2;
          row.key3 = item.metadata.key3;
          row.key4 = item.metadata.key4;
        }

        return row;
      });

      const csvData = json2csv(flattenedItems);
      const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
      const link = ref.current;

      if (link) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        const registryName = revRegistryMap[registryAddress] || 'Items';
        const dateRange = fromDate || toDate ? `_${fromDate || 'start'}-${toDate || 'end'}` : '';
        const statusSuffix = selectedStatuses.length === 1 ? `_${selectedStatuses[0]}` : '';
        link.setAttribute("download", `Kleros-Curate-${registryName}${statusSuffix}${dateRange}.csv`);
        link.click();
        URL.revokeObjectURL(url);

        // Close modal after successful export
        setHasClickedExport(false); // Reset for next time
        onClose();
      }
    } catch (error) {
      console.error('Error preparing CSV:', error);
    } finally {
      setIsButtonLoading(false);
    }
  }, [items, registryAddress, selectedStatuses, fromDate, toDate, onClose, hasClickedExport]);

  const canExport = selectedStatuses.length > 0;

  return (
    <ModalOverlay onClick={onClose}>
      <ModalWrapper>
        <ModalContainer onClick={(e) => e.stopPropagation()}>
          <ModalHeader>
            <HeaderContent>
              <ModalTitle>Export Registry Data</ModalTitle>
              <ModalSubtitle>
                Export filtered items as CSV with custom options.
              </ModalSubtitle>
            </HeaderContent>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>

          <FilterSection>
            <FilterGroup>
              <GroupHeader>
                <FilterGroupTitle>Status (select at least one)</FilterGroupTitle>
                <ActionButton onClick={handleStatusAll}>
                  All
                </ActionButton>
              </GroupHeader>
              <CheckboxGroup>
                {STATUS_OPTIONS.map((option) => (
                  <CheckboxItem key={option.value}>
                    <CheckboxLabel>
                      <Checkbox
                        checked={selectedStatuses.includes(option.value)}
                        onChange={(e) => handleStatusChange(option.value, e.target.checked)}
                      />
                      {option.label}
                    </CheckboxLabel>
                    <OnlyButton
                      className="only-button"
                      onClick={() => handleStatusOnly(option.value)}
                      type="button"
                    >
                      Only
                    </OnlyButton>
                  </CheckboxItem>
                ))}
              </CheckboxGroup>
            </FilterGroup>
          </FilterSection>

          <FilterSection>
            <GroupHeader>
              <FilterGroupTitle>Networks (leave empty for all)</FilterGroupTitle>
              <ActionButton onClick={handleNetworkAll}>
                All
              </ActionButton>
            </GroupHeader>
            <NetworkGrid>
              {NETWORK_OPTIONS.map((option) => {
                const ChainIcon = getChainIcon(option.value);
                return (
                  <NetworkItem key={option.value}>
                    <NetworkLabel>
                      <Checkbox
                        checked={selectedNetworks.includes(option.value)}
                        onChange={(e) => handleNetworkChange(option.value, e.target.checked)}
                      />
                      {ChainIcon && <ChainIcon />}
                      {option.label}
                    </NetworkLabel>
                    <OnlyButton
                      className="only-button"
                      onClick={() => handleNetworkOnly(option.value)}
                      type="button"
                    >
                      Only
                    </OnlyButton>
                  </NetworkItem>
                );
              })}
            </NetworkGrid>
          </FilterSection>

          <FilterSection>
            <FilterGroup>
              <GroupHeader>
                <FilterGroupTitle>From Date (leave empty for all history)</FilterGroupTitle>
              </GroupHeader>
              <DateInput
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </FilterGroup>
          </FilterSection>

          <FilterSection>
            <FilterGroup>
              <GroupHeader>
                <FilterGroupTitle>To Date (leave empty for current date)</FilterGroupTitle>
              </GroupHeader>
              <DateInput
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </FilterGroup>
          </FilterSection>

          <FooterButtons>
            <CancelButton onClick={onClose}>Cancel</CancelButton>
            <ExportButton
              disabled={!canExport || isButtonLoading}
              onClick={handleExport}
            >
              {isButtonLoading ? (
                isRefetching ? "Fetching data..." : "Preparing CSV..."
              ) : (
                <>
                  Export CSV <ExportIcon />
                </>
              )}
            </ExportButton>
          </FooterButtons>
          <a ref={ref} href="#" download style={{ display: 'none' }} aria-hidden="true">Download</a>
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  );
};

export default ExportModal;