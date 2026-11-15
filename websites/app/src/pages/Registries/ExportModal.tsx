import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import styled, { css } from 'styled-components'
import { landscapeStyle } from 'styles/landscapeStyle'
import { useExportItems, ExportFilters } from 'hooks/queries/useExportItems'
import { useLockOverlayScroll } from 'hooks/useLockOverlayScroll'
import { useDialog } from 'hooks/useDialog'
import { json2csv } from 'json-2-csv'
import { GraphItem, revRegistryMap } from 'utils/items'
import { chains } from 'utils/chains'
import { ModalButton } from 'components/ModalButtons'
import Checkbox from 'components/Checkbox'
import DateRangeCalendar from 'components/DateRangeCalendar'
import ErrorState from 'components/ErrorState'
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
  flex-direction: column;
  gap: 32px;

  ${landscapeStyle(
    () => css`
      flex-direction: row;
      flex-wrap: wrap;
    `
  )}
`

// The button keeps its normal look while an export runs (it only ignores clicks), so its progress
// label stays readable; the disabled look is kept for "no status selected".
const ExportButton = styled(ModalButton)<{ $busy: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: ${({ $busy }) => ($busy ? 'progress' : 'pointer')};

  &:disabled {
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
    fill: ${({ theme }) => theme.black};
  }
`

// Groups the filters so they can all be locked while an export runs (a change mid-export would
// otherwise produce a file that does not match what the modal shows).
const FiltersFieldset = styled.fieldset`
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
`

const EmptyResult = styled.p`
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  color: ${({ theme }) => theme.secondaryText};
`

// Same labels as the Filters modal and the list.
const STATUS_OPTIONS = [
  { value: 'Registered', label: 'Included' },
  { value: 'RegistrationRequested', label: 'Registration Requested' },
  { value: 'ClearingRequested', label: 'Removal Requested' },
  { value: 'Absent', label: 'Removed / Rejected' },
]

type ExportPhase = 'idle' | 'fetching' | 'preparing' | 'empty' | 'error'

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
  useLockOverlayScroll(true)
  const { ref: dialogRef, dialogProps } = useDialog<HTMLDivElement>(true, onClose)
  const titleId = useId()
  const subtitleId = useId()
  const [phase, setPhase] = useState<ExportPhase>('idle')
  const isExporting = phase === 'fetching' || phase === 'preparing'
  const ref = useRef<HTMLAnchorElement>(null)
  // The fetch can outlive the modal (Cancel while fetching): never download after it closed.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

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

  const { refetch } = useExportItems(exportFilters)

  // A message about the last attempt ("no items match", "could not fetch") no longer applies once
  // the filters change.
  useEffect(() => {
    setPhase((current) =>
      current === 'empty' || current === 'error' ? 'idle' : current,
    )
  }, [selectedStatuses, selectedNetworks, fromDate, toDate])

  // The message appears above the footer and can push it below the modal's scroll edge: keep the
  // message and the Export button in view.
  useEffect(() => {
    const panel = dialogRef.current
    if (panel && (phase === 'empty' || phase === 'error')) {
      panel.scrollTop = panel.scrollHeight
    }
  }, [phase, dialogRef])

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

  // No network ticked means every network, so this action clears the selection.
  const handleNetworkClear = () => {
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

  const downloadCsv = (items: GraphItem[]) => {
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
    if (!link) throw new Error('Download link is not mounted')

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
  }

  const canExport = selectedStatuses.length > 0

  const exportingRef = useRef(false)
  const handleExport = async () => {
    if (!canExport || exportingRef.current) return
    exportingRef.current = true
    try {
      setPhase('fetching')
      const result = await refetch()
      if (!mountedRef.current) return
      if (result.isError || !result.data) {
        setPhase('error')
        return
      }
      // Nothing to export: say so and keep the selection, instead of saving an empty file.
      if (result.data.length === 0) {
        setPhase('empty')
        return
      }
      setPhase('preparing')
      // Let "Preparing CSV..." paint before the synchronous CSV work.
      await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
      if (!mountedRef.current) return
      downloadCsv(result.data)
      onClose()
    } catch (error) {
      console.error('Error preparing CSV:', error)
      if (mountedRef.current) setPhase('error')
    } finally {
      exportingRef.current = false
    }
  }

  const statusMessage =
    phase === 'fetching'
      ? 'Fetching items...'
      : phase === 'preparing'
        ? 'Preparing CSV...'
        : phase === 'empty'
          ? 'No items match these filters. Change the status, date range or networks and try again.'
          : ''

  return (
    <ModalOverlay onClick={onClose}>
      <ModalWrapper>
        <ModalContainer
          {...dialogProps}
          aria-labelledby={titleId}
          aria-describedby={subtitleId}
          onClick={(e) => e.stopPropagation()}
        >
          <ModalHeader>
            <HeaderContent>
              <ModalTitle id={titleId}>Export Registry Data</ModalTitle>
              <ModalSubtitle id={subtitleId}>
                Export filtered items as CSV with custom options.
              </ModalSubtitle>
            </HeaderContent>
            <CloseButton onClick={onClose}>×</CloseButton>
          </ModalHeader>

          <FiltersFieldset disabled={isExporting}>
            <FilterSection>
              <StatusAndDateRow>
                <FilterGroup style={{ flex: 1 }}>
                  <GroupHeader>
                    <FilterGroupTitle>
                      <FiltersIcon />
                      Status (select at least one)
                    </FilterGroupTitle>
                    <ActionButton onClick={handleStatusAll} aria-label="Select all statuses">
                      All
                    </ActionButton>
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
                          aria-label={`Only ${option.label}`}
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
                      <ActionButton
                        onClick={() => handlePresetChange('all')}
                        aria-label="Reset date range"
                      >
                        Reset
                      </ActionButton>
                    )}
                  </GroupHeader>
                  <DateRangeOptions>
                    {DATE_RANGE_PRESETS.map((preset) => (
                      <DateRangeChip
                        key={preset.value}
                        type="button"
                        $isSelected={dateRange === preset.value}
                        aria-pressed={dateRange === preset.value}
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
                {selectedNetworks.length > 0 && (
                  <ActionButton onClick={handleNetworkClear} aria-label="Clear networks">
                    Clear
                  </ActionButton>
                )}
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
                        aria-label={`Only ${option.label}`}
                      >
                        Only
                      </OnlyButton>
                    </NetworkItem>
                  )
                })}
              </NetworkGrid>
            </FilterSection>
          </FiltersFieldset>

          {/* Read out by the status region below; hidden here so it is not read twice. */}
          {phase === 'empty' && <EmptyResult aria-hidden="true">{statusMessage}</EmptyResult>}
          {phase === 'error' && (
            <ErrorState
              compact
              title="The items could not be fetched."
              message="The data service did not answer. Check your connection, then press Export CSV to try again."
            />
          )}
          {/* Announces progress and an empty result; the error state announces itself. */}
          <span className="visually-hidden" role="status">
            {statusMessage}
          </span>

          <FooterButtons>
            <ModalButton type="button" variant="secondary" onClick={onClose}>
              Cancel
            </ModalButton>
            <ExportButton
              type="button"
              variant="primary"
              disabled={!canExport}
              aria-disabled={isExporting || undefined}
              aria-busy={isExporting || undefined}
              $busy={isExporting}
              onClick={handleExport}
            >
              {phase === 'fetching' ? (
                'Fetching items...'
              ) : phase === 'preparing' ? (
                'Preparing CSV...'
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
