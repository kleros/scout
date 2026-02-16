import React, { useCallback, useEffect, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useExportItems, ExportFilters } from 'hooks/queries/useExportItems'
import { json2csv } from 'json-2-csv'
import { revRegistryMap } from 'utils/items'
import { chains } from 'utils/chains'
import { ModalButton } from 'components/ModalButtons'
import Checkbox from 'components/Checkbox'
import DateRangeCalendar from 'components/DateRangeCalendar'
import ExportIcon from 'svgs/icons/export.svg'
import FiltersIcon from 'svgs/icons/filters.svg'
import CalendarIcon from 'svgs/icons/calendar.svg'
import { getChainIcon } from 'utils/chainIcons'
import { DateRangeOption, DATE_RANGE_PRESETS, getPresetDates } from 'context/FilterContext'
import {
  ModalOverlay,
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

const StatusAndDateRow = styled.div`
  display: flex;
  gap: 32px;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
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
  const [dateRange, setDateRange] = useState<DateRangeOption>('all')
  const [fromDate, setFromDate] = useState<string | null>(null)
  const [toDate, setToDate] = useState<string | null>(null)

  const handlePresetChange = useCallback((preset: DateRangeOption) => {
    setDateRange(preset)
    if (preset !== 'custom') {
      const { from, to } = getPresetDates(preset)
      setFromDate(from)
      setToDate(to)
    }
  }, [])

  const handleCustomDateChange = useCallback((from: string | null, to: string | null) => {
    setFromDate(from)
    setToDate(to)
  }, [])

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

  /**
   * Parse a CAIP-10 address (e.g., "eip155:1:0x1234...") into chain and address parts.
   */
  const parseCAIP10Address = (caip10: string): { chain: string; address: string } => {
    if (!caip10) return { chain: '', address: '' }

    const parts = caip10.split(':')
    if (parts.length >= 3) {
      // Format: namespace:chainId:address (e.g., "eip155:1:0x1234...")
      const namespace = parts[0]
      const chainId = parts[1]
      const address = parts.slice(2).join(':') // In case address contains colons

      // Find the chain name from chains config
      const chainInfo = chains.find(c =>
        `${c.namespace}:${c.id}` === `${namespace}:${chainId}` ||
        c.id === chainId
      )
      const chainName = chainInfo?.name || `${namespace}:${chainId}`

      return { chain: chainName, address }
    } else if (parts.length === 2) {
      // Format: namespace:address (e.g., "solana:0x1234...")
      const chainInfo = chains.find(c => c.namespace === parts[0])
      return { chain: chainInfo?.name || parts[0], address: parts[1] }
    }

    return { chain: '', address: caip10 }
  }

  useEffect(() => {
    if (!items || !ref.current || !hasClickedExport) return

    try {
      const flattenedItems = items.map((item) => {
        const latestRequest = item.requests?.[0]

        // Determine the appropriate date based on status
        // For Registered: find the successful registration request (may not be requests[0] if a removal was challenged)
        // For Absent: requests[0] is always the clearing request
        // For pending: use submissionTime
        let eventTime = item.latestRequestSubmissionTime
        if (item.status === 'Registered') {
          const registrationRequest = (item.requests || []).find(
            req => req.requestType?.toLowerCase() === 'registrationrequested' && req.resolved && req.resolutionTime
          )
          eventTime = registrationRequest?.resolutionTime || latestRequest?.resolutionTime || item.latestRequestSubmissionTime
        } else if (item.status === 'Absent') {
          eventTime = latestRequest?.resolutionTime || item.latestRequestSubmissionTime
        }

        // Helper to filter out zero addresses
        const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
        const filterZeroAddress = (addr: string | undefined) =>
          addr && addr !== ZERO_ADDRESS ? addr : ''

        // Get submitter address (from original submission - oldest request)
        const originalRequest = item.requests?.[item.requests.length - 1]
        const submitter = filterZeroAddress(originalRequest?.requester)

        // Build row with reorganized columns
        // Order: status, key columns (with Address split into Chain + Address), disputed, registry, submitter, itemID, eventDate
        const row: any = {
          status: item.status,
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
          // Split Address into Chain and Address columns
          propsByLabel.forEach((value, label) => {
            if (label === 'Address') {
              const { chain, address } = parseCAIP10Address(value)
              row['Chain'] = chain
              row['Address'] = address
            } else {
              row[label] = value
            }
          })
        }

        // Add remaining columns at the end
        row['disputed'] = item.disputed
        row['registry'] = revRegistryMap[item.registryAddress] || item.registryAddress
        row['submitter'] = submitter
        // Get challenger if item was disputed
        row['challenger'] = filterZeroAddress(latestRequest?.challenger)
        row['itemID'] = item.itemID
        // Format date, handle edge case of 0 or invalid timestamp
        const timestamp = parseInt(eventTime) * 1000
        row['eventDate'] = timestamp > 0 ? new Date(timestamp).toISOString() : ''

        return row
      })

      const csvData = json2csv(flattenedItems)
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' })
      const link = ref.current

      if (link) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        const registryName = revRegistryMap[registryAddress] || 'Items'
        const dateRangeSuffix =
          fromDate || toDate ? `_${fromDate || 'start'}-${toDate || 'today'}` : ''
        const statusSuffix =
          selectedStatuses.length === 1 ? `_${selectedStatuses[0]}` : ''
        link.setAttribute(
          'download',
          `Kleros-Curate-${registryName}${statusSuffix}${dateRangeSuffix}.csv`,
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
            <StatusAndDateRow>
              <FilterGroup style={{ flex: 1 }}>
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

              <FilterGroup style={{ flex: 1 }}>
                <GroupHeader>
                  <FilterGroupTitle>
                    <CalendarIcon />
                    Date Range
                  </FilterGroupTitle>
                  {dateRange !== 'all' && (
                    <ActionButton onClick={() => handlePresetChange('all')}>
                      Reset
                    </ActionButton>
                  )}
                </GroupHeader>
                <DateRangeOptions>
                  {DATE_RANGE_PRESETS.map((preset) => (
                    <DateRangeChip
                      key={preset.value}
                      $isSelected={dateRange === preset.value}
                      onClick={() => handlePresetChange(preset.value)}
                    >
                      {preset.label}
                    </DateRangeChip>
                  ))}
                </DateRangeOptions>
                {dateRange === 'custom' && (
                  <DateRangeCalendar
                    from={fromDate}
                    to={toDate}
                    onChange={handleCustomDateChange}
                  />
                )}
              </FilterGroup>
            </StatusAndDateRow>
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
