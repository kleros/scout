import React, { useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useExportItems, ExportFilters } from 'hooks/queries/useExportItems'
import { json2csv } from 'json-2-csv'
import { revRegistryMap } from 'utils/items'
import { chains } from 'utils/chains'
import { ModalButton } from 'components/ModalButtons'
import Checkbox from 'components/Checkbox'
import ExportIcon from 'svgs/icons/export.svg'
import FiltersIcon from 'svgs/icons/filters.svg'
import CalendarIcon from 'svgs/icons/calendar.svg'
import { getChainIcon } from 'utils/chainIcons'
import {
  ModalOverlay,
  ModalContainer,
  ModalHeader,
  ModalTitle,
  CloseButton,
  FilterSection,
  GroupHeader,
  FilterGroupTitle,
  ActionButton,
  CheckboxGroup,
  CheckboxItem,
  CheckboxLabel,
  OnlyButton,
  NetworkItem,
  NetworkLabel,
  FooterButtons,
} from 'components/ModalComponents'

const ModalWrapper = styled.div`
  position: relative;
  width: 90vw;
  max-width: 900px;
  max-height: 90vh;
  border-radius: 20px;

  ${landscapeStyle(
    () => css`
      width: 70%;
    `,
  )}
`

const ModalSubtitle = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.secondaryText};
  margin-top: 4px;
  line-height: 1.4;
`

const HeaderContent = styled.div`
  flex: 1;
  min-width: 0;
`

const StatusAndDatesRow = styled.div`
  display: flex;
  gap: 32px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`

const DateFiltersColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
`

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
`

const NetworkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0;
  margin-top: -8px;
`

const DateInput = styled.input`
  background: ${({ theme }) => theme.modalInputBackground};
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 8px;
  color: ${({ theme }) => theme.secondaryText};
  padding: 12px;
  font-family: "Open Sans", sans-serif;
  font-size: 14px;
  transition: all 0.2s ease;
  cursor: text;

  &:hover {
    background: ${({ theme }) => theme.backgroundFour};
  }

  &:focus {
    outline: none;
    background: ${({ theme }) => theme.backgroundFour};
    color: ${({ theme }) => theme.primaryText};
  }

  &::placeholder {
    color: ${({ theme }) => theme.tertiaryText};
    opacity: 0.6;
  }

  &::-webkit-datetime-edit-text,
  &::-webkit-datetime-edit-month-field,
  &::-webkit-datetime-edit-day-field,
  &::-webkit-datetime-edit-year-field {
    color: ${({ theme }) => theme.secondaryText};
  }

  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    cursor: pointer;
    opacity: 0.7;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 1;
    }
  }

  /* Show placeholder-like text when empty */
  &:invalid {
    color: ${({ theme }) => theme.tertiaryText};
  }
`

const ExportButton = styled(ModalButton)<{ disabled: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: ${({ disabled }) => (disabled ? 0.7 : 1)};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};

  &:hover {
    background: ${({ disabled, theme }) =>
      disabled ? theme.buttonWhite : theme.buttonWhiteHover};
  }

  &:active {
    background: ${({ disabled, theme }) =>
      disabled ? theme.buttonWhite : theme.buttonWhiteActive};
  }

  svg {
    width: 16px;
    height: 16px;
    fill: ${({ theme }) => theme.black};
  }
