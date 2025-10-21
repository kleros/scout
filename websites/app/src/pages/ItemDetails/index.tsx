import React, { useMemo, useState } from 'react'
import styled, { css } from 'styled-components'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { formatEther } from 'ethers'
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useItemDetailsQuery } from 'hooks/queries'
import LoadingItems from '../Registries/LoadingItems'
import ConfirmationBox from 'components/ConfirmationBox'
import useHumanizedCountdown, { useChallengeRemainingTime } from 'hooks/countdown'
import { useScrollTop } from 'hooks/useScrollTop'
import ArrowLeftIcon from 'assets/svgs/icons/arrow-left.svg'
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay'
import useAppealCost from 'hooks/useAppealCost'
import useRegistryParameters from 'hooks/useRegistryParameters'
import { itemToStatusCode, STATUS_CODE, SUBGRAPH_RULING } from 'utils/itemStatus'
import { revRegistryMap } from 'utils/items'
import Entry from '../Registries/EntriesList/Entry'
import Breadcrumb from './components/Breadcrumb'
import SubmitterSection from './components/SubmitterSection'
import ItemDetailsContent from './components/ItemDetailsContent'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.primaryText};
  min-height: 100vh;
  padding: 32px 16px 64px;
  font-family: "Open Sans", sans-serif;
  background: ${({ theme }) => theme.lightBackground};
  width: 100%;
  max-width: ${MAX_WIDTH_LANDSCAPE};
  margin: 0 auto;

  ${landscapeStyle(
    () => css`
      padding: 48px ${responsiveSize(0, 48)} 60px;
    `,
  )}
`

const TopBar = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32px;
  gap: 16px;
  flex-wrap: wrap;
`

const ReturnButton = styled.button`
  background: none;
  border: none;
  color: ${({ theme }) => theme.primaryText};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background-color 0.2s;

  &:hover {
    background-color: rgba(255, 255, 255, 0.1);
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const MainCard = styled.div`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-radius: 12px;
  padding: 32px;
  display: grid;
  grid-template-columns: 1fr;
  gap: 32px;
  width: 100%;

  ${landscapeStyle(
    () => css`
      grid-template-columns: 380px 1fr;
      gap: 40px;
    `,
  )}
`

const LeftSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
`

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`

const EntryCardWrapper = styled.div`
  width: 100%;

  > div {
    margin-bottom: 0;
  }
