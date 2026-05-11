import React from 'react'
import styled from 'styled-components'
import { useSearchParams } from 'react-router-dom'
import { Address } from 'viem'
import ItemDetailsTab from './Tabs/ItemDetailsTab'
import EvidenceTab from './Tabs/EvidenceTab'
import { hoverShortTransitionTiming } from 'styles/commonStyles'

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
  deposits: any
  arbitrationCostData: any
  statusCode: number | null
  registryParametersLoading: boolean
  challengePeriodDuration: number | null
  shouldShowCrowdfunding: boolean
  currentRulingRound: any
  appealRemainingTime: any
  formattedLoserTimeLeft: string | null
  formattedWinnerTimeLeft: string | null
  appealCost: any
  appealCostLoading: boolean
  registryParameters: any
  registryAddress: string
  evidences: any[]
  itemID: string
  compositeItemId: string
}

const ItemDetailsContent: React.FC<ItemDetailsContentProps> = ({
  detailsData,
  deposits,
  arbitrationCostData,
  statusCode,
  registryParametersLoading,
  challengePeriodDuration,
  shouldShowCrowdfunding,
  currentRulingRound,
  appealRemainingTime,
  formattedLoserTimeLeft,
  formattedWinnerTimeLeft,
  appealCost,
  appealCostLoading,
  registryParameters,
  registryAddress,
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

  const setTab = (key: TabKey) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        // Omit ?tab= when on the default tab to keep canonical URLs clean.
        if (key === 'details') next.delete('tab')
        else next.set('tab', key)
        return next
      },
      { replace: false },
    )
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'details', label: 'Item Details' },
    { key: 'evidence', label: 'Evidence' },
  ]

  return (
    <>
      <TabsWrapper>
        {tabs.map((tab, i) => (
          <TabButton
            key={tab.key}
            selected={i === currentTab}
            onClick={() => setTab(tab.key)}
          >
            {tab.label}
          </TabButton>
        ))}
      </TabsWrapper>

      <ContentWrapper>
        {currentTab === 0 ? (
          <ItemDetailsTab
            detailsData={detailsData}
            statusCode={statusCode}
            registryParametersLoading={registryParametersLoading}
            challengePeriodDuration={challengePeriodDuration}
            shouldShowCrowdfunding={shouldShowCrowdfunding}
            currentRulingRound={currentRulingRound}
            appealRemainingTime={appealRemainingTime}
            formattedLoserTimeLeft={formattedLoserTimeLeft}
            formattedWinnerTimeLeft={formattedWinnerTimeLeft}
            appealCost={appealCost}
            appealCostLoading={appealCostLoading}
            registryParameters={registryParameters}
            registryAddress={registryAddress}
          />
        ) : (
          <EvidenceWrapper>
            <EvidenceTab
              evidences={evidences}
              registryAddress={registryAddress as Address}
              itemID={itemID}
              compositeItemId={compositeItemId}
            />
          </EvidenceWrapper>
        )}
      </ContentWrapper>
    </>
  )
}

export default ItemDetailsContent
