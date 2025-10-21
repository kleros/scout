import React, { useMemo, useState } from 'react'
import styled, { css } from 'styled-components'
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom'
import { formatEther } from 'ethers'
import { landscapeStyle, MAX_WIDTH_LANDSCAPE } from 'styles/landscapeStyle'
import { responsiveSize } from 'styles/responsiveSize'
import { useItemDetailsQuery } from 'hooks/queries'
import LoadingItems from '../Registries/LoadingItems'
import ConfirmationBox from 'components/ConfirmationBox'
import useHumanizedCountdown, { useChallengeRemainingTime } from 'hooks/countdown'
import ScrollTop from 'components/ScrollTop'
import ArrowLeftIcon from 'assets/svgs/icons/arrow-left.svg'
import EvidenceAttachmentDisplay from 'components/AttachmentDisplay'
import useAppealCost from 'hooks/useAppealCost'
import useRegistryParameters from 'hooks/useRegistryParameters'
import { itemToStatusCode, STATUS_CODE, SUBGRAPH_RULING } from 'utils/itemStatus'
import { revRegistryMap } from 'utils/items'
import Item from '../Registries/ItemsList/Item'
import Breadcrumb from './components/Breadcrumb'
import ItemDetailsContent from './components/ItemDetailsContent'
import { hoverShortTransitionTiming } from 'styles/commonStyles'
import { IdenticonOrAvatar, AddressOrName } from 'components/ConnectWallet/AccountDisplay'
import { formatTimestamp } from 'utils/formatTimestamp'
import ArrowIcon from 'assets/svgs/icons/arrow.svg'

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

const ReturnButton = styled(Link)`
  background: none;
  border: none;
  color: ${({ theme }) => theme.secondaryBlue};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  ${hoverShortTransitionTiming}

  &:hover {
    color: ${({ theme }) => theme.primaryBlue};
  }

  svg {
    width: 16px;
    height: 16px;

    path {
      fill: ${({ theme }) => theme.secondaryBlue};
      ${hoverShortTransitionTiming}
    }
  }

  &:hover svg path {
    fill: ${({ theme }) => theme.primaryBlue};
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

const ItemCardWrapper = styled.div`
  width: 100%;
  display: flex;
  flex-direction: column;

  > div {
    margin-bottom: 0;
  }
`

const SubmissionDetailsSection = styled.div`
  background: transparent;
  border: 1px solid ${({ theme }) => theme.stroke};
  border-top: none;
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-top: -12px;
`

const DetailRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 4px;
  row-gap: 4px;
  font-size: 12px;
  color: ${({ theme }) => theme.secondaryText};
  line-height: 1.5;
`

const SubmitterLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  cursor: pointer !important;

  label {
    color: ${({ theme }) => theme.secondaryText};
    cursor: pointer;
  }

  svg {
    width: 12px;
    height: 12px;
    path {
      fill: ${({ theme }) => theme.secondaryText};
    }
  }

  &:hover {
    cursor: pointer !important;
    label {
      color: ${({ theme }) => theme.primaryText};
    }

    svg {
      path {
        fill: ${({ theme }) => theme.primaryText};
      }
    }
  }
`

const SubmissionDate = styled.a`
  color: ${({ theme }) => theme.secondaryText};
  font-size: 12px;
  font-style: italic;
  text-decoration: none;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.primaryText};
    text-decoration: underline;
  }
`

const ItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false)
  const [evidenceConfirmationType, setEvidenceConfirmationType] = useState('')

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

  const handleBackClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Check if user is trying to open in new tab (Ctrl+Click, Cmd+Click, or middle click)
    if (e.ctrlKey || e.metaKey || e.button === 1) {
      // Let the default Link behavior handle it (opens in new tab)
      return
    }

    // For normal clicks, use smart navigation
    e.preventDefault()

    // Check if there's a previous page in history by checking location.key
    // If location.key is 'default', it means this is the first page loaded
    const hasHistory = location.key !== 'default'

    if (hasHistory) {
      // Navigate back to previous page if there's history
      navigate(-1)
    } else {
      // Navigate to the registry page if there's no history
      navigate(`/registry/${registryName}`)
    }
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
      <ScrollTop />
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
            <ReturnButton to={`/registry/${registryName}`} onClick={handleBackClick}>
              <ArrowLeftIcon />
              Return
            </ReturnButton>
          </TopBar>

          <MainCard>
            <LeftSection>
              <ItemCardWrapper>
                <Item
                  item={detailsData}
                  challengePeriodDuration={challengePeriodDuration}
                  showActionButtons={true}
                  onActionButtonClick={(actionType) => {
                    setIsConfirmationOpen(true)
                    setEvidenceConfirmationType(actionType)
                  }}
                  actionButtonCost={formattedDepositCost}
                  hideBottomTimers={true}
                  seamlessBottom={true}
                />
              </ItemCardWrapper>

              <SubmissionDetailsSection>
                <DetailRow>
                  Submitted on:
                  <SubmissionDate
                    href={`https://gnosisscan.io/tx/${detailsData.requests[0].creationTx}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {formatTimestamp(Number(detailsData.requests[0].submissionTime), true)}
                  </SubmissionDate>
                  by
                  <SubmitterLink
                    to={`/activity/ongoing?userAddress=${detailsData.requests[0].requester}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IdenticonOrAvatar size="20" address={detailsData.requests[0].requester as `0x${string}`} />
                    <AddressOrName address={detailsData.requests[0].requester as `0x${string}`} smallDisplay />
                    <ArrowIcon />
                  </SubmitterLink>
                </DetailRow>
                {formattedChallengeRemainingTime && detailsData.status !== 'Registered' && (
                  <DetailRow>
                    Challenge period ends in: {formattedChallengeRemainingTime}
                  </DetailRow>
                )}
                {detailsData.status === 'Registered' && detailsData.requests[0].resolutionTime && (
                  <DetailRow>
                    Included on: {formatTimestamp(Number(detailsData.requests[0].resolutionTime), true)}
                  </DetailRow>
                )}
              </SubmissionDetailsSection>
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