`

const ItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [evidenceConfirmationType, setEvidenceConfirmationType] = useState('')

  useScrollTop()

  const isAttachmentOpen = useMemo(
    () => !!searchParams.get('attachment'),
    [searchParams],
  )

  const { isLoading: detailsLoading, data: detailsData } = useItemDetailsQuery({
    itemId: itemId || '',
    enabled: !!itemId,
  })

  const registryParsedFromItemId = useMemo(
    () => (itemId ? itemId.split('@')[1] : ''),
    [itemId],
  )

  const registryName = useMemo(() => {
    return registryParsedFromItemId ? revRegistryMap[registryParsedFromItemId] : 'Unknown'
  }, [registryParsedFromItemId])

  const displayName = useMemo(() => {
    if (!detailsData) return ''
    const name = detailsData.props?.find((prop) => prop.label === 'Name')?.value
    const symbol = detailsData.props?.find((prop) => prop.label === 'Symbol')?.value
    const domain = detailsData.props?.find((prop) => prop.label === 'Domain name')?.value
    const tag = detailsData.props?.find((prop) => prop.label === 'Public Name Tag')?.value
    const desc = detailsData.props?.find((prop) => prop.label === 'Description')?.value
    return name || symbol || domain || tag || desc || 'Item'
  }, [detailsData])

  // Fetch registry parameters
  const { data: registryParameters, isLoading: registryParametersLoading } = useRegistryParameters(registryParsedFromItemId)

  const challengePeriodDuration = useMemo(() => {
    return registryParameters ? Number(registryParameters.challengePeriodDuration) : null
  }, [registryParameters])

  const challengeRemainingTime = useChallengeRemainingTime(
    detailsData?.requests[0]?.submissionTime,
    detailsData?.disputed,
    challengePeriodDuration,
  )
  const formattedChallengeRemainingTime = useHumanizedCountdown(challengeRemainingTime, 2)

  const arbitrationCostData = useMemo(() => {
    return registryParameters?.arbitrationCost
  }, [registryParameters])

  const deposits = useMemo(() => {
    if (!registryParameters) return undefined
    return {
      submissionBaseDeposit: registryParameters.submissionBaseDeposit,
      removalBaseDeposit: registryParameters.removalBaseDeposit,
      submissionChallengeBaseDeposit: registryParameters.submissionChallengeBaseDeposit,
      removalChallengeBaseDeposit: registryParameters.removalChallengeBaseDeposit,
    }
  }, [registryParameters])

  const formattedDepositCost = useMemo(() => {
    if (!detailsData || !deposits || arbitrationCostData === undefined)
      return '??? xDAI'
    let sum = 0n
    if (detailsData.status === 'Registered') {
      sum = arbitrationCostData + deposits.removalBaseDeposit
    } else if (detailsData.status === 'RegistrationRequested') {
      sum = arbitrationCostData + deposits.submissionChallengeBaseDeposit
    } else if (detailsData.status === 'ClearingRequested') {
      sum = arbitrationCostData + deposits.removalChallengeBaseDeposit
    }
    return `${Number(formatEther(sum))} xDAI`
  }, [detailsData, deposits, arbitrationCostData])

  // Fetch appeal cost for disputed items
  const { data: appealCost, isLoading: appealCostLoading } = useAppealCost(
    detailsData?.requests?.[0]?.arbitrator,
    detailsData?.requests?.[0]?.disputeID,
    detailsData?.requests?.[0]?.arbitratorExtraData,
    detailsData?.requests?.[0]?.disputed,
    detailsData?.requests?.[0]?.resolved,
    detailsData?.requests?.[0]?.rounds?.length,
  )

  const evidences = useMemo(() => {
    if (!detailsData) return []
    return detailsData.requests
      .map((r) => r.evidenceGroup.evidences)
      .flat(1)
      .sort((a, b) => Number(a.timestamp) - Number(b.timestamp))
  }, [detailsData])

  const statusCode = useMemo(() => {
    if (!detailsData || !challengePeriodDuration) return null
    const timestamp = Math.floor(Date.now() / 1000)
    return itemToStatusCode(detailsData as any, timestamp, challengePeriodDuration)
  }, [detailsData, challengePeriodDuration])

  const shouldShowCrowdfunding = useMemo(() => {
    if (!detailsData?.disputed || detailsData.requests[0].resolved) return false
    if (statusCode !== STATUS_CODE.CROWDFUNDING && statusCode !== STATUS_CODE.CROWDFUNDING_WINNER) return false

    const round = detailsData.requests[0]?.rounds?.[0]
    if (!round) return false

    const { ruling, appealPeriodStart, appealPeriodEnd, hasPaidRequester, hasPaidChallenger } = round
    const timestamp = Math.floor(Date.now() / 1000)

    if (ruling && ruling !== SUBGRAPH_RULING.NONE && appealPeriodStart && appealPeriodEnd) {
      const start = Number(appealPeriodStart)
      const end = Number(appealPeriodEnd)
      const halfwayPoint = start + (end - start) / 2

      if (timestamp > halfwayPoint) {
        const loserIsRequester = ruling === SUBGRAPH_RULING.REJECT || ruling === SUBGRAPH_RULING.REJECT_NUM || ruling === 'Reject'
        const loserHasPaid = loserIsRequester ? hasPaidRequester : hasPaidChallenger

        if (!loserHasPaid) {
          return false
        }
      }
    }

    return true
  }, [detailsData, statusCode])

  const currentRulingRound = useMemo(() => {
    if (!detailsData?.requests[0]?.rounds) return null
    return detailsData.requests[0].rounds.find(round => round.ruling != null) || null
  }, [detailsData])

  const appealRemainingTime = useMemo(() => {
    if (!shouldShowCrowdfunding || !currentRulingRound) return null

    const { appealPeriodStart, appealPeriodEnd, ruling, hasPaidRequester, hasPaidChallenger } = currentRulingRound
    if (!appealPeriodStart || !appealPeriodEnd) return null

    const now = Date.now()
    const start = Number(appealPeriodStart) * 1000
    const end = Number(appealPeriodEnd) * 1000
    const halfwayPoint = start + (end - start) / 2

    const loserIsRequester = ruling === SUBGRAPH_RULING.REJECT || ruling === SUBGRAPH_RULING.REJECT_NUM || ruling === 'Reject'

    if (now < halfwayPoint) {
      return {
        loserTimeLeft: halfwayPoint - now,
        winnerTimeLeft: null,
        isLoserPeriod: true,
        loserIsRequester,
      }
    } else {
      const loserHasPaid = loserIsRequester ? hasPaidRequester : hasPaidChallenger
      if (loserHasPaid) {
        return {
          loserTimeLeft: null,
          winnerTimeLeft: end - now,
          isLoserPeriod: false,
          loserIsRequester,
        }
      }
    }

    return null
  }, [shouldShowCrowdfunding, currentRulingRound])

  const formattedLoserTimeLeft = useHumanizedCountdown(appealRemainingTime?.loserTimeLeft || null, 2)
  const formattedWinnerTimeLeft = useHumanizedCountdown(appealRemainingTime?.winnerTimeLeft || null, 2)

  const handleBackClick = () => {
    navigate(-1)
  }

  if (detailsLoading || !detailsData) {
    return (
      <Container>
        <LoadingItems />
      </Container>
    )
  }

  return (
    <Container>
      {isAttachmentOpen ? (
        <EvidenceAttachmentDisplay />
      ) : (
        <>
          {isConfirmationOpen && (
            <ConfirmationBox
              {...{
                evidenceConfirmationType,
                isConfirmationOpen,
                setIsConfirmationOpen,
                detailsData,
                deposits,
                arbitrationCostData,
              }}
            />
          )}

          <TopBar>
            <Breadcrumb registryName={registryName} itemName={displayName} />
            <ReturnButton onClick={handleBackClick}>
              <ArrowLeftIcon />
              Return
            </ReturnButton>
          </TopBar>

          <MainCard>
            <LeftSection>
              <EntryCardWrapper>
                <Entry
                  item={detailsData}
                  challengePeriodDuration={challengePeriodDuration}
                  showActionButtons={true}
                  onActionButtonClick={(actionType) => {
                    setIsConfirmationOpen(true)
                    setEvidenceConfirmationType(actionType)
                  }}
                  actionButtonCost={formattedDepositCost}
                />
              </EntryCardWrapper>

              <SubmitterSection
                requester={detailsData.requests[0].requester}
                submissionTime={detailsData.requests[0].submissionTime}
                resolutionTime={detailsData.requests[0].resolutionTime}
                status={detailsData.status}
                challengeRemainingTime={formattedChallengeRemainingTime}
              />
            </LeftSection>

            <RightSection>
              <ItemDetailsContent
                detailsData={detailsData}
                deposits={deposits}
                arbitrationCostData={arbitrationCostData}
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
                evidences={evidences}
                setIsConfirmationOpen={setIsConfirmationOpen}
                setEvidenceConfirmationType={setEvidenceConfirmationType}
              />
            </RightSection>
          </MainCard>
        </>
      )}
    </Container>
  )
}

export default ItemDetails