`

const STATUS_OPTIONS = [
  { value: 'Registered', label: 'Registered' },
  { value: 'RegistrationRequested', label: 'Registration Requested' },
  { value: 'ClearingRequested', label: 'Removal Requested' },
  { value: 'Absent', label: 'Removed' },
]

const NETWORK_OPTIONS = chains
  .filter((chain) => !chain.deprecated)
  .map((chain) => ({ value: chain.id, label: chain.name }))

interface ExportModalProps {
  registryAddress: string
  onClose: () => void
}

const ExportModal: React.FC<ExportModalProps> = ({
  registryAddress,
  onClose,
}) => {
  const [hasClickedExport, setHasClickedExport] = useState(false)
  const [isButtonLoading, setIsButtonLoading] = useState(false)
  const ref = useRef<HTMLAnchorElement>(null)

  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    'Registered',
  ])
  const [selectedNetworks, setSelectedNetworks] = useState<string[]>([])
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const exportFilters: ExportFilters = {
    registryId: registryAddress,
    status: selectedStatuses,
    network: selectedNetworks.length > 0 ? selectedNetworks : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  }

  const { data: items, refetch, isRefetching } = useExportItems(exportFilters)

  const handleStatusChange = (status: string, checked: boolean) => {
    if (checked) {
      setSelectedStatuses((prev) => [...prev, status])
    } else {
      setSelectedStatuses((prev) => prev.filter((s) => s !== status))
    }
  }

  const handleNetworkChange = (network: string, checked: boolean) => {
    if (checked) {
      setSelectedNetworks((prev) => [...prev, network])
    } else {
      setSelectedNetworks((prev) => prev.filter((n) => n !== network))
    }
  }

  const handleNetworkOnly = (selectedNetwork: string) => {
    setSelectedNetworks([selectedNetwork])
  }

  const handleNetworkAll = () => {
    setSelectedNetworks([])
  }

  const handleStatusOnly = (selectedStatus: string) => {
    setSelectedStatuses([selectedStatus])
  }

  const handleStatusAll = () => {
    setSelectedStatuses([
      'Registered',
      'RegistrationRequested',
      'ClearingRequested',
      'Absent',
    ])
  }

  const handleExport = () => {
    setIsButtonLoading(true)
    setHasClickedExport(true)
    refetch()
  }

  /**
   * Normalize field labels to handle historical variations and inconsistencies.
   *
   * Problem: Items submitted at different times may have the same field with different
   * descriptions (e.g., from old Curate v1 vs new Scout interface). When exported,
   * this creates multiple columns with the same data but different headers:
   * - "Address (The smart contract address of the token)" vs
   *   "Address (The address of the smart contract being tagged...)"
   *
   * Solution: Normalize by label only, ignoring description variations.
   * This unifies all variations of the same field into a single column.
   */
  const normalizeFieldLabel = (label: string): string => {
    const normalized = label.trim()

    // Normalize address field variations across registries
    if (normalized === 'Address' || normalized === 'Contract Address' || normalized === 'Contract address') {
      return 'Address'
    }

    return normalized
  }

  useEffect(() => {
    if (!items || !ref.current || !hasClickedExport) return

    try {
      const flattenedItems = items.map((item) => {
        const row: any = {
          id: item.id,
          status: item.status,
          disputed: item.disputed,
          submissionTime: new Date(
            parseInt(item.latestRequestSubmissionTime) * 1000,
          ).toISOString(),
          registryAddress: item.registryAddress,
          itemID: item.itemID,
        }

        if (item?.props) {
          // Group props by normalized label to handle description variations
          // This ensures items with same field label but different descriptions
          // get merged into a single CSV column
          const propsByLabel = new Map<string, string>()

          item.props.forEach((prop) => {
            const normalizedLabel = normalizeFieldLabel(prop.label)
            // Use the first non-empty value for each normalized label
            // This handles cases where old items might have empty values
            if (!propsByLabel.has(normalizedLabel) || !propsByLabel.get(normalizedLabel)) {
              propsByLabel.set(normalizedLabel, prop.value || '')
            }
          })

          // Add normalized fields to the row using clean labels (no descriptions)
          propsByLabel.forEach((value, label) => {
            row[label] = value
          })
        }

        return row
      })

      const csvData = json2csv(flattenedItems)
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      const link = ref.current

      if (link) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        const registryName = revRegistryMap[registryAddress] || 'Items'
        const dateRange =
          fromDate || toDate ? `_${fromDate || 'start'}-${toDate || 'end'}` : ''
        const statusSuffix =
          selectedStatuses.length === 1 ? `_${selectedStatuses[0]}` : ''
        link.setAttribute(
          'download',
          `Kleros-Curate-${registryName}${statusSuffix}${dateRange}.csv`,
        )
        link.click()
        URL.revokeObjectURL(url)

        // Close modal after successful export
        setHasClickedExport(false) // Reset for next time
        onClose()
      }
    } catch (error) {
      console.error('Error preparing CSV:', error)
    } finally {
      setIsButtonLoading(false)
    }
  }, [
    items,
    registryAddress,
    selectedStatuses,
    fromDate,
    toDate,
    onClose,
    hasClickedExport,
  ])

  const canExport = selectedStatuses.length > 0

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
            <StatusAndDatesRow>
              <FilterGroup>
                <GroupHeader>
                  <FilterGroupTitle>
                    <FiltersIcon />
                    Status (select at least one)
                  </FilterGroupTitle>
                  <ActionButton onClick={handleStatusAll}>All</ActionButton>
                </GroupHeader>
                <CheckboxGroup>
                  {STATUS_OPTIONS.map((option) => (
                    <CheckboxItem key={option.value}>
                      <CheckboxLabel>
                        <Checkbox
                          checked={selectedStatuses.includes(option.value)}
                          onChange={(e) =>
                            handleStatusChange(option.value, e.target.checked)
                          }
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

              <DateFiltersColumn>
                <FilterGroup>
                  <GroupHeader>
                    <FilterGroupTitle>
                      <CalendarIcon />
                      From Date (leave empty for all history)
                    </FilterGroupTitle>
                  </GroupHeader>
                  <DateInput
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    placeholder="mm/dd/yyyy"
                    aria-label="From date (mm/dd/yyyy)"
                  />
                </FilterGroup>

                <FilterGroup>
                  <GroupHeader>
                    <FilterGroupTitle>
                      <CalendarIcon />
                      To Date (leave empty for current date)
                    </FilterGroupTitle>
                  </GroupHeader>
                  <DateInput
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    placeholder="mm/dd/yyyy"
                    aria-label="To date (mm/dd/yyyy)"
                  />
                </FilterGroup>
              </DateFiltersColumn>
            </StatusAndDatesRow>
          </FilterSection>

          <FilterSection>
            <GroupHeader>
              <FilterGroupTitle>
                <FiltersIcon />
                Networks (leave empty for all)
              </FilterGroupTitle>
              <ActionButton onClick={handleNetworkAll}>All</ActionButton>
            </GroupHeader>
            <NetworkGrid>
              {NETWORK_OPTIONS.map((option) => {
                const ChainIcon = getChainIcon(option.value)
                return (
                  <NetworkItem key={option.value}>
                    <NetworkLabel>
                      <Checkbox
                        checked={selectedNetworks.includes(option.value)}
                        onChange={(e) =>
                          handleNetworkChange(option.value, e.target.checked)
                        }
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
                )
              })}
            </NetworkGrid>
          </FilterSection>

          <FooterButtons>
            <ModalButton variant="secondary" onClick={onClose}>Cancel</ModalButton>
            <ExportButton
              variant="primary"
              disabled={!canExport || isButtonLoading}
              onClick={handleExport}
            >
              {isButtonLoading ? (
                isRefetching ? (
                  'Fetching data...'
                ) : (
                  'Preparing CSV...'
                )
              ) : (
                <>
                  Export CSV <ExportIcon />
                </>
              )}
            </ExportButton>
          </FooterButtons>
          <a
            ref={ref}
            href="#"
            download
            style={{ display: 'none' }}
            aria-hidden="true"
          >
            Download
          </a>
        </ModalContainer>
      </ModalWrapper>
    </ModalOverlay>
  )
}

export default ExportModal
