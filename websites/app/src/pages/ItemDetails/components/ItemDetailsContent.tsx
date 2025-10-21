import React, { useState } from 'react'
import styled from 'styled-components'
import ItemDetailsTab from './Tabs/ItemDetailsTab'
import EvidenceTab from './Tabs/EvidenceTab'

const TabsWrapper = styled.div`
  display: flex;
  gap: 40px;
  border-bottom: 1px solid ${({ theme }) => theme.lightGrey};
  margin-bottom: 24px;
`

const TabButton = styled.button<{ selected: boolean }>`
  background: none;
  border: none;
  padding: 0 0 12px;
  font-size: 18px;
  font-weight: 600;
  color: ${({ theme, selected }) =>
    selected ? theme.primaryText : theme.secondaryText};
  border-bottom: 3px solid
    ${({ theme, selected }) => (selected ? theme.primaryText : 'transparent')};
  cursor: pointer;
  &:hover {
    color: ${({ theme }) => theme.primaryText};
  }
`

const ContentWrapper = styled.div`
  display: flex;
  flex-direction: column;
  background: transparent;
  border: 1px solid ${({ theme }) => theme.lightGrey};
  border-radius: 12px;
  padding: 16px;

  @media (min-width: 768px) {
    padding: 24px;
  }
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
  registryParsedFromItemId: string
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
  registryParsedFromItemId,
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
            registryParsedFromItemId={registryParsedFromItemId}
          />
        ) : (
          <EvidenceTab
            evidences={evidences}
            setIsConfirmationOpen={setIsConfirmationOpen}
            setEvidenceConfirmationType={setEvidenceConfirmationType}
          />
        )}
      </ContentWrapper>
    </>
  )
}

export default ItemDetailsContent
