import React, { useId, useRef } from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'
import { Address } from 'viem'
import ItemDetailsTab from './Tabs/ItemDetailsTab'
import EvidenceTab from './Tabs/EvidenceTab'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import { AppealInfo } from 'utils/itemDetails'

const TAB_KEYS = ['details', 'evidence'] as const
type TabKey = (typeof TAB_KEYS)[number]

const TabsWrapper = styled.div`
  display: flex;
  gap: 0;
  border-bottom: 1px solid ${({ theme }) => theme.lightGrey};
  margin-bottom: 12px;
`

const TabButton = styled.button<{ selected: boolean }>`
  background: none;
  border: none;
  padding: 0 0 12px;
  font-size: 16px;
  font-weight: 400;
  color: ${({ theme, selected }) =>
    selected ? theme.secondaryBlue : theme.secondaryText};
  border-bottom: 2px solid
    ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.secondaryText)};
  cursor: pointer;
  flex: 1;
  text-align: center;
  position: relative;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
    border-bottom-color: ${({ theme }) => theme.primaryBlue};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 2px;
    background: ${({ theme, selected }) => (selected ? theme.secondaryBlue : theme.secondaryText)};
    ${hoverShortTransitionTiming}
  }

  &:hover::after {
    background: ${({ theme }) => theme.primaryBlue};
  }
`

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: transparent;
  padding: 0;
`

const EvidenceWrapper = styled.div`
  padding: 8px 0 0 0;
`

interface ItemDetailsContentProps {
  detailsData: any
  statusCode: number | null
  now: number
  challengePeriodDuration: number | null
  shouldShowCrowdfunding: boolean
  appeal: AppealInfo | null
  appealCost: bigint | null | undefined
  registryParameters: any
  registryAddress: string
  appealDataFailed: boolean
  retryingAppealData: boolean
  onRetryAppealData: () => void
  evidences: any[]
  itemID: string
  compositeItemId: string
}

const ItemDetailsContent: React.FC<ItemDetailsContentProps> = ({
  detailsData,
  statusCode,
  now,
  challengePeriodDuration,
  shouldShowCrowdfunding,
  appeal,
  appealCost,
  registryParameters,
  registryAddress,
  appealDataFailed,
  retryingAppealData,
  onRetryAppealData,
  evidences,
  itemID,
  compositeItemId,
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const currentTabKey: TabKey = TAB_KEYS.includes(tabParam as TabKey)
    ? (tabParam as TabKey)
    : 'details'
  const currentTab = TAB_KEYS.indexOf(currentTabKey)
  const idPrefix = useId()
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([])

  const setTab = (key: TabKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        // Omit ?tab= when on the default tab to keep canonical URLs clean.
        if (key === 'details') next.delete('tab')
        else next.set('tab', key)
        return next
      },
      // Switching tabs replaces the history entry, so Back and Return leave the item in one step.
      { replace: true },
    )
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'Item Details' },
    { key: 'evidence', label: `Evidence (${evidences.length})` },
  ]

  // Arrow keys, Home and End move between the tabs (WAI-ARIA tabs pattern, automatic activation).
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = tabs.length - 1
    if (next === null) return
    event.preventDefault()
    setTab(tabs[next].key)
    tabRefs.current[next]?.focus()
  }

  const tabId = (key: TabKey) => `${idPrefix}-tab-${key}`
  const panelId = `${idPrefix}-panel`

  return (
    <>
      <TabsWrapper role="tablist" aria-label="Item sections">
        {tabs.map((tab, i) => (
          <TabButton
            key={tab.key}
            ref={(element) => {
              tabRefs.current[i] = element
            }}
            type="button"
            role="tab"
            id={tabId(tab.key)}
            aria-selected={i === currentTab}
            aria-controls={panelId}
            tabIndex={i === currentTab ? 0 : -1}
            selected={i === currentTab}
            onClick={() => setTab(tab.key)}
            onKeyDown={(event) => handleTabKeyDown(event, i)}
          >
            {tab.label}
          </TabButton>
        ))}
      </TabsWrapper>

      <ContentWrapper role="tabpanel" id={panelId} aria-labelledby={tabId(currentTabKey)}>
        {currentTab === 0 ? (
          <ItemDetailsTab
            detailsData={detailsData}
            statusCode={statusCode}
            now={now}
            challengePeriodDuration={challengePeriodDuration}
            shouldShowCrowdfunding={shouldShowCrowdfunding}
            appeal={appeal}
            appealCost={appealCost}
            registryParameters={registryParameters}
            registryAddress={registryAddress}
            appealDataFailed={appealDataFailed}
            retryingAppealData={retryingAppealData}
            onRetryAppealData={onRetryAppealData}
          />
        ) : (
          <EvidenceWrapper>
            <EvidenceTab
              evidences={evidences}
              registryAddress={registryAddress as Address}
              itemID={itemID}
              compositeItemId={compositeItemId}
              hasOpenRequest={
                detailsData.status === 'RegistrationRequested' || detailsData.status === 'ClearingRequested'
              }
            />
          </EvidenceWrapper>
        )}
      </ContentWrapper>
    </>
  )
}

export default ItemDetailsContent
