import React, { useState } from 'react'
import styled from 'styled-components'
import ItemDetailsTab from './Tabs/ItemDetailsTab'
import EvidenceTab from './Tabs/EvidenceTab'
import { hoverShortTransitionTiming } from 'styles/commonStyles'

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
  setIsConfirmationOpen: (open: boolean) => void
  setEvidenceConfirmationType: (type: string) => void
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
  setIsConfirmationOpen,
  setEvidenceConfirmationType,
}) => {
  const [currentTab, setCurrentTab] = useState(0)

  const tabs = [
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
            onClick={() => setCurrentTab(i)}
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
              setIsConfirmationOpen={setIsConfirmationOpen}
              setEvidenceConfirmationType={setEvidenceConfirmationType}
            />
          </EvidenceWrapper>
        )}
      </ContentWrapper>
    </>
  )
}

export default ItemDetailsContent
