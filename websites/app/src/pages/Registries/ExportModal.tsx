import React, { useEffect, useRef, useState } from "react";
import styled, { css } from "styled-components";
import { landscapeStyle } from 'styles/landscapeStyle';
import { responsiveSize } from 'styles/responsiveSize';
import { useExportItems, ExportFilters } from "hooks/queries/useExportItems";
import { json2csv } from "json-2-csv";
import { revRegistryMap } from "utils/fetchItems";
import { chains } from "utils/chains";
import { StyledCloseButton, ClosedButtonContainer } from './index';
import Button from 'components/Button';
import ExportIcon from "svgs/icons/export.svg";

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

const ModalContainer = styled.div`
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.08) 0%,
    rgba(153, 153, 153, 0.08) 100%
  );
  backdrop-filter: blur(50px);
  border-radius: 20px;
  width: 84vw;
  max-height: 85vh;
  position: relative;
  box-shadow: 0px 8px 32px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;

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
      width: 50%;
      max-width: 600px;
    `
  )}
`;

const ModalContent = styled.div`
  overflow-y: auto;
  padding: ${responsiveSize(16, 32)};
`;

const ExportContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const ExportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
`;

const ExportTitle = styled.div`
  margin: 0 0 4px 0;
  font-size: 24px;
  font-family: 'Inter', sans-serif;
  font-weight: 600;
  line-height: 1.15;
  letter-spacing: 0.5px;
  position: relative;
  z-index: 1;
`;

const ExportSubtitle = styled.div`
  font-size: 14px;
  opacity: 80%;
  line-height: 1.4;
  position: relative;
  z-index: 1;
  max-width: 400px;
`;

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const CloseButtonWrapper = styled.div`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
`;

const Divider = styled.div`
  height: 1px;
  width: 100%;
  background: linear-gradient(90deg, transparent 0%, rgba(113, 134, 255, 0.5) 50%, transparent 100%);
`;

const FilterSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const FilterRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterLabel = styled.label`
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  font-weight: 600;
  color: ${({ theme }) => theme.primaryText};
`;

const MultiSelect = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: rgba(26, 11, 46, 0.3);
  border: 1px solid rgba(126, 87, 194, 0.3);
  border-radius: 8px;
  padding: 12px;
`;

const CheckboxOption = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  cursor: pointer;

  input[type="checkbox"] {
    margin: 0;
    width: 16px;
    height: 16px;
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

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
`;

const CancelButton = styled.button`
  background: transparent;
  border: 1px solid rgba(126, 87, 194, 0.5);
  border-radius: 9999px;
  color: ${({ theme }) => theme.secondaryText};
  padding: 8px 16px;
  font-family: 'Inter', sans-serif;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(126, 87, 194, 0.8);
    color: ${({ theme }) => theme.primaryText};
  }
`;

const ExportButton = styled(Button)<{ disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: ${({ disabled }) => disabled ? 0.7 : 1};
  cursor: ${({ disabled }) => disabled ? 'not-allowed' : 'pointer'};
  font-size: 14px;
  padding: 8px 16px;
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  ${({ disabled }) => disabled && `
    &:hover {
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2) !important;
      transform: none !important;
      filter: none !important;
    }
  `}
`;

const StyledExportIcon = styled(ExportIcon)`
  path {
    stroke: currentColor;
  }
`;

const ExportCloseButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
  return <StyledCloseButton onClick={onClick} />;
};

const STATUS_OPTIONS = [
  { value: 'Registered', label: 'Registered' },
  { value: 'RegistrationRequested', label: 'Registration Requested' },
  { value: 'ClearingRequested', label: 'Removal Requested' },
  { value: 'Absent', label: 'Removed' }
];

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
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        <ModalContent>
          <ExportContainer>
            <ExportHeader>
              <HeaderContent>
                <ExportTitle>Export Registry Data</ExportTitle>
                <ExportSubtitle>
                  Export filtered items as CSV with custom options.
                </ExportSubtitle>
              </HeaderContent>
              <CloseButtonWrapper>
                <ClosedButtonContainer onClick={onClose}>
                  <ExportCloseButton onClick={onClose} />
                </ClosedButtonContainer>
              </CloseButtonWrapper>
            </ExportHeader>

            <Divider />

            <FilterSection>
              <FilterRow>
                <FilterLabel>Status (select at least one)</FilterLabel>
                <MultiSelect>
                  {STATUS_OPTIONS.map((option) => (
                    <CheckboxOption key={option.value}>
                      <input
                        type="checkbox"
                        checked={selectedStatuses.includes(option.value)}
                        onChange={(e) => handleStatusChange(option.value, e.target.checked)}
                      />
                      {option.label}
                    </CheckboxOption>
                  ))}
                </MultiSelect>
              </FilterRow>

              <FilterRow>
                <FilterLabel>Networks (leave empty for all)</FilterLabel>
                <MultiSelect>
                  {NETWORK_OPTIONS.map((option) => (
                    <CheckboxOption key={option.value}>
                      <input
                        type="checkbox"
                        checked={selectedNetworks.includes(option.value)}
                        onChange={(e) => handleNetworkChange(option.value, e.target.checked)}
                      />
                      {option.label}
                    </CheckboxOption>
                  ))}
                </MultiSelect>
              </FilterRow>

              <FilterRow>
                <FilterLabel>From Date (leave empty for all history)</FilterLabel>
                <DateInput
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
              </FilterRow>

              <FilterRow>
                <FilterLabel>To Date (leave empty for current date)</FilterLabel>
                <DateInput
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </FilterRow>
            </FilterSection>

            <ActionButtons>
              <CancelButton onClick={onClose}>Cancel</CancelButton>
              <ExportButton
                disabled={!canExport || isButtonLoading}
                onClick={handleExport}
              >
                {isButtonLoading ? (
                  isRefetching ? "Fetching data..." : "Preparing CSV..."
                ) : (
                  <>
                    Export CSV <StyledExportIcon />
                  </>
                )}
              </ExportButton>
            </ActionButtons>
          </ExportContainer>
        </ModalContent>
        <a ref={ref} href="#" style={{ display: 'none' }} aria-hidden="true">Download</a>
      </ModalContainer>
    </ModalOverlay>
  );
};

export default ExportModal;